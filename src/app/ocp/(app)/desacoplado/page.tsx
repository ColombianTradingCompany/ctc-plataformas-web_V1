import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { supplierCode } from "@/components/kaffetal-regal/data";
import { ActionForm } from "@/components/panel/ActionForm";
import { crearProveedorDesacoplado, entregarCuentaDesacoplada } from "@/lib/asistencia/actions";
import { GESTION_LABEL, type Gestion } from "@/lib/asistencia/desacoplado";
import { SesionAsistidaBoton } from "../asistencia/SesionAsistidaBoton";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── OCP · Kaffetal Regal · Proveedor Desacoplado (V5.75, owner 2026-09-23) ──
// La Ruta Desacoplada: alguien tiene un café que vale la pena y no quiere entender ni usar la
// plataforma. CTCx le crea aquí una cuenta de productor SIN buzón (correo-etiqueta, contraseña que
// nadie conoce) y lleva el proceso en su nombre con la sesión asistida. Si un día se le entrega, se le
// asigna el correo real de alguien (si no, nunca); mientras tanto, de cara al comprador es CTCx Selection.
// Lo que se cobra, se oferta o se compra a un desacoplado NO vive aquí: viaja con la 4b y el brief de Compras.

type ProfileRow = { id: string; full_name: string | null; email: string | null; phone: string | null };
type PPRow = { profile_id: string; company_name: string | null; department: string | null; gestion: Gestion | null; gestion_desde: string | null; entregado_at: string | null };

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default async function DesacopladoPage() {
  const service = createServiceRoleClient();
  const { data: ppRaw } = await service
    .from("producer_profiles")
    .select("profile_id, company_name, department, gestion, gestion_desde, entregado_at")
    .not("gestion", "is", null)
    .order("gestion_desde", { ascending: false });
  const gestionados = (ppRaw as PPRow[] | null) ?? [];
  const { data: pRaw } = gestionados.length
    ? await service.from("profiles").select("id, full_name, email, phone").in("id", gestionados.map((g) => g.profile_id))
    : { data: [] as ProfileRow[] };
  const perfil = new Map(((pRaw as ProfileRow[] | null) ?? []).map((p) => [p.id, p]));

  return (
    <div>
      <h1 className={styles.title}>Proveedor Desacoplado</h1>
      <p className={styles.subtitle}>
        Una cuenta de productor que <b>CTCx crea y lleva</b> en nombre del dueño de un café que no va a usar la plataforma. Nace sin
        buzón ni contraseña; su información se carga con «Entrar como el productor». Si algún día se le entrega, se le asigna el
        correo de alguien y recibe el enlace para elegir su contraseña.
      </p>

      <details className={styles.card} style={{ display: "block", marginBottom: 24 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Crear proveedor desacoplado</summary>
        <ActionForm action={crearProveedorDesacoplado} style={{ marginTop: 16 }} submitLabel="Crear cuenta" pendingLabel="Creando…" buttonClassName="btn btn-solid">
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="full_name">Nombre del dueño del café *</label>
              <input id="full_name" name="full_name" required minLength={3} placeholder="Ej. María Pérez" />
            </div>
            <div className={styles.field}>
              <label htmlFor="company_name">Finca o razón social (opcional)</label>
              <input id="company_name" name="company_name" />
            </div>
            <div className={styles.field}>
              <label htmlFor="department">Departamento (opcional)</label>
              <input id="department" name="department" placeholder="Ej. Santander" />
            </div>
            <div className={styles.field}>
              <label htmlFor="phone">Teléfono / WhatsApp (opcional)</label>
              <input id="phone" name="phone" />
            </div>
          </div>
          <p className={styles.meta}>
            El correo de acceso se genera solo (<span className="mono">desacoplado-…@ctcexport.com</span>) y no recibe correos: ningún
            aviso automático sale hacia una cuenta desacoplada.
          </p>
        </ActionForm>
      </details>

      {!gestionados.length ? (
        <p className={styles.empty}>Todavía no hay proveedores desacoplados.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {gestionados.map((g) => {
            const p = perfil.get(g.profile_id);
            return (
              <div key={g.profile_id} className={styles.card} style={{ display: "block" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <Link href={`/ocp/kr?productor=${g.profile_id}`} style={{ fontWeight: 700, textDecoration: "none", color: "var(--ink)" }}>
                    {p?.full_name || "Productor"}
                  </Link>
                  <span className={styles.badge}>Pasaporte · {supplierCode(g.profile_id)}</span>
                  {g.gestion && <span className={`${styles.badge} ${g.gestion === "desacoplado" ? styles.badgeWarn : styles.badgeGood}`}>{GESTION_LABEL[g.gestion]}</span>}
                </div>
                <p className={styles.meta}>
                  {[g.company_name, g.department, p?.phone && `☎ ${p.phone}`].filter(Boolean).join(" · ") || "Sin datos"} · acceso{" "}
                  <span className="mono">{p?.email}</span> · desde {fecha(g.gestion_desde)}
                  {g.entregado_at ? ` · entregada el ${fecha(g.entregado_at)}` : ""}
                </p>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginTop: 10 }}>
                  <SesionAsistidaBoton producerId={g.profile_id} nombre={p?.full_name ?? undefined} />
                  {g.gestion === "desacoplado" && (
                    <ActionForm
                      action={entregarCuentaDesacoplada.bind(null, g.profile_id)}
                      submitLabel="Entregar cuenta"
                      pendingLabel="Entregando…"
                      buttonClassName="btn btn-sm"
                      style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}
                    >
                      <input name="email" type="email" required placeholder="Correo real de la persona" style={{ maxWidth: 260 }} />
                    </ActionForm>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
