import Link from "next/link";
import { cotizacionCongelada } from "@/lib/courier/lectura";
import { COURIER_PATH, CRM_CAAS_PATH } from "@/lib/courier/types";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── LCP · CRM CaaS · una cotización courier, en solo lectura (V5.97, owner 2026-09-30: «démosle lectura») ──
// El colaborador con grant de LCP y sin grant de ECP veía en la tarjeta del item el resumen de cada cotización y no
// podía abrirla (el cotizador vive en el ECP). Aquí ve el acta congelada —lo que se metió, las opciones y el desglose
// por concepto de la elegida— sin entrar al cotizador ni ver los % del acuerdo. La compuerta es la del layout de la LCP.
export default async function LcpCotizacionCourierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = /^[0-9a-f-]{36}$/i.test(id) ? await cotizacionCongelada(id) : null;
  const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" }).format(n);
  const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

  if (!q) {
    return (
      <div>
        <h1 className={styles.title}>Cotización courier</h1>
        <p className={styles.empty}>Esa cotización ya no existe.</p>
        <p className={styles.meta}><Link href={CRM_CAAS_PATH}>← Volver al CRM CaaS</Link></p>
      </div>
    );
  }
  const elegida = q.opciones.find((o) => o.clave === q.servicioElegido) ?? null;
  return (
    <div>
      <h1 className={styles.title}>Cotización courier · FedEx</h1>
      <p className={styles.subtitle}>
        {q.itemCaas ? <>Item CaaS <b>{q.itemCaas}</b> · </> : null}guardada el {fecha(q.createdAt)} · envío {q.entradas.fechaEnvio ? fecha(q.entradas.fechaEnvio) : "—"} ·{" "}
        {q.pais ?? q.entradas.destino} · {q.pesoRealKg} kg reales{q.pesoFacturableKg !== q.pesoRealKg ? ` (se cobran ${q.pesoFacturableKg} kg)` : ""}
        {q.nota ? <> · «{q.nota}»</> : null}
      </p>
      <p className={styles.meta} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href={q.leadId ? `${CRM_CAAS_PATH}#lead-${q.leadId}` : CRM_CAAS_PATH}>← Volver al item</Link>
        <Link href={`${COURIER_PATH}?abrir=${q.id}`}>Abrir en el cotizador (ECP) ↗</Link>
      </p>

      <div className={styles.miniCard}>
        <b>Piezas</b>
        <table style={{ marginTop: 6 }}>
          <thead><tr><th>kg</th><th>largo</th><th>ancho</th><th>alto</th></tr></thead>
          <tbody>
            {q.entradas.piezas.map((p, i) => (
              <tr key={i}><td>{p.kg}</td><td>{p.largoCm} cm</td><td>{p.anchoCm} cm</td><td>{p.altoCm} cm</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.miniCard} style={{ marginTop: 10 }}>
        <b>Opciones cotizadas aquel día</b>
        <table style={{ marginTop: 6 }}>
          <thead><tr><th>Servicio</th><th>kg cobrados</th><th>Total</th></tr></thead>
          <tbody>
            {q.opciones.map((o) => (
              <tr key={o.clave} style={o.clave === q.servicioElegido ? { fontWeight: 600 } : undefined}>
                <td>{o.etiqueta}{o.clave === q.servicioElegido ? " · elegida" : ""}</td>
                <td>{o.pesoCobradoKg}</td>
                <td>{o.disponible ? usd(o.totalUsd) : `— ${o.motivo ?? "no disponible"}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {elegida && (
        <div className={styles.miniCard} style={{ marginTop: 10 }}>
          <b>Desglose · {elegida.etiqueta}</b>
          <table style={{ marginTop: 6 }}>
            <tbody>
              {elegida.lineas.map((l, i) => (
                <tr key={i}><td>{l.concepto}</td><td style={{ textAlign: "right" }}>{usd(l.usd)}</td></tr>
              ))}
              <tr><td><b>Total</b></td><td style={{ textAlign: "right" }}><b>{usd(elegida.totalUsd)}</b></td></tr>
            </tbody>
          </table>
          <p className={styles.meta} style={{ marginTop: 6 }}>
            Los porcentajes del acuerdo con FedEx no se enseñan aquí (son confidenciales): están en el cotizador del ECP.
          </p>
        </div>
      )}
      {q.avisos.length > 0 && (
        <ul className={styles.meta} style={{ marginTop: 10 }}>
          {q.avisos.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      )}
    </div>
  );
}
