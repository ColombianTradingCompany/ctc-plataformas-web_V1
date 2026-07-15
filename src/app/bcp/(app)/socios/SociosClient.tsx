"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PARTNERS, PARTNER_SLUGS } from "@/lib/partners/partners";
import { invitePartner, setPartnerStatus, resendPartnerCredential } from "../sociosActions";
import shared from "../shared.module.css";
import styles from "../usuarios/usuarios.module.css";

export type PartnerRow = {
  profile_id: string;
  email: string;
  org_name: string;
  contact_name: string | null;
  node_type: string;
  status: "invited" | "active" | "suspended";
  last_login_at: string | null;
  invite_email_error: string | null;
  created_at: string;
};

const STATUS_BADGE: Record<PartnerRow["status"], string> = {
  active: shared.badgeGood,
  invited: shared.badgeWarn,
  suspended: shared.badgeBad,
};
const STATUS_LABEL: Record<PartnerRow["status"], string> = {
  active: "Activo",
  invited: "Invitado",
  suspended: "Suspendido",
};

export function SociosClient({ partners }: { partners: PartnerRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [node, setNode] = useState<string>(PARTNER_SLUGS[0]);

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, onOk?: () => void) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg({ ok: true, text: okText });
        onOk?.();
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Ocurrió un error." });
      }
    });
  }

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    act(
      () => invitePartner({ email, orgName, contactName, node }),
      "Credencial emitida y enviada.",
      () => {
        setEmail("");
        setOrgName("");
        setContactName("");
      }
    );
  }

  return (
    <div>
      <h1 className={shared.title}>Socios de la red</h1>
      <p className={shared.subtitle}>
        Las credenciales de los 5 nodos partner (v3). Cada una abre únicamente su módulo en /socios/&lt;nodo&gt; — nunca es
        una cuenta interna ni pública. Se emiten aquí y se revocan en un clic.
      </p>

      {msg && <p className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>{msg.text}</p>}

      <form className={styles.inviteCard} onSubmit={submitInvite}>
        <h2 className={styles.inviteTitle}>Emitir credencial de socio</h2>
        <div className={shared.formGrid}>
          <div className={shared.field}>
            <label htmlFor="soc-node">Nodo</label>
            <select id="soc-node" value={node} onChange={(e) => setNode(e.target.value)}>
              {PARTNER_SLUGS.map((s) => (
                <option key={s} value={s}>
                  {PARTNERS[s].name}
                </option>
              ))}
            </select>
          </div>
          <div className={shared.field}>
            <label htmlFor="soc-org">Organización</label>
            <input id="soc-org" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
          </div>
          <div className={shared.field}>
            <label htmlFor="soc-email">Correo (su buzón real)</label>
            <input id="soc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className={shared.field}>
            <label htmlFor="soc-contact">Persona de contacto</label>
            <input id="soc-contact" type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-solid" type="submit" disabled={pending || !email || !orgName}>
          {pending ? "Emitiendo…" : "Emitir y enviar credencial"}
        </button>
      </form>

      <div className={styles.list}>
        {partners.map((u) => {
          const p = PARTNERS[u.node_type as keyof typeof PARTNERS];
          return (
            <div key={u.profile_id} className={styles.userRow}>
              <div className={styles.userMain}>
                <div className={styles.userTop}>
                  <span className={styles.userName}>{u.org_name}</span>
                  <span className={styles.chip} style={{ borderColor: p?.accent }}>
                    {p?.name ?? u.node_type}
                  </span>
                  <span className={`${shared.badge} ${STATUS_BADGE[u.status]}`}>{STATUS_LABEL[u.status]}</span>
                </div>
                <div className={styles.userEmail}>
                  {u.contact_name ? `${u.contact_name} · ` : ""}
                  {u.email}
                  {u.last_login_at ? ` · último ingreso ${new Date(u.last_login_at).toLocaleDateString("es-CO")}` : ""}
                </div>
                {u.invite_email_error && <div className={styles.emailErr}>El correo falló: {u.invite_email_error}</div>}
              </div>
              <div className={styles.userActions}>
                {u.status !== "suspended" && (
                  <button
                    className="btn btn-sm"
                    disabled={pending}
                    onClick={() =>
                      act(
                        () => resendPartnerCredential(u.profile_id),
                        u.status === "invited" ? "Invitación reenviada." : "Contraseña restablecida y enviada."
                      )
                    }
                  >
                    {u.status === "invited" ? "Reenviar invitación" : "Restablecer contraseña"}
                  </button>
                )}
                {u.status === "suspended" ? (
                  <button className="btn btn-sm" disabled={pending} onClick={() => act(() => setPartnerStatus(u.profile_id, "active"), "Credencial reactivada.")}>
                    Reactivar
                  </button>
                ) : (
                  <button className="btn btn-sm" disabled={pending} onClick={() => act(() => setPartnerStatus(u.profile_id, "suspended"), "Credencial suspendida.")}>
                    Suspender
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!partners.length && <p className={shared.empty}>Aún no hay credenciales de socio emitidas.</p>}
      </div>
    </div>
  );
}
