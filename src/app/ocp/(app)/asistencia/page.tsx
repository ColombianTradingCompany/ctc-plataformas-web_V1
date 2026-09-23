import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { supplierCode } from "@/components/kaffetal-regal/data";
import { GESTION_LABEL, type Gestion } from "@/lib/asistencia/desacoplado";
import { SesionAsistidaBoton, CerrarSesionAsistidaBoton } from "./SesionAsistidaBoton";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── OCP · Kaffetal Regal · Asistencia a Proveedores (V5.75, owner 2026-09-23) ──
// «Entrar al perfil de un productor para ejecutar por él la creación de fincas y lotes y hacer el
// proceso en su nombre.» La lista de productores inscritos con «Entrar como el productor»: abre KR en
// otra pestaña con la SESIÓN ASISTIDA (`src/lib/asistencia/actions.ts`), con rastro en `audit_log` y
// una nota que el productor ve. El mismo botón vive en la vista completa del productor (`/ocp/kr?productor=`).

type ProfileRow = { id: string; full_name: string | null; email: string | null; role: string | null; created_at: string };
type PPRow = { profile_id: string; company_name: string | null; department: string | null; gestion: Gestion | null };

export default async function AsistenciaPage() {
  const service = createServiceRoleClient();
  const [{ data: pRaw }, { data: ppRaw }, { data: fRaw }, { data: lRaw }] = await Promise.all([
    service.from("profiles").select("id, full_name, email, role, created_at").eq("role", "producer").order("full_name"),
    service.from("producer_profiles").select("profile_id, company_name, department, gestion"),
    service.from("fincas").select("id, producer_id"),
    service.from("lots").select("id, producer_id"),
  ]);
  const productores = (pRaw as ProfileRow[] | null) ?? [];
  const perfil = new Map(((ppRaw as PPRow[] | null) ?? []).map((r) => [r.profile_id, r]));
  const cuenta = (rows: { producer_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.producer_id, (m.get(r.producer_id) ?? 0) + 1);
    return m;
  };
  const fincas = cuenta(fRaw as { producer_id: string }[] | null);
  const lotes = cuenta(lRaw as { producer_id: string }[] | null);

  return (
    <div>
      <h1 className={styles.title}>Asistencia a Proveedores</h1>
      <p className={styles.subtitle}>
        Entre a la cuenta de un productor ya inscrito para crear sus fincas y lotes, completar su Ficha o pedir su evaluación <b>en su
        nombre</b>. Kaffetal Regal se abre en otra pestaña con su sesión; su consola sigue abierta en esta. Cada entrada queda registrada
        y el productor recibe una nota en su feed.
      </p>

      <div className={styles.card} style={{ display: "block", marginBottom: 20 }}>
        <h3>Cómo funciona</h3>
        <p className={styles.meta}>
          Al pulsar «Entrar como el productor», el navegador queda con la sesión de ESE productor en todas las plataformas públicas
          (Kaffetal Regal, Cherry Picked…) hasta que la cierre aquí o desde Kaffetal Regal. Si usted entra a Kaffetal Regal con su
          propia cuenta de productor en este mismo navegador, esa sesión se reemplaza.
        </p>
        <div style={{ marginTop: 10 }}>
          <CerrarSesionAsistidaBoton />
        </div>
      </div>

      {!productores.length ? (
        <p className={styles.empty}>No hay productores registrados.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10, background: "var(--card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Productor", "Código", "Cuenta", "Fincas", "Lotes", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productores.map((p) => {
                const pp = perfil.get(p.id);
                return (
                  <tr key={p.id}>
                    <td style={td}>
                      <Link href={`/ocp/kr?productor=${p.id}`} style={{ fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
                        {p.full_name || p.email || "Productor"}
                      </Link>
                      <span style={sub}>{[pp?.company_name, pp?.department].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td style={td}>
                      <span className="mono">{supplierCode(p.id)}</span>
                    </td>
                    <td style={td}>
                      {pp?.gestion ? <span className={`${styles.badge} ${styles.badgeWarn}`}>{GESTION_LABEL[pp.gestion]}</span> : <span className={styles.meta}>Propia</span>}
                    </td>
                    <td style={td}>{fincas.get(p.id) ?? 0}</td>
                    <td style={td}>{lotes.get(p.id) ?? 0}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <SesionAsistidaBoton producerId={p.id} nombre={p.full_name ?? undefined} compacto />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const td: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid var(--line)", verticalAlign: "top", fontSize: 13.5 };
const sub: React.CSSProperties = { display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 2 };
