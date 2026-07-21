import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { replyToLead, setLeadStatus, retryWelcomeEmail, retryReplyEmail } from "../leadsActions";
import { LeadModalRow } from "./LeadModalRow";
import styles from "@/app/bcp/(app)/shared.module.css";

// Leads CTC Home: every "Escríbenos" / "Más allá de la exportación" submission
// becomes a lead with a platform account. One kanban board per service pillar
// (user-chosen layout); columns are the pipeline stages. Cards open a popup
// with the captured fields, account status, process connections and the email
// reply composer (first reply carries the temp password when we created the
// account on the lead's behalf).

type LeadRow = {
  id: string;
  pillar: string;
  status: string;
  nombre: string;
  email: string;
  message: string | null;
  fields: Record<string, unknown> | null;
  profile_id: string | null;
  account_provisioning: string;
  temp_password: string | null;
  welcome_sent_at: string | null;
  welcome_error: string | null;
  first_replied_at: string | null;
  created_at: string;
};

type ReplyRow = {
  id: string;
  lead_id: string;
  subject: string;
  body: string;
  includes_password: boolean;
  sent_at: string | null;
  send_error: string | null;
  created_at: string;
};

type ProfileRow = { id: string; role: string; full_name: string | null };
type PlatformNote = { id: string; lead_id: string | null; parent_id: string | null; note: string; author_role: string; created_at: string };

const PILLARS: { key: string; label: string; color: string; icon: string }[] = [
  { key: "general", label: "Escríbenos · Consulta general", color: "#3C0A86", icon: "✉️" },
  { key: "tech", label: "CTC Tech", color: "#003087", icon: "🔬" },
  { key: "cocreate", label: "CTC Co-Create", color: "#A87A14", icon: "🤝" },
  { key: "varietales", label: "Varietales Registrados", color: "#C8102F", icon: "🌱" },
];
const STATUSES: { key: string; label: string }[] = [
  { key: "nuevo", label: "Nuevo" },
  { key: "en_conversacion", label: "En conversación" },
  { key: "convertido", label: "Convertido" },
  { key: "cerrado", label: "Cerrado" },
];
const FIELD_LABEL: Record<string, string> = {
  org: "Organización",
  tema: "Tema",
  finca: "Finca",
  ubicacion: "Ubicación",
  interes: "Tecnologías de interés",
  marca: "Empresa / marca",
  mercado: "Mercado",
  canal: "Canal",
  formato: "Formato",
  vol: "Volumen (kg/año)",
  varietal: "Varietal",
  cantidad: "Chapolas",
};
const PROVISIONING_LABEL: Record<string, string> = {
  created_password: "Cuenta creada por CTC",
  created_google: "Cuenta creada vía Google",
  existing: "Cuenta existente",
};

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

// "hace 2 días" reads faster than a raw date when triaging a board.
function relTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  return fecha(iso);
}

// One-line pillar-specific hook so a card is scannable without opening it.
function hookLine(pillar: string, fields: Record<string, unknown>): string {
  const f = (k: string) => {
    const v = fields[k];
    return Array.isArray(v) ? v.join(", ") : v ? String(v) : "";
  };
  if (pillar === "tech") return f("interes") || f("finca");
  if (pillar === "cocreate") return [f("marca"), f("vol") && `${f("vol")} kg/año`].filter(Boolean).join(" · ");
  if (pillar === "varietales") return [f("varietal"), f("cantidad") && `${f("cantidad")} chapolas`].filter(Boolean).join(" · ");
  return f("org");
}

export default async function BcpLeadsPage() {
  const service = createServiceRoleClient();

  const { data: leadsData } = await service
    .from("leads")
    .select(
      "id, pillar, status, nombre, email, message, fields, profile_id, account_provisioning, temp_password, welcome_sent_at, welcome_error, first_replied_at, created_at"
    )
    .order("created_at", { ascending: false });
  const leads = (leadsData as LeadRow[] | null) ?? [];

  const profileIds = [...new Set(leads.map((l) => l.profile_id).filter((id): id is string => !!id))];
  const [{ data: repliesData }, { data: profilesData }, { data: fincaRows }, { data: lotRows }, { data: orderRows }] =
    await Promise.all([
      leads.length
        ? service
            .from("lead_replies")
            .select("id, lead_id, subject, body, includes_password, sent_at, send_error, created_at")
            .in("lead_id", leads.map((l) => l.id))
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] }),
      profileIds.length
        ? service.from("profiles").select("id, role, full_name").in("id", profileIds)
        : Promise.resolve({ data: [] }),
      profileIds.length
        ? service.from("fincas").select("producer_id").in("producer_id", profileIds)
        : Promise.resolve({ data: [] }),
      profileIds.length
        ? service.from("lots").select("producer_id").in("producer_id", profileIds)
        : Promise.resolve({ data: [] }),
      profileIds.length
        ? service.from("orders").select("buyer_id").in("buyer_id", profileIds)
        : Promise.resolve({ data: [] }),
    ]);

  const repliesByLead = new Map<string, ReplyRow[]>();
  for (const r of (repliesData as ReplyRow[] | null) ?? []) {
    repliesByLead.set(r.lead_id, [...(repliesByLead.get(r.lead_id) ?? []), r]);
  }

  // The in-platform side of the conversation: the mirrored notes carry
  // lead_id; the producer's own in-app replies hang off them via parent_id.
  const platformByLead = new Map<string, PlatformNote[]>();
  if (leads.length) {
    const { data: mirroredData } = await service
      .from("producer_comm_log")
      .select("id, lead_id, parent_id, note, author_role, created_at")
      .in("lead_id", leads.map((l) => l.id))
      .order("created_at", { ascending: true });
    const mirrored = (mirroredData as PlatformNote[] | null) ?? [];
    let all = mirrored;
    if (mirrored.length) {
      const { data: replyData } = await service
        .from("producer_comm_log")
        .select("id, lead_id, parent_id, note, author_role, created_at")
        .in("parent_id", mirrored.map((n) => n.id))
        .order("created_at", { ascending: true });
      all = [...mirrored, ...((replyData as PlatformNote[] | null) ?? [])];
    }
    const leadIdByNote = new Map(mirrored.map((n) => [n.id, n.lead_id!]));
    for (const n of all.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      const leadId = n.lead_id ?? (n.parent_id ? leadIdByNote.get(n.parent_id) : undefined);
      if (!leadId) continue;
      platformByLead.set(leadId, [...(platformByLead.get(leadId) ?? []), n]);
    }
  }
  const profileById = new Map(((profilesData as ProfileRow[] | null) ?? []).map((p) => [p.id, p]));
  const countBy = (rows: Record<string, unknown>[] | null, key: string) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const id = r[key] as string;
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  };
  const fincasByProfile = countBy(fincaRows as Record<string, unknown>[] | null, "producer_id");
  const lotsByProfile = countBy(lotRows as Record<string, unknown>[] | null, "producer_id");
  const ordersByProfile = countBy(orderRows as Record<string, unknown>[] | null, "buyer_id");
  const leadsByEmail = countBy(leads as unknown as Record<string, unknown>[], "email");

  const sinResponder = leads.filter((l) => l.status === "nuevo").length;

  return (
    <div>
      <h1 className={styles.title}>Leads CTC Home</h1>
      <p className={styles.subtitle}>
        Cada solicitud de &quot;Escríbenos&quot; y de &quot;Más allá de la exportación&quot; llega aquí con su cuenta de
        plataforma creada. Responda por correo desde la tarjeta — la primera respuesta entrega la contraseña cuando la
        cuenta la creó CTC.
      </p>

      <div className={styles.kpiGrid}>
        {PILLARS.map((p) => {
          const all = leads.filter((l) => l.pillar === p.key);
          const active = all.filter((l) => l.status !== "cerrado").length;
          return (
            <div key={p.key} className={styles.kpiCard}>
              <a href={`#board-${p.key}`}>
                <span className={styles.kpiTop}>
                  <span className={styles.kpiK}>{p.label}</span>
                  <span className={styles.kpiIcon}>{p.icon}</span>
                </span>
                <span className={styles.kpiV} style={{ color: all.length ? p.color : undefined, display: "block" }}>
                  {all.length}
                </span>
                <span className={styles.kpiMeter} style={{ display: "block" }}>
                  <span
                    className={styles.kpiMeterFill}
                    style={{ width: `${all.length ? Math.round((active / all.length) * 100) : 0}%`, background: p.color, display: "block" }}
                  />
                </span>
                <span className={styles.kpiSub}>{active} activos</span>
              </a>
            </div>
          );
        })}
        <div className={styles.kpiCard}>
          <span className={styles.kpiTop}>
            <span className={styles.kpiK}>Sin responder</span>
            <span className={styles.kpiIcon}>⏳</span>
          </span>
          <span className={styles.kpiV} style={{ color: sinResponder ? "#C4402F" : undefined }}>
            {sinResponder}
          </span>
          <span className={styles.kpiSub}>leads en &quot;Nuevo&quot;</span>
        </div>
      </div>

      {PILLARS.map((p) => {
        const pillarLeads = leads.filter((l) => l.pillar === p.key);
        return (
          <section key={p.key} id={`board-${p.key}`} style={{ marginTop: 30, scrollMarginTop: 12 }}>
            <div className={styles.sectionHead}>
              <h2 style={{ color: p.color }}>
                {p.icon} {p.label} ({pillarLeads.length})
              </h2>
            </div>
            {pillarLeads.length === 0 && (
              <p className={styles.empty}>Sin leads de {p.label} todavía.</p>
            )}
            {pillarLeads.length > 0 && (
            <div className={styles.board}>
              {STATUSES.map((s) => {
                const colLeads = pillarLeads.filter((l) => l.status === s.key);
                return (
                  <div className={styles.column} key={s.key}>
                    <div className={styles.columnHead}>
                      <h3>{s.label}</h3>
                      <span className={styles.columnCount}>{colLeads.length}</span>
                    </div>
                    <div className={styles.columnList}>
                      {colLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          pillarLabel={p.label}
                          replies={repliesByLead.get(lead.id) ?? []}
                          platformNotes={platformByLead.get(lead.id) ?? []}
                          profile={lead.profile_id ? profileById.get(lead.profile_id) : undefined}
                          fincaCount={lead.profile_id ? fincasByProfile.get(lead.profile_id) ?? 0 : 0}
                          lotCount={lead.profile_id ? lotsByProfile.get(lead.profile_id) ?? 0 : 0}
                          orderCount={lead.profile_id ? ordersByProfile.get(lead.profile_id) ?? 0 : 0}
                          siblingLeads={(leadsByEmail.get(lead.email) ?? 1) - 1}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function LeadCard({
  lead,
  pillarLabel,
  replies,
  platformNotes,
  profile,
  fincaCount,
  lotCount,
  orderCount,
  siblingLeads,
}: {
  lead: LeadRow;
  pillarLabel: string;
  replies: ReplyRow[];
  platformNotes: PlatformNote[];
  profile: ProfileRow | undefined;
  fincaCount: number;
  lotCount: number;
  orderCount: number;
  siblingLeads: number;
}) {
  const hasEmailError = !!lead.welcome_error || replies.some((r) => r.send_error);
  const fields = lead.fields ?? {};

  async function reply(formData: FormData) {
    "use server";
    await replyToLead(lead.id, formData);
  }
  async function changeStatus(formData: FormData) {
    "use server";
    await setLeadStatus(lead.id, formData);
  }
  async function retryWelcome() {
    "use server";
    await retryWelcomeEmail(lead.id);
  }

  const sectionHead = (label: string) => (
    <h4 style={{ margin: "16px 0 6px", fontSize: 13.5, borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>{label}</h4>
  );

  const hook = hookLine(lead.pillar, fields);
  const summary = (
    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13.5, color: "var(--ink)" }}>{lead.nombre}</b>
        {lead.temp_password && <span className={styles.badgeWarn}>Contraseña pendiente</span>}
        {hasEmailError && <span className={styles.badgeBad}>Error de correo</span>}
      </span>
      {hook && <span className={styles.meta} style={{ marginTop: 0 }}>{hook}</span>}
      <span className={styles.meta} style={{ marginTop: 0 }}>
        {lead.email} · {relTime(lead.created_at)}
        {replies.length > 0 && ` · ${replies.length} respuesta${replies.length === 1 ? "" : "s"}`}
      </span>
    </span>
  );

  return (
    <LeadModalRow title={`${lead.nombre} · ${pillarLabel}`} summary={summary} anchorId={`lead-${lead.id}`}>
      <p className={styles.meta} style={{ marginTop: 2 }}>
        {lead.email} · recibido el {fecha(lead.created_at)}
      </p>

      {sectionHead("Datos capturados")}
      {Object.entries(fields).map(([k, v]) => {
        const text = Array.isArray(v) ? v.join(", ") : String(v ?? "");
        if (!text) return null;
        return (
          <p key={k} className={styles.meta} style={{ margin: "3px 0" }}>
            {FIELD_LABEL[k] ?? k}: <b style={{ color: "var(--ink)" }}>{text}</b>
          </p>
        );
      })}
      {lead.message && (
        <p className={styles.meta} style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>
          &quot;{lead.message}&quot;
        </p>
      )}

      {sectionHead("Cuenta")}
      <p className={styles.meta} style={{ margin: 0 }}>
        <span className={lead.temp_password ? styles.badgeWarn : styles.badgeGood}>
          {PROVISIONING_LABEL[lead.account_provisioning] ?? lead.account_provisioning}
        </span>{" "}
        {lead.temp_password && "· la contraseña temporal viaja con la primera respuesta"}
        {lead.account_provisioning === "created_password" && !lead.temp_password && "· contraseña ya entregada"}
      </p>
      {profile && (
        <p className={styles.meta} style={{ margin: "4px 0 0" }}>
          Rol: <b>{profile.role}</b>
          {profile.full_name && <> · {profile.full_name}</>}
        </p>
      )}

      {sectionHead("Conexiones")}
      {profile?.role === "producer" ? (
        <p className={styles.meta} style={{ margin: 0 }}>
          <Link href="/bcp/fincas">{fincaCount} finca{fincaCount === 1 ? "" : "s"}</Link> ·{" "}
          <Link href="/bcp/lotes">{lotCount} lote{lotCount === 1 ? "" : "s"}</Link> ·{" "}
          <Link href="/bcp/productores">ver productor</Link>
        </p>
      ) : profile?.role === "buyer" ? (
        <p className={styles.meta} style={{ margin: 0 }}>
          {orderCount} pedido{orderCount === 1 ? "" : "s"} en Cherry Picked
        </p>
      ) : (
        <p className={styles.meta} style={{ margin: 0 }}>Sin cuenta vinculada.</p>
      )}
      {siblingLeads > 0 && (
        <p className={styles.meta} style={{ margin: "4px 0 0" }}>
          +{siblingLeads} lead{siblingLeads === 1 ? "" : "s"} más de este correo.
        </p>
      )}

      {sectionHead("Correos")}
      <p className={styles.meta} style={{ margin: 0 }}>
        Bienvenida:{" "}
        {lead.welcome_sent_at ? (
          <span className={styles.badgeGood}>Enviada {fecha(lead.welcome_sent_at)}</span>
        ) : (
          <span className={styles.badgeBad}>Falló{lead.welcome_error ? `: ${lead.welcome_error}` : ""}</span>
        )}
      </p>
      {!lead.welcome_sent_at && (
        <form action={retryWelcome} style={{ marginTop: 6 }}>
          <button className="btn btn-sm" type="submit">Reintentar bienvenida</button>
        </form>
      )}
      {replies.map((r) => (
        <div key={r.id} style={{ marginTop: 8, borderLeft: "2px solid var(--line)", paddingLeft: 10 }}>
          <p className={styles.meta} style={{ margin: 0 }}>
            <b style={{ color: "var(--ink)" }}>{r.subject}</b> · {fecha(r.created_at)}{" "}
            {r.sent_at ? (
              <span className={styles.badgeGood}>Enviada</span>
            ) : (
              <span className={styles.badgeBad}>Falló{r.send_error ? `: ${r.send_error}` : ""}</span>
            )}
            {r.includes_password && " · llevó la contraseña"}
          </p>
          <p className={styles.meta} style={{ margin: "3px 0 0", whiteSpace: "pre-wrap" }}>{r.body}</p>
          {!r.sent_at && (
            <form
              action={async () => {
                "use server";
                await retryReplyEmail(r.id);
              }}
              style={{ marginTop: 4 }}
            >
              <button className="btn btn-sm" type="submit">Reintentar envío</button>
            </form>
          )}
        </div>
      ))}

      {sectionHead("Conversación en la plataforma")}
      {platformNotes.length === 0 ? (
        <p className={styles.meta} style={{ margin: 0 }}>
          {profile?.role === "producer"
            ? "Sin mensajes en Kaffetal Regal todavía — los espejos de esta conversación y las respuestas in-app del productor aparecerán aquí."
            : "Solo los leads con cuenta de productor ven esta conversación dentro de Kaffetal Regal."}
        </p>
      ) : (
        platformNotes.map((n) => (
          <p key={n.id} className={styles.meta} style={{ margin: "3px 0" }}>
            <span className={n.author_role === "producer" ? styles.badgeGood : styles.badge}>
              {n.author_role === "producer" ? "Productor" : "CTC"}
            </span>{" "}
            {fecha(n.created_at)} · {n.note}
          </p>
        ))
      )}

      {sectionHead("Responder")}
      {lead.temp_password && (
        <p className={styles.warn} style={{ marginBottom: 6 }}>
          Este envío incluirá automáticamente la contraseña temporal de acceso del lead.
        </p>
      )}
      <form action={reply}>
        <div className={styles.field}>
          <label>Asunto</label>
          <input name="subject" required defaultValue={`Re: ${pillarLabel} · Colombian Trading Company`} />
        </div>
        <div className={styles.field}>
          <label>Mensaje</label>
          <textarea name="body" required rows={4} placeholder="Su respuesta llega al correo del lead…" />
          <p className={styles.meta} style={{ margin: "4px 0 0" }}>
            El saludo (&quot;Hola {lead.nombre}&quot;) y la firma de CTC se añaden automáticamente al correo.
          </p>
        </div>
        <button className="btn btn-sm btn-solid" type="submit">Enviar respuesta</button>
      </form>

      {sectionHead("Estado")}
      <form action={changeStatus} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select name="status" defaultValue={lead.status} style={{ maxWidth: 220 }}>
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <button className="btn btn-sm" type="submit">Guardar estado</button>
      </form>
    </LeadModalRow>
  );
}
