import type { Metadata } from "next";
import styles from "@/components/panel/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";
import { listarDossier } from "@/lib/pvc/dossier";
import { edicionVigente } from "@/lib/pvc/servicio";

export const metadata: Metadata = { title: "PVC · Dossier · BCP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const cop = (v: number | null) => (v == null ? "—" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v));

// El dossier declara el modelo de manera conceptual (D0–D9 + calculadora) y se
// reedita con los números de la edición publicada. Se sirve autenticado desde
// docs/pvc/<versión>/ (ver lib/pvc/dossier.ts).
export default async function PvcDossierPage() {
  const [docs, vigente] = await Promise.all([listarDossier(), edicionVigente()]);
  const versiones = Array.from(new Set(docs.map((d) => d.version)));
  return (
    <>
      <h1 className={styles.title}>Dossier del modelo</h1>
      <p className={styles.subtitle}>
        Los documentos que declaran el método y la edición vigente{vigente ? <> (<strong>{vigente.code} · {cop(vigente.pvcCop)}</strong>, modelo {vigente.modelVersion})</> : null}.
        Se regeneran por edición con el motor de referencia; la versión del dossier sigue a la del modelo.
      </p>
      {versiones.length === 0 && <p className={styles.empty}>No hay dossier en este despliegue.</p>}
      {versiones.map((v) => (
        <div className={styles.card} key={v}>
          <div className={styles.sectionHead}><strong>Dossier {v}</strong></div>
          <div className={table.scroll}><table className={table.t}>
            <thead><tr><th>Documento</th><th>Archivo</th><th style={{ textAlign: "right" }}>Tamaño</th><th></th></tr></thead>
            <tbody>
              {docs.filter((d) => d.version === v).map((d) => (
                <tr key={d.file}>
                  <td><strong>{d.title}</strong></td>
                  <td style={{ fontSize: 12 }}>{d.file}</td>
                  <td style={{ textAlign: "right" }}>{d.sizeKb} KB</td>
                  <td style={{ textAlign: "right" }}>
                    <a className="btn btn-sm" href={`/bcp/pvc/dossier/${encodeURIComponent(v)}/${encodeURIComponent(d.file)}`} target="_blank" rel="noopener">{d.kind === "pdf" ? "Abrir" : "Descargar"}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      ))}
      <p className={styles.meta}>
        Regeneración: <code>python pvc_model_v2.py → _fuentes/build.py → build_xlsx.py → verify_xlsx.py</code> en <code>reference_internal_apps/PVC - Modelo/v2.0</code>; la copia
        publicada aquí es la salida de ese pipeline. Con el ciclo automático (fase 3 del plan) se generará por edición.
      </p>
    </>
  );
}
