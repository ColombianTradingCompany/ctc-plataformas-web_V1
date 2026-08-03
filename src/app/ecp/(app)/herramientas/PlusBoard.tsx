import { decidirPlus, listarSolicitudesPlus, type SolicitudPlus } from "@/lib/tools/plusGrants";
import styles from "@/app/bcp/(app)/shared.module.css";

// ── Solicitudes de Herramientas Plus (owner, 2026-08-02) ─────────────────────
// Sub-tablero del ECP → Herramientas del café: un listado COMPACTO por
// audiencia (productores / compradores / expertos del DC) con las solicitudes
// pendientes para activar o rechazar, más el registro de activos con revocar.
// A futuro la activación irá atada a un pago; hoy es decisión manual de CTC.

const AUDIENCIA_LABEL: Record<string, string> = {
  producer: "Productores (Kaffetal Regal)",
  buyer: "Compradores (Cherry Picked)",
  dc: "Expertos del Directorio",
};

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

function Fila({ s }: { s: SolicitudPlus }) {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "7px 0", borderBottom: "1px dashed var(--line)" }}>
      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{s.nombre}</span>
      <span className={styles.meta} style={{ marginTop: 0 }}>
        {s.email} · solicitó el {fecha(s.requestedAt)}
      </span>
      <span style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {s.status === "pendiente" ? (
          <>
            <form action={async () => { "use server"; await decidirPlus(s.id, "activo"); }}>
              <button className="btn btn-sm btn-solid" type="submit">Activar</button>
            </form>
            <form action={async () => { "use server"; await decidirPlus(s.id, "rechazado"); }}>
              <button className="btn btn-sm" type="submit">Rechazar</button>
            </form>
          </>
        ) : s.status === "activo" ? (
          <>
            <span className={styles.badgeGood}>Activo desde {fecha(s.decidedAt)}</span>
            <form action={async () => { "use server"; await decidirPlus(s.id, "rechazado"); }}>
              <button className="btn btn-sm" type="submit">Revocar</button>
            </form>
          </>
        ) : (
          <>
            <span className={styles.badge}>Rechazada {fecha(s.decidedAt)}</span>
            <form action={async () => { "use server"; await decidirPlus(s.id, "activo"); }}>
              <button className="btn btn-sm" type="submit">Activar</button>
            </form>
          </>
        )}
      </span>
    </li>
  );
}

export async function PlusBoard() {
  const solicitudes = await listarSolicitudesPlus();
  const pendientes = solicitudes.filter((s) => s.status === "pendiente");
  const decididas = solicitudes.filter((s) => s.status !== "pendiente");

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 26 }}>
      <h2 style={{ fontSize: 16, margin: 0 }}>Solicitudes de Herramientas Plus</h2>
      <p className={styles.subtitle} style={{ marginTop: 6 }}>
        El productor, el comprador o el experto del Directorio solicita Plus desde su plataforma; aquí se activa o se
        rechaza. (A futuro, la activación irá atada a un pago.)
      </p>

      {pendientes.length === 0 ? (
        <p className={styles.empty} style={{ marginTop: 10 }}>Sin solicitudes pendientes.</p>
      ) : (
        (["producer", "buyer", "dc"] as const).map((aud) => {
          const grupo = pendientes.filter((s) => s.audiencia === aud);
          if (!grupo.length) return null;
          return (
            <div key={aud} style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)", margin: 0 }}>
                {AUDIENCIA_LABEL[aud]} · {grupo.length}
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0" }}>
                {grupo.map((s) => <Fila key={s.id} s={s} />)}
              </ul>
            </div>
          );
        })
      )}

      {decididas.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
            Decididas ({decididas.length})
          </summary>
          {(["producer", "buyer", "dc"] as const).map((aud) => {
            const grupo = decididas.filter((s) => s.audiencia === aud);
            if (!grupo.length) return null;
            return (
              <div key={aud} style={{ marginTop: 10 }}>
                <h3 style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)", margin: 0 }}>
                  {AUDIENCIA_LABEL[aud]}
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: "2px 0 0" }}>
                  {grupo.map((s) => <Fila key={s.id} s={s} />)}
                </ul>
              </div>
            );
          })}
        </details>
      )}
    </div>
  );
}
