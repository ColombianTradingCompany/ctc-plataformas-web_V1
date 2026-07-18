import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { listArchitectureDocs, type ArchitectureDoc } from "@/lib/panel/architectureDocs";
import styles from "@/app/bcp/(app)/shared.module.css";

// ECP · IT y Plataforma → Documentación del sistema.
// El mapa vivo del sistema (docs/architecture/) deja de vivir solo en el repo y
// se puede abrir desde la consola. Cada versión entera (.0) es un snapshot
// congelado y navegable; entre versiones, los cambios viven en la bitácora.

const KIND_LABEL: Record<ArchitectureDoc["kind"], string> = {
  snapshot: "Mapa interactivo",
  report: "Informe",
  log: "Bitácora",
};

export default async function EcpDocumentacionPage() {
  await requireConsoleAccess("ecp");
  const docs = await listArchitectureDocs();

  const snapshots = docs.filter((d) => d.kind === "snapshot");
  const current = snapshots[0] ?? null;
  const historical = snapshots.slice(1);
  const reports = docs.filter((d) => d.kind === "report");
  const logs = docs.filter((d) => d.kind === "log");
  const pendingLog = logs[0] ?? null;

  const href = (d: ArchitectureDoc) => `/ecp/documentacion/${encodeURIComponent(d.file)}`;

  const row = (d: ArchitectureDoc) => (
    <li key={d.file} style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", padding: "7px 0", borderBottom: "1px dashed var(--line)" }}>
      <a href={href(d)} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
        {d.title} ↗
      </a>
      <span className={styles.meta}>
        {KIND_LABEL[d.kind]}
        {d.sha && <> · commit <span className="mono">{d.sha}</span></>}
        {" · "}{d.sizeKb} KB
      </span>
    </li>
  );

  return (
    <div>
      <h1 className={styles.title}>Documentación del sistema</h1>
      <p className={styles.subtitle}>
        El mapa vivo de la plataforma: nodos, cables, escenarios de negocio y el mapa de archivos, congelado
        versión a versión. Solo las versiones enteras (<b>.0</b>) se compilan como archivo; entre una y otra, los
        cambios se acumulan en la bitácora pendiente. Se sirven desde el repositorio con la sesión de la consola —
        no son públicos.
      </p>

      {!docs.length ? (
        <p className={styles.empty}>
          No se encontró <span className="mono">docs/architecture/</span> en este despliegue. En local aparece
          automáticamente; en producción depende de <span className="mono">outputFileTracingIncludes</span> en{" "}
          <span className="mono">next.config.ts</span>.
        </p>
      ) : (
        <>
          {current && (
            <div className={styles.card} style={{ display: "block", marginBottom: 26 }}>
              <span className={`${styles.badge} ${styles.badgeGood}`}>Versión vigente</span>
              <h2 style={{ fontSize: 19, margin: "10px 0 4px" }}>{current.title}</h2>
              <p className={styles.meta} style={{ marginTop: 0 }}>
                Corresponde al commit <span className="mono">{current.sha}</span> · {current.sizeKb} KB
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <a className="btn btn-sm btn-solid" href={href(current)} target="_blank" rel="noopener noreferrer">
                  Abrir el mapa interactivo ↗
                </a>
                {pendingLog && (
                  <a className="btn btn-sm" href={href(pendingLog)} target="_blank" rel="noopener noreferrer">
                    Ver la bitácora pendiente ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {reports.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, marginTop: 26 }}>Informes</h2>
              <p className={styles.meta} style={{ marginTop: 0 }}>
                Auditorías y análisis adjuntos a una versión.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>{reports.map(row)}</ul>
            </>
          )}

          {historical.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, marginTop: 30 }}>Versiones anteriores ({historical.length})</h2>
              <p className={styles.meta} style={{ marginTop: 0 }}>
                Nada se borra: cada snapshot queda navegable tal como era el sistema ese día.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>{historical.map(row)}</ul>
            </>
          )}

          {logs.length > 1 && (
            <details className={styles.card} style={{ display: "block", marginTop: 30 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                Bitácoras cerradas ({logs.length - 1})
              </summary>
              <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>{logs.slice(1).map(row)}</ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
