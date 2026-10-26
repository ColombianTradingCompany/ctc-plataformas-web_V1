"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBuzonTags, getBuzonAttachmentUrls, markInboundEmailRead } from "../buzonActions";
import shared from "@/components/panel/shared.module.css";
import styles from "./buzon.module.css";

export type InboundRow = {
  id: string;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  text_body: string | null;
  attachments: { filename: string | null; storage_path?: string }[] | null;
  tags: string[];
  status: "inbox" | "archived" | "deleted";
  replied_at: string | null;
  received_at: string;
  read_at: string | null;
};

const TABS = [
  { key: "inbox", label: "Recibidos" },
  { key: "archived", label: "Archivados" },
  { key: "deleted", label: "Papelera" },
] as const;

// Historial de solo lectura (D-013 5.4 · unificación P18): aquí se lista, se abre, se etiqueta, se marca leído/no leído y se ven
// los adjuntos. Responder, Reenviar, Archivar y Eliminar se retiraron — el correo se contesta en Gmail.
export function BuzonMail({ emails, myAddress }: { emails: InboundRow[]; myAddress: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("inbox");
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tagsDraft, setTagsDraft] = useState<string>("");
  const [tagsEditing, setTagsEditing] = useState(false);
  const [attachments, setAttachments] = useState<{ filename: string; url: string }[] | null>(null);

  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  // Tag counters for the CURRENT tab; the selected filter persists across tabs.
  const tabEmails = emails.filter((e) => e.status === tab);
  const tagCounts = new Map<string, number>();
  for (const e of tabEmails) for (const t of e.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const allTags = Array.from(new Set(emails.flatMap((e) => e.tags))).sort(
    (a, b) => (tagCounts.get(b) ?? 0) - (tagCounts.get(a) ?? 0) || a.localeCompare(b)
  );

  const list = tabEmails.filter((e) => tagFilter.length === 0 || e.tags.some((t) => tagFilter.includes(t)));
  const unread = emails.filter((e) => e.status === "inbox" && !e.read_at).length;

  function toggleTag(t: string) {
    setTagFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, onOk?: () => void) {
    setMsg(null);
    startTransition(async () => {
      let res: { ok: boolean; error?: string };
      try {
        res = await fn();
      } catch {
        res = { ok: false, error: "La acción no respondió. Revise su conexión y vuelva a intentarlo." };
      }
      if (res.ok) {
        setMsg({ ok: true, text: okText });
        onOk?.();
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Ocurrió un error." });
      }
    });
  }

  function open(e: InboundRow) {
    const next = openId === e.id ? null : e.id;
    setOpenId(next);
    setTagsEditing(false);
    setAttachments(null);
    if (next && !e.read_at) act(() => markInboundEmailRead(e.id, true), "");
  }

  return (
    <div>
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`} onClick={() => { setTab(t.key); setOpenId(null); }}>
            {t.label} ({t.key === "inbox" ? `${unread}/` : ""}{emails.filter((e) => e.status === t.key).length})
          </button>
        ))}
      </div>

      <div className={styles.tagBar}>
        <button className={styles.tagToggle} onClick={() => setTagsOpen((v) => !v)}>
          Etiquetas {tagsOpen ? "▾" : "▸"}
          {tagFilter.length > 0 && <span className={styles.tagFilterCount}>{tagFilter.length} activa{tagFilter.length === 1 ? "" : "s"}</span>}
        </button>
        {tagsOpen && (
          <div className={styles.tagButtons}>
            {allTags.map((t) => (
              <button
                key={t}
                className={`${styles.tagBtn} ${tagFilter.includes(t) ? styles.tagBtnActive : ""}`}
                onClick={() => toggleTag(t)}
              >
                {t} <span className={styles.tagCount}>{tagCounts.get(t) ?? 0}</span>
              </button>
            ))}
            {tagFilter.length > 0 && (
              <button className={styles.tagClear} onClick={() => setTagFilter([])}>
                × limpiar filtro
              </button>
            )}
          </div>
        )}
      </div>

      {msg && msg.text && <p className={msg.ok ? styles.syncOk : styles.syncErr} style={{ marginBottom: 12 }}>{msg.text}</p>}

      {!list.length && (
        <p className={shared.empty}>
          {tab === "inbox"
            ? myAddress
              ? "Aún no hay correos dirigidos a tu dirección."
              : "Bandeja vacía."
            : "Nada por aquí."}
        </p>
      )}

      <div className={styles.list}>
        {list.map((e) => (
          <div key={e.id} className={`${styles.mail} ${e.read_at ? styles.mailRead : ""}`}>
            <button className={styles.summary} onClick={() => open(e)} style={{ width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer" }}>
              <span className={styles.from}>{e.from_email ?? "(remitente desconocido)"}</span>
              <span className={styles.subject}>
                {e.subject ?? "(sin asunto)"}
                {e.tags.map((t) => (
                  <span key={t} className={styles.tagChip}>{t}</span>
                ))}
              </span>
              <span className={styles.date}>{new Date(e.received_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</span>
              {e.replied_at && <span className={`${shared.badge} ${shared.badgeGood}`}>Respondido</span>}
              {!e.read_at && e.status === "inbox" && <span className={`${shared.badge} ${shared.badgeWarn}`}>Nuevo</span>}
            </button>

            {openId === e.id && (
              <div className={styles.body}>
                <p className={styles.meta}>Para: {e.to_email ?? "—"}</p>
                <pre className={styles.text}>{e.text_body ?? "(sin cuerpo de texto)"}</pre>

                {!!e.attachments?.length && (
                  <div className={styles.meta}>
                    {attachments ? (
                      attachments.length ? (
                        <>Adjuntos: {attachments.map((a) => (
                          <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className={styles.attLink}>{a.filename}</a>
                        ))}</>
                      ) : (
                        "Adjuntos no disponibles en el archivo."
                      )
                    ) : (
                      <button className="btn btn-sm" disabled={pending} onClick={() => startTransition(async () => setAttachments(await getBuzonAttachmentUrls(e.id)))}>
                        Ver adjuntos ({e.attachments.length})
                      </button>
                    )}
                  </div>
                )}

                <div className={styles.actionsRow}>
                  {!tagsEditing ? (
                    <button className="btn btn-sm" onClick={() => { setTagsEditing(true); setTagsDraft(e.tags.join(", ")); }}>Etiquetas</button>
                  ) : null}
                  <button className="btn btn-sm" disabled={pending} onClick={() => act(() => markInboundEmailRead(e.id, !e.read_at), e.read_at ? "Marcado como no leído." : "Marcado como leído.")}>
                    {e.read_at ? "Marcar no leído" : "Marcar leído"}
                  </button>
                </div>

                {tagsEditing && (
                  <div className={styles.tagsEditor}>
                    <input
                      value={tagsDraft}
                      onChange={(ev) => setTagsDraft(ev.target.value)}
                      placeholder="etiquetas separadas por coma (ej: gvg, socios, urgente)"
                      aria-label="Etiquetas"
                    />
                    <button className="btn btn-sm" disabled={pending} onClick={() => act(() => setBuzonTags(e.id, tagsDraft.split(",")), "Etiquetas guardadas.", () => setTagsEditing(false))}>
                      Guardar
                    </button>
                    <button className="btn btn-sm" type="button" onClick={() => setTagsEditing(false)}>Cancelar</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
