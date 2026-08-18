import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { PARTNERS, isPartnerSlug } from "@/lib/partners/partners";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import styles from "@/components/panel/shared.module.css";

// ── BCP · Red de Socios · la ficha de un nodo (paso (iii)-4, V4.31) ─────────
// Una página por nodo partner. Responde a la pregunta que hoy obliga a cruzar
// tres pantallas: **¿cómo está este socio ahora mismo?** — quién tiene
// credencial, en qué estado, cuándo entró por última vez, y por dónde entra.
//
// ES DELIBERADAMENTE UNA FICHA DE ESTADO, NO UN PANEL DE OPERACIÓN. Lo que
// cada nodo HACE (recibir pergamino, reservar contenedor, tostar) se construirá
// nodo a nodo cuando se trabaje ese perfil, y vivirá en su propia interfaz de
// socio. Aquí se administra la CREDENCIAL, que es lo que el BCP posee desde
// que la Red de Socios llegó en PR-B: dar de alta una credencial es configurar
// la red.
//
// Todo lo que se ve se DEDUCE de `partner_accounts` y de la configuración del
// nodo. Esta página no escribe nada: alta, baja y reenvío siguen en el tablero
// de `/bcp/socios`, que es donde ya estaban y funcionan.

export const dynamic = "force-dynamic";

type CuentaRow = {
  profile_id: string;
  email: string | null;
  org_name: string | null;
  contact_name: string | null;
  status: string | null;
  invited_at: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  last_login_at: string | null;
  invite_email_sent_at: string | null;
  invite_email_error: string | null;
};

const ESTADO_LABEL: Record<string, string> = {
  invited: "Invitado",
  active: "Activo",
  suspended: "Suspendido",
};

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/** «hace 3 días» dicho de una vez, sin biblioteca. */
function haceCuanto(iso: string | null): string {
  if (!iso) return "nunca";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "hace un mes" : `hace ${meses} meses`;
}

export default async function FichaSocioPage({ params }: { params: Promise<{ nodo: string }> }) {
  const identity = await requireConsoleAccess("bcp");
  if (!identity.isOwner) redirect("/bcp");

  const { nodo } = await params;
  if (!isPartnerSlug(nodo)) notFound();
  const partner = PARTNERS[nodo];

  const service = createServiceRoleClient();
  const { data } = await service
    .from("partner_accounts")
    .select(
      "profile_id, email, org_name, contact_name, status, invited_at, activated_at, suspended_at, last_login_at, invite_email_sent_at, invite_email_error"
    )
    .eq("node_type", nodo)
    .order("created_at", { ascending: true });
  const cuentas = (data as CuentaRow[] | null) ?? [];

  const activas = cuentas.filter((c) => c.status === "active");
  const nuncaEntraron = cuentas.filter((c) => c.status === "active" && !c.last_login_at);
  // Un correo de invitación que falló es el fallo MUDO de este módulo: la
  // credencial existe, el socio no sabe que existe, y nadie se entera salvo que
  // se mire aquí. Por eso tiene KPI propio en vez de vivir escondido en la fila.
  const inviteRotos = cuentas.filter((c) => c.invite_email_error);

  const kpis = [
    { k: "Credenciales", v: String(cuentas.length), sub: cuentas.length ? `${activas.length} activa${activas.length === 1 ? "" : "s"}` : "ninguna emitida" },
    { k: "Último acceso", v: haceCuanto(activas.map((c) => c.last_login_at).filter(Boolean).sort().at(-1) ?? null), sub: "de cualquier credencial" },
    { k: "Nunca han entrado", v: String(nuncaEntraron.length), sub: nuncaEntraron.length ? "activas sin primer acceso" : "todas han entrado ✓" },
    { k: "Invitaciones fallidas", v: String(inviteRotos.length), sub: inviteRotos.length ? "el socio no recibió el correo" : "sin errores de envío" },
  ];

  return (
    <div>
      <p className={styles.meta} style={{ margin: 0 }}>
        <Link href="/bcp/socios">← Red de Socios</Link>
      </p>
      <h1 className={styles.title} style={{ borderLeft: `4px solid ${partner.accent}`, paddingLeft: 12 }}>
        {partner.name}
      </h1>
      <p className={styles.subtitle}>{partner.role}</p>

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <div key={kpi.k} className={styles.kpiCard}>
            <span className={styles.kpiTop}>
              <span className={styles.kpiK}>{kpi.k}</span>
            </span>
            <span className={styles.kpiV}>{kpi.v}</span>
            <span className={styles.kpiSub}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      <section style={{ marginTop: 30 }}>
        <div className={styles.sectionHead}>
          <h2>Credenciales ({cuentas.length})</h2>
        </div>
        {cuentas.length === 0 ? (
          <p className={styles.empty}>
            Este nodo todavía no tiene credenciales. Se emiten desde <Link href="/bcp/socios">Red de Socios</Link>; su
            landing pública ya está en pie y espera.
          </p>
        ) : (
          <div className={styles.list}>
            {cuentas.map((c) => (
              <div key={c.profile_id} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{c.org_name || c.contact_name || c.email || "Sin nombre"}</h3>
                    <p className={styles.meta} style={{ margin: "2px 0 0" }}>
                      {c.contact_name && c.org_name ? `${c.contact_name} · ` : ""}
                      {c.email ?? "sin correo"}
                    </p>
                  </div>
                  <span className={c.status === "active" ? styles.badgeGood : c.status === "suspended" ? styles.badgeBad : styles.badge}>
                    {ESTADO_LABEL[c.status ?? ""] ?? c.status ?? "—"}
                  </span>
                </div>
                <p className={styles.meta} style={{ margin: 0 }}>
                  Invitada el {fecha(c.invited_at)}
                  {c.activated_at && <> · activada el {fecha(c.activated_at)}</>}
                  {c.suspended_at && <> · suspendida el {fecha(c.suspended_at)}</>}
                  {" · último acceso "}
                  {haceCuanto(c.last_login_at)}
                </p>
                {c.invite_email_error && (
                  <p className={styles.warn} style={{ margin: "4px 0 0" }}>
                    ⚠️ El correo de invitación no salió ({c.invite_email_error}). La credencial existe pero el socio no lo
                    sabe — reenvíela desde <Link href="/bcp/socios">Red de Socios</Link>.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 34 }}>
        <div className={styles.sectionHead}>
          <h2>Por dónde entra</h2>
        </div>
        <p className={styles.meta}>
          Landing pública:{" "}
          <a href={origenDeSuperficie(`/socios/${partner.slug}`)} target="_blank" rel="noreferrer">
            {partner.slug}.ctcexport.com ↗
          </a>{" "}
          · Acceso:{" "}
          <a href={origenDeSuperficie(`/socios/${partner.slug}/acceso`)} target="_blank" rel="noreferrer">
            /acceso ↗
          </a>{" "}
          · Panel del socio:{" "}
          <a href={origenDeSuperficie(`/socios/${partner.slug}/panel`)} target="_blank" rel="noreferrer">
            /panel ↗
          </a>
        </p>
      </section>

      <section style={{ marginTop: 34 }}>
        <div className={styles.sectionHead}>
          <h2>Qué sella en el pasaporte</h2>
        </div>
        <p className={styles.meta} style={{ marginBottom: 10 }}>
          <b>{partner.sello}</b> — {partner.why}
        </p>
        <div className={styles.list}>
          {partner.screens.map(([nombre, desc]) => (
            <div key={nombre} className={styles.miniCard}>
              <h3 style={{ margin: 0 }}>{nombre}</h3>
              <p className={styles.meta} style={{ margin: "2px 0 0" }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
        <p className={styles.empty} style={{ marginTop: 12 }}>
          Estas pantallas son el módulo que este nodo tendrá, tomadas de la visión v3. Se construyen nodo a nodo cuando
          se trabaje su perfil — el Estudio de Contenido es el único que ya dejó de ser andamiaje.
        </p>
      </section>
    </div>
  );
}
