import Link from "next/link";
import styles from "@/components/panel/shared.module.css";
import { primaMinima, desviacionDeMercado } from "@/lib/pvc/lectura";
import type { LecturaMercado } from "@/lib/pvc/servicio";
import type { PvcEdition } from "@/lib/pvc/tipos";

// ── BCP · las cifras del negocio ─────────────────────────────────────────────
// El panel del BCP fue un índice desde que el pasaporte del lote se mudó al OCP
// (V4.24) y se llevó con él los KPIs que vivían aquí. Su propio archivo dejó
// escrito que volvería a ser un tablero «cuando haya KPIs de negocio que valga
// la pena mirar de un vistazo». El Modelo Económico los trajo: el precio que
// rige, lo que da al productor y qué tan lejos está el mercado de él.
//
// Todo sale de la edición VIGENTE por su ventana (V5.43) y de `market_anchors`.
// Si no hay edición o no hay lectura del mercado, cada tarjeta lo dice en vez de
// enseñar un cero.

const cop0 = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const pct = (v: number | null | undefined, d = 1) =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d).replace(".", ",")} %`;
const day = (d: string | null | undefined) =>
  d ? new Date(d.length > 10 ? d : `${d}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) : "—";

export function BcpKpis({
  vigente, proxima, mercado,
}: { vigente: PvcEdition | null; proxima: PvcEdition | null; mercado: LecturaMercado }) {
  const pvc = vigente?.pvcCop ?? null;
  const multBlack = vigente?.outputs?.escalera?.find((e) => e.banda === "Black")?.mult ?? 1.15;
  const fnc = mercado.fncHoy;
  const prima = pvc != null && fnc != null ? primaMinima(pvc, multBlack, fnc) : null;
  const desv = fnc != null && vigente ? desviacionDeMercado(fnc, vigente.inputs?.fnc_30d ?? 0) : null;

  return (
    <div className={styles.kpiGrid}>
      <div className={styles.kpiCard}>
        <Link href="/bcp/pvc/lectura">
          <div className={styles.kpiTop}><span className={styles.kpiK}>PVC vigente</span></div>
          <span className={styles.kpiV} style={{ display: "block" }}>{pvc == null ? "—" : `${Math.round(pvc / 1000)}k`}</span>
          <div className={styles.kpiSub}>
            {vigente
              ? <>{vigente.code} · por carga · rige hasta el {day(vigente.validTo)}</>
              : "Ninguna edición rige hoy"}
          </div>
        </Link>
      </div>

      <div className={styles.kpiCard}>
        <Link href="/bcp/pvc/lectura">
          <div className={styles.kpiTop}><span className={styles.kpiK}>Prima mínima</span></div>
          <span className={styles.kpiV} style={{ display: "block" }}>{pct(prima)}</span>
          <div className={styles.kpiSub}>
            {prima == null ? "Sin lectura del precio de la Federación" : <>El escalón Black sobre el FNC del {day(mercado.fncAsOf)}</>}
          </div>
        </Link>
      </div>

      <div className={styles.kpiCard}>
        <Link href="/bcp/pvc/lectura">
          <div className={styles.kpiTop}><span className={styles.kpiK}>Mercado desde el corte</span></div>
          <span className={styles.kpiV} style={{ display: "block" }}>{pct(desv)}</span>
          <div className={styles.kpiSub}>
            {desv == null ? "—" : <>FNC de hoy {cop0(fnc)} contra la entrada de la edición</>}
          </div>
        </Link>
      </div>

      <div className={styles.kpiCard}>
        <Link href="/bcp/pvc">
          <div className={styles.kpiTop}><span className={styles.kpiK}>Próxima edición</span></div>
          <span className={styles.kpiV} style={{ display: "block", fontSize: proxima ? 34 : 22 }}>
            {proxima ? `${Math.round((proxima.pvcCop ?? 0) / 1000)}k` : "Sin publicar"}
          </span>
          <div className={styles.kpiSub}>
            {proxima
              ? <>{proxima.code} · entra en vigor el {day(proxima.validFrom)}</>
              : "El PVC se publica 7–8 semanas antes de su fecha efectiva"}
          </div>
        </Link>
      </div>
    </div>
  );
}
