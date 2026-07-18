import { readArchitectureDoc } from "@/lib/panel/architectureDocs";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";

// Sirve un documento del archivo de arquitectura AUTENTICADO. No van en public/
// a propósito: los snapshots describen el modelo de permisos completo, el esquema
// y los flujos internos — no es material público.
//
// requireConsoleAccess("ecp") redirige (no lanza) si la sesión no vale, así que
// el handler nunca devuelve el archivo sin identidad válida.
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  await requireConsoleAccess("ecp");

  const { file } = await ctx.params;
  // El nombre llega URL-encoded (los snapshots tienen paréntesis en el nombre).
  const doc = await readArchitectureDoc(decodeURIComponent(file));
  if (!doc) return new Response("Documento no encontrado en el archivo.", { status: 404 });

  return new Response(new Uint8Array(doc.body), {
    headers: {
      "content-type": doc.contentType,
      // Se abre en pestaña; el navegador igual permite "Guardar como".
      "content-disposition": "inline",
      // Nunca en cachés compartidas: el contenido es interno.
      "cache-control": "private, no-store",
      // El snapshot es HTML propio y autocontenido, pero se sirve desde nuestro
      // origen: se le prohíbe explícitamente cargar nada externo o ser enmarcado.
      "content-security-policy": "default-src 'self' 'unsafe-inline' data:; frame-ancestors 'self'",
      "x-content-type-options": "nosniff",
    },
  });
}
