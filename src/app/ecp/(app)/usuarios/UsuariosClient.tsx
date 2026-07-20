"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CONSOLE_ORDER, CONSOLES, type PanelConsoleKey } from "@/lib/panel/consoles";
import type { PanelUserRow, ConsoleLevel } from "@/lib/panel/panelUsers";
import {
  invitePanelUser,
  suspendPanelUser,
  reactivatePanelUser,
  resendPanelInvite,
  resetPanelUserPassword,
  updateDeliveryEmail,
} from "../usuariosActions";
// El stylesheet compartido de las consolas vive bajo bcp/(app) por historia;
// es de la CAPA de panel, no exclusivo del BCP. Se importa por ruta absoluta en
// vez de renombrarlo (lo importan 29 archivos del BCP que no tienen por qué moverse).
import shared from "@/app/bcp/(app)/shared.module.css";
import styles from "@/components/panel/credentials.module.css";

const STATUS_BADGE: Record<PanelUserRow["status"], string> = {
  active: shared.badgeGood,
  invited: shared.badgeWarn,
  suspended: shared.badgeBad,
};
const STATUS_LABEL: Record<PanelUserRow["status"], string> = {
  active: "Activo",
  invited: "Invitado",
  suspended: "Suspendido",
};

type LevelMap = Record<PanelConsoleKey, "" | ConsoleLevel>;
const EMPTY_LEVELS: LevelMap = { bcp: "", ecp: "", ocp: "" };

export function UsuariosClient({ users, currentUserId }: { users: PanelUserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [email, setEmail] = useState("");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [levels, setLevels] = useState<LevelMap>(EMPTY_LEVELS);

  // Per-row delivery-email editor: which row is open and its draft value.
  const [deliveryEdit, setDeliveryEdit] = useState<{ id: string; value: string } | null>(null);

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
      () => invitePanelUser({ email, deliveryEmail, displayName, consoles: levels }),
      "Invitación enviada.",
      () => {
        setEmail("");
        setDeliveryEmail("");
        setDisplayName("");
        setLevels(EMPTY_LEVELS);
      }
    );
  }

  const hasAnyGrant = CONSOLE_ORDER.some((k) => levels[k]);

  return (
    <div>
      <h1 className={shared.title}>Usuarios y credenciales</h1>
      <p className={shared.subtitle}>
        El equipo interno de CTC. Cada credencial nace aquí y se concede por consola (BCP / ECP / OCP). Los productores y
        compradores NO se gestionan desde acá — son cuentas públicas de auto-registro.
      </p>

      {msg && <p className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>{msg.text}</p>}

      {/* Invite */}
      <form className={styles.inviteCard} onSubmit={submitInvite}>
        <h2 className={styles.inviteTitle}>Invitar colaborador</h2>
        <div className={shared.formGrid}>
          <div className={shared.field}>
            <label htmlFor="inv-email">Usuario de acceso (correo)</label>
            <input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <p className={styles.hint}>
              Puede ser una dirección @ctcexport.com sin buzón — es solo la identidad de acceso.
            </p>
          </div>
          <div className={shared.field}>
            <label htmlFor="inv-name">Nombre</label>
            <input id="inv-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
        </div>
        <div className={shared.field}>
          <label htmlFor="inv-delivery">Correo de entrega (buzón real)</label>
          <input
            id="inv-delivery"
            type="email"
            value={deliveryEmail}
            onChange={(e) => setDeliveryEmail(e.target.value)}
            placeholder="Donde recibirá la invitación, los códigos de acceso y los restablecimientos"
          />
          <p className={styles.hint}>
            Si lo dejas vacío, todo llega al usuario de acceso — en ese caso ese correo SÍ debe ser un buzón real.
          </p>
        </div>

        <p className={styles.grantsLabel}>Consolas</p>
        <div className={styles.grants}>
          {CONSOLE_ORDER.map((k) => (
            <div key={k} className={styles.grantRow}>
              <div className={styles.grantName}>
                <span className={styles.grantCode} style={{ color: CONSOLES[k].accent }}>
                  {CONSOLES[k].code}
                </span>
                <span>{CONSOLES[k].name}</span>
              </div>
              <select
                value={levels[k]}
                onChange={(e) => setLevels((prev) => ({ ...prev, [k]: e.target.value as "" | ConsoleLevel }))}
                aria-label={`Nivel para ${CONSOLES[k].code}`}
              >
                <option value="">Sin acceso</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          ))}
        </div>

        <button className="btn btn-solid" type="submit" disabled={pending || !email || !hasAnyGrant} style={{ marginTop: 4 }}>
          {pending ? "Enviando…" : "Invitar y enviar acceso"}
        </button>
      </form>

      {/* List */}
      <div className={styles.list}>
        {users.map((u) => {
          const isSelf = u.profile_id === currentUserId;
          const grants = CONSOLE_ORDER.filter((k) => u.consoles?.[k]);
          const editingThis = deliveryEdit?.id === u.profile_id;
          return (
            <div key={u.profile_id} className={styles.userRow}>
              <div className={styles.userMain}>
                <div className={styles.userTop}>
                  <span className={styles.userName}>{u.display_name || u.email}</span>
                  {u.is_owner && <span className={styles.ownerBadge}>Owner</span>}
                  <span className={`${shared.badge} ${STATUS_BADGE[u.status]}`}>{STATUS_LABEL[u.status]}</span>
                </div>
                <div className={styles.userEmail}>{u.email}</div>
                <div className={styles.deliveryLine}>
                  {editingThis ? (
                    <span className={styles.deliveryEditor}>
                      <input
                        type="email"
                        value={deliveryEdit.value}
                        onChange={(e) => setDeliveryEdit({ id: u.profile_id, value: e.target.value })}
                        placeholder="Buzón real (vacío = el usuario de acceso)"
                        aria-label="Correo de entrega"
                      />
                      <button
                        className="btn btn-sm"
                        disabled={pending}
                        onClick={() =>
                          act(() => updateDeliveryEmail(u.profile_id, deliveryEdit.value), "Correo de entrega actualizado.", () =>
                            setDeliveryEdit(null)
                          )
                        }
                      >
                        Guardar
                      </button>
                      <button className="btn btn-sm" type="button" onClick={() => setDeliveryEdit(null)}>
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <>
                      <span>Códigos y avisos → {u.delivery_email ?? u.email}</span>
                      <button
                        className={styles.linkBtn}
                        type="button"
                        onClick={() => setDeliveryEdit({ id: u.profile_id, value: u.delivery_email ?? "" })}
                      >
                        Cambiar
                      </button>
                    </>
                  )}
                </div>
                <div className={styles.chips}>
                  {grants.length ? (
                    grants.map((k) => (
                      <span key={k} className={styles.chip} style={{ borderColor: CONSOLES[k].accent }}>
                        {CONSOLES[k].code} · {u.consoles[k]}
                      </span>
                    ))
                  ) : (
                    <span className={styles.noChip}>Sin consolas</span>
                  )}
                </div>
                {u.invite_email_error && (
                  <div className={styles.emailErr}>El correo de invitación falló: {u.invite_email_error}</div>
                )}
              </div>

              <div className={styles.userActions}>
                {u.status === "invited" && (
                  <button
                    className="btn btn-sm"
                    disabled={pending}
                    onClick={() => act(() => resendPanelInvite(u.profile_id), "Invitación reenviada.")}
                  >
                    Reenviar invitación
                  </button>
                )}
                {u.status === "active" && (
                  <button
                    className="btn btn-sm"
                    disabled={pending}
                    onClick={() =>
                      act(() => resetPanelUserPassword(u.profile_id), "Contraseña restablecida y enviada a su correo de entrega.")
                    }
                  >
                    Restablecer contraseña
                  </button>
                )}
                {u.status === "suspended" ? (
                  <button
                    className="btn btn-sm"
                    disabled={pending}
                    onClick={() => act(() => reactivatePanelUser(u.profile_id), "Cuenta reactivada.")}
                  >
                    Reactivar
                  </button>
                ) : (
                  <button
                    className="btn btn-sm"
                    disabled={pending || isSelf}
                    title={isSelf ? "No puedes suspender tu propia cuenta." : undefined}
                    onClick={() => act(() => suspendPanelUser(u.profile_id), "Cuenta suspendida.")}
                  >
                    Suspender
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
