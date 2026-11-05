import { notFound } from "next/navigation";
import { LangProvider } from "@/components/lang/i18n";
import { ConchaHerramienta } from "@/components/tools/ConchaHerramienta";
import { BarraHerramienta } from "@/components/tools/BarraHerramienta";
import { resolverHerramienta } from "@/lib/tools/unaHerramienta";
import { cargarTaller } from "@/lib/tools/taller";
import { construirPrefill, leerEntrada, rutaDeAcceso, urlDeHerramienta } from "@/lib/tools/entrada";
import { resolverEntrada } from "@/lib/tools/entradaServidor";

// ── Herramientas del Café · una herramienta, en SU casa (A8/A11, V5.4) ──────
// Segunda pasada del owner (V5.6): PANTALLA COMPLETA. La herramienta llena la
// ventana — la barra del taller arriba (identidad + salida), la cabecera de la
// concha en una línea, y el marco con todo el alto restante. Nada de columnas
// de 1180px: «the working space is very reduced» era literal.
//
// TAR-121: la página es además una ENTRADA de módulo. Lee `?trabajo=` (abre un
// trabajo guardado de la cuenta), `?finca=` / `?lote=` (prellenan un trabajo
// nuevo con un registro de la cuenta) y `?volver=` (lista blanca). El contrato
// está en `src/lib/tools/entrada.ts`; la propiedad la decide el servidor
// (`entradaServidor.ts` y las server actions de `trabajos.ts`), nunca la URL.
export const dynamic = "force-dynamic";

export default async function HerramientaTallerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const entrada = leerEntrada(await searchParams);

  const [h, taller] = await Promise.all([resolverHerramienta("herramientas", slug), cargarTaller()]);
  if (!h || !h.src) notFound();

  // El trabajo y el prellenado solo existen en una herramienta con memoria que la cuenta puede abrir: sin eso no hay
  // Home Menu donde ofrecerlos, y no se lee la base para nada.
  const conMenu = h.veredicto.abre && h.soportaMemoria;
  const { registro, avisos } = conMenu && !entrada.trabajo ? await resolverEntrada(entrada.finca, entrada.lote) : { registro: null, avisos: [] };
  const prefill = conMenu && !entrada.trabajo ? construirPrefill(h.id, registro) : null;
  const avisoEntrada = conMenu ? [...entrada.avisos, ...avisos].join(" ") || null : null;
  // Sin sesión, «Entrar» vuelve a ESTA herramienta con sus parámetros (ya validados), no a la rejilla.
  const entrarHref =
    h.veredicto.abre || h.veredicto.motivo !== "sin-cuenta"
      ? null
      : rutaDeAcceso(
          urlDeHerramienta(h.id, {
            trabajo: entrada.trabajo ?? undefined,
            finca: entrada.finca?.valor,
            lote: entrada.lote?.valor,
            volver: entrada.volver,
          })
        );

  return (
    <div data-theme="ctc-home" style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <LangProvider storageKey="ctc-lang" declaraHtml={false}>
        <BarraHerramienta
          nombre={h.nombre}
          email={taller.email}
          red={taller.red}
          volverHref={entrada.volver}
          volverEtiqueta="Volver a Herramientas"
          conTrabajos={h.soportaMemoria}
        />
        <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "8px 16px 12px" }}>
          <ConchaHerramienta
            superficie="herramientas"
            volver={entrada.volver}
            toolId={h.id}
            nombre={h.nombre}
            descripcion={h.descripcion}
            esPlus={h.esPlus}
            src={h.src}
            veredicto={h.veredicto}
            soportaMemoria={h.soportaMemoria}
            guia={h.guia}
            trabajoInicial={conMenu ? entrada.trabajo : null}
            prefill={prefill}
            avisoEntrada={avisoEntrada}
            entrarHref={entrarHref}
            pantallaCompleta
          />
        </main>
      </LangProvider>
    </div>
  );
}
