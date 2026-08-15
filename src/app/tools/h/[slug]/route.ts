import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

// ── El servidor de herramientas subidas (2026-08-15) ─────────────────────────
// Una herramienta que el owner sube por el ECP no puede vivir en `public/`: en
// Vercel el disco es de solo lectura en ejecución y `public/` se hornea en el
// build. Vive en Storage, y esta ruta es la que la entrega.
//
// ⚠️ POR QUÉ CUELGA DE `/tools` Y NO DE `/ecp` — es LA lección de la gotcha 12.
// El mecanismo anterior de herramientas «privadas» servía desde
// `/ecp/herramientas/<key>`, y eso las condenaba: en un subdominio el proxy
// reescribía esa ruta a `/kaffetal-regal/ecp/…` y daba 404, así que una
// herramienta encendida para el productor «funcionaba en el ECP y 404 en KR».
// `/tools` está EXCLUIDO del matcher del proxy (ver src/proxy.ts), de modo que
// esta URL es la misma y funciona igual en los 18 hosts. Si alguien toca ese
// matcher, esto se rompe con él.
//
// LA COMPUERTA. Aquí es donde «interna» deja de ser una etiqueta: una
// herramienta interna solo se entrega a una sesión de consola interna, y como su
// archivo está en Storage (nunca en public/), no hay una segunda URL por la que
// alcanzarlo. El guardián `guard_tools_clase` de la base es lo que garantiza esa
// premisa: no deja marcar interna una herramienta cuya versión publicada sea un
// fichero del repositorio.

const BUCKET = "kaffetal-media";

/** 404 para todo lo que no se puede servir. A quien no debe verla, una
 *  herramienta interna le responde exactamente lo mismo que una inexistente —
 *  un 403 confirmaría que existe. */
function noHay() {
  return new Response("No encontrado", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) return noHay();

  const service = createServiceRoleClient();
  const { data: tool } = await service
    .from("tools")
    .select("id, clase, archivado_at, version_publicada")
    .eq("id", slug)
    .maybeSingle();
  if (!tool || !tool.version_publicada) return noHay();

  // Archivada = retirada de circulación, también por URL directa. Si no, un
  // enlace viejo seguiría sirviendo algo que el owner dio de baja.
  if (tool.archivado_at) return noHay();

  if (tool.clase === "interna") {
    try {
      await requireActiveAdmin();
    } catch {
      return noHay();
    }
  }

  const { data: version } = await service
    .from("tool_versions")
    .select("origen, src_publico, storage_path")
    .eq("id", tool.version_publicada)
    .maybeSingle();
  if (!version) return noHay();

  // Versión heredada del repositorio: el archivo ya se sirve estático desde
  // `/tools/x.html`, así que esta ruta solo redirige. Nunca puede darse en una
  // herramienta interna — el guardián de la base lo impide —, pero se comprueba
  // igual: una compuerta que depende de un invariante remoto se comprueba dos veces.
  if (version.origen === "repo") {
    if (tool.clase === "interna" || !version.src_publico) return noHay();
    return Response.redirect(new URL(version.src_publico, _request.url), 307);
  }

  if (!version.storage_path) return noHay();
  const { data: blob, error } = await service.storage.from(BUCKET).download(version.storage_path);
  if (error || !blob) return noHay();

  const interna = tool.clase === "interna";
  return new Response(blob.stream(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // El HTML lo sube un administrador, pero `nosniff` evita que el navegador
      // reinterprete como otra cosa un archivo que no sea lo que declara.
      "X-Content-Type-Options": "nosniff",
      // Una interna NO se cachea en ningún intermediario: la respuesta depende
      // de quién pregunta, y una copia en la CDN se la serviría a cualquiera.
      // Una compartible sí, corto — publicar una versión nueva debe verse pronto.
      "Cache-Control": interna ? "private, no-store" : "public, max-age=300",
      // Fuera del índice: la URL canónica de una herramienta compartible sigue
      // siendo su página, no este entregador.
      "X-Robots-Tag": "noindex",
    },
  });
}
