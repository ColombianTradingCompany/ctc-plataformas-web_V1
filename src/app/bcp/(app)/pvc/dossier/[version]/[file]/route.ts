import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { leerDossier } from "@/lib/pvc/dossier";

// Sirve un documento del dossier PVC AUTENTICADO (mismo patrón que
// /bcp/documentacion/[file]). Lo que no está en el listado real, no se sirve.
export async function GET(_req: Request, ctx: { params: Promise<{ version: string; file: string }> }) {
  await requireConsoleAccess("bcp");
  const { version, file } = await ctx.params;
  const doc = await leerDossier(decodeURIComponent(version), decodeURIComponent(file));
  if (!doc) return new Response("Documento no encontrado en el dossier.", { status: 404 });
  return new Response(new Uint8Array(doc.body), {
    headers: {
      "content-type": doc.contentType,
      "content-disposition": doc.contentType.startsWith("application/pdf") ? "inline" : `attachment; filename="${decodeURIComponent(file)}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
