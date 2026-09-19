import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { createLot } from "../actions";
import { cargarKr } from "./carga";
import { KrTabla, type FiltroRapido } from "./KrTabla";
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

type Params = { lote?: string; finca?: string; productor?: string; vista?: string; filtro?: string };

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
  const [{ filas, temporadas }, { data: fincasAprobadas }] = await Promise.all([
    cargarKr(service),
    service.from("fincas").select("id, name, municipio").eq("status", "approved").order("name"),
  ]);
  const aprobadas = (fincasAprobadas as { id: string; name: string; municipio: string | null }[] | null) ?? [];
  const filtroInicial = (FILTROS as string[]).includes(sp.filtro ?? "") ? (sp.filtro as FiltroRapido) : "";

  return (
    <div>
      <AnclasViejas />
      <h1 className={styles.title}>Productores, Fincas y Lotes</h1>
      <p className={styles.subtitle}>
        Una fila por lote, con su finca y su productor al lado — y una fila propia para la finca que aún no tiene lote y el productor que
        aún no tiene finca, que son a los que hay que acompañar. Cada celda abre la vista completa de lo que nombra. La pestaña{" "}
        <b>Mapa</b> enseña lo mismo que esté filtrado aquí.
      </p>

      <details className={styles.card} style={{ display: "block", marginBottom: 24 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Nuevo lote (en nombre del productor)</summary>
        {!aprobadas.length ? (
          <p className={styles.empty} style={{ marginTop: 14 }}>Aprueba al menos una finca antes de poder crear un lote.</p>
        ) : (
          <ActionForm action={createLot} style={{ marginTop: 16 }} submitLabel="Crear lote" pendingLabel="Creando…" buttonClassName="btn btn-solid">
            <div className={styles.field}>
              <label htmlFor="finca_id">Finca</label>
              <select id="finca_id" name="finca_id" required>
                {aprobadas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.municipio})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="name">Nombre del lote</label>
              <input id="name" name="name" required placeholder="Ej. Caturra Natural" />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="ficha_variedad">Variedad</label>
                <input id="ficha_variedad" name="ficha_variedad" />
              </div>
              <div className={styles.field}>
                <label htmlFor="ficha_proceso">Proceso</label>
                <input id="ficha_proceso" name="ficha_proceso" />
              </div>
              <div className={styles.field}>
                <label htmlFor="ficha_altitud_m">Altitud (m)</label>
                <input id="ficha_altitud_m" name="ficha_altitud_m" type="number" />
              </div>
              <div className={styles.field}>
                <label htmlFor="ficha_peso_muestra_kg">Peso de muestra (kg)</label>
                <input id="ficha_peso_muestra_kg" name="ficha_peso_muestra_kg" type="number" step="0.1" defaultValue={2} />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="ficha_notas_cata">Notas de cata</label>
              <textarea id="ficha_notas_cata" name="ficha_notas_cata" rows={2} />
            </div>
          </ActionForm>
        )}
      </details>

      {!filas.length ? (
        <p className={styles.empty}>No hay productores registrados.</p>
      ) : (
        <KrTabla filas={filas} temporadas={temporadas} vistaInicial={sp.vista === "mapa" ? "mapa" : "tabla"} filtroInicial={filtroInicial} />
      )}
    </div>
  );
}
