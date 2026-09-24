import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { cargarKr } from "./carga";
import { KrTabla, type Elemento, type FiltroPasaporte, type FiltroRapido } from "./KrTabla";
import { AnclasViejas } from "./AnclasViejas";
import { LoteSeccion } from "./LoteSeccion";
import { FincaSeccion } from "./FincaSeccion";
import { ProductorSeccion } from "./ProductorSeccion";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── OCP · Kaffetal Regal · «Productores, Fincas y Lotes» (V5.61) ─────────────
// La nota 1 del owner (2026-09-19): Productor, Finca y Lote se funden en UNA tabla navegable en
// cualquier dirección, con el mapa conservado; el estado de la muestra, el grado, la oferta CP y el
// estado del trato son columnas, y el clic abre la vista completa con protagonista
// **Lote → Finca → Productor**. Es la fase 3 de `docs/OVERHAUL_CONSOLAS_PLAN.md`.
//
// Esta página son DOS cosas según sus parámetros:
//   · sin parámetros (o con `?vista=` / `?filtro=`) → la tabla y su mapa: una carga, grano de lote;
//   · `?lote=` · `?finca=` · `?productor=` → la VISTA COMPLETA, que monta como secciones de UNA página
//     lo que antes eran tres módulos con tres modales, y lee SOLO lo que se abre.
//
// Los tres módulos viejos —Productores, Fincas y Lotes— y Galardonados, que pasó a ser un filtro de la
// tabla, son talones 308 hacia aquí (`rutasMovidas.ts`). Ninguna Server Action cambió.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTROS: FiltroRapido[] = ["galardonados", "sin-finca", "sin-lote"];
const PASAPORTES: FiltroPasaporte[] = ["con", "sin", "no_apta", "pendiente", "en_revision", "aprobada", "apta", "rechazada"];

type Params = { lote?: string; finca?: string; productor?: string; vista?: string; filtro?: string; elemento?: string; pasaporte?: string };

export default async function KrPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const service = createServiceRoleClient();
  const id = (v: string | undefined) => (v && UUID.test(v) ? v : null);
  const loteId = id(sp.lote);
  let fincaId = id(sp.finca);
  let productorId = id(sp.productor);

  // ── La vista completa ────────────────────────────────────────────────────
  if (loteId || fincaId || productorId) {
    // El protagonista es lo que se pidió; lo demás se cuelga DEBAJO siguiendo la cadena
    // Lote → Finca → Productor, para no tener que volver a la tabla a buscar al dueño.
    let nombreLote: string | null = null;
    let nombreFinca: string | null = null;
    if (loteId) {
      const { data } = await service.from("lots").select("name, finca_id, producer_id").eq("id", loteId).maybeSingle();
      const l = data as { name: string; finca_id: string | null; producer_id: string } | null;
      nombreLote = l?.name ?? null;
      fincaId = l?.finca_id ?? null;
      productorId = l?.producer_id ?? null;
    }
    if (fincaId) {
      const { data } = await service.from("fincas").select("name, producer_id").eq("id", fincaId).maybeSingle();
      const f = data as { name: string; producer_id: string } | null;
      nombreFinca = f?.name ?? null;
      productorId = f?.producer_id ?? productorId;
    }
    let nombreProductor: string | null = null;
    if (productorId) {
      const { data } = await service.from("profiles").select("full_name, email").eq("id", productorId).maybeSingle();
      const p = data as { full_name: string | null; email: string | null } | null;
      nombreProductor = p?.full_name || p?.email || null;
    }

    const protagonista = loteId ? "lote" : sp.finca ? "finca" : "productor";
    const titulo = protagonista === "lote" ? nombreLote ?? "Lote" : protagonista === "finca" ? nombreFinca ?? "Finca" : nombreProductor ?? "Productor";

    return (
      <div>
        <nav className={styles.meta} aria-label="Migas" style={{ marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Link href="/ocp/kr">← Productores, Fincas y Lotes</Link>
          {productorId && (
            <>
              <span>/</span>
              <Link href={`/ocp/kr?productor=${productorId}`}>{nombreProductor ?? "Productor"}</Link>
            </>
          )}
          {fincaId && protagonista !== "productor" && (
            <>
              <span>/</span>
              <Link href={`/ocp/kr?finca=${fincaId}`}>{nombreFinca ?? "Finca"}</Link>
            </>
          )}
          {loteId && (
            <>
              <span>/</span>
              <b>{nombreLote ?? "Lote"}</b>
            </>
          )}
        </nav>
        <h1 className={styles.title}>{titulo}</h1>

        {loteId && (
          <section style={{ marginBottom: 36 }}>
            <h2 className={styles.sectionHead}>Lote</h2>
            <LoteSeccion service={service} loteId={loteId} />
          </section>
        )}
        {fincaId && protagonista !== "productor" && (
          <section style={{ marginBottom: 36 }}>
            <h2 className={styles.sectionHead}>Finca{protagonista === "lote" ? " de origen" : ""}</h2>
            <FincaSeccion service={service} fincaId={fincaId} />
          </section>
        )}
        {productorId && (
          <section>
            <h2 className={styles.sectionHead}>Productor</h2>
            <ProductorSeccion service={service} productorId={productorId} />
          </section>
        )}
      </div>
    );
  }

  // ── La tabla y su mapa ───────────────────────────────────────────────────
  // V5.76 (owner, al ver la tabla): sin «Nuevo lote (en nombre del productor)» —un lote en nombre de alguien
  // se crea con la sesión asistida (`/ocp/asistencia`)—; agrupada por productor; y con el ELEMENTO (lotes o
  // fincas) como filtro principal, que también decide qué pinta el mapa. `?elemento=fincas&pasaporte=en_revision`
  // es lo que enlaza el KPI «Fincas pendientes» del Panel.
  const { filas, temporadas } = await cargarKr(service);
  const filtroInicial = (FILTROS as string[]).includes(sp.filtro ?? "") ? (sp.filtro as FiltroRapido) : "";
  const elementoInicial: Elemento = sp.elemento === "fincas" ? "fincas" : "lotes";
  const pasaporteInicial = (PASAPORTES as string[]).includes(sp.pasaporte ?? "") ? (sp.pasaporte as FiltroPasaporte) : "";

  return (
    <div>
      <AnclasViejas />
      <h1 className={styles.title}>Productores, Fincas y Lotes</h1>
      <p className={styles.subtitle}>
        Una fila por lote, con su finca y su productor al lado, agrupadas por productor — y una fila propia para la finca que aún no
        tiene lote y el productor que aún no tiene finca, que son a los que hay que acompañar. Con <b>Ver fincas</b>, una fila por finca y
        el filtro de Pasaporte. Cada celda abre la vista completa de lo que nombra; la pestaña <b>Mapa</b> pinta lo mismo que esté filtrado.
      </p>

      {!filas.length ? (
        <p className={styles.empty}>No hay productores registrados.</p>
      ) : (
        <KrTabla
          filas={filas}
          temporadas={temporadas}
          vistaInicial={sp.vista === "mapa" ? "mapa" : "tabla"}
          filtroInicial={filtroInicial}
          elementoInicial={elementoInicial}
          pasaporteInicial={pasaporteInicial}
        />
      )}
    </div>
  );
}
