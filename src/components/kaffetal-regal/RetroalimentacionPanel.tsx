"use client";

import { useState } from "react";
import { ctcLotReferenceShort, type Finca, type FeedbackNote, type Lot, type ProducerContract } from "./data";
import appStyles from "./AppDashboard.module.css";
import styles from "./RetroalimentacionPanel.module.css";

// "Retroalimentación y ayuda": rediseño de dos paneles (2026-07-24) --
// lista de hilos a la izquierda (plegable/deslizable), conversación del hilo
// activo a la derecha, y un botón "Nuevo hilo" que arranca una conversación
// con un título propio, opcionalmente vinculada a una finca/lote/contrato.
// Cada "hilo" sigue siendo, como antes, un grupo de notas que comparten el
// mismo contextLabel -- lo nuevo es que ese label ahora también puede venir
// de un título que el productor escribió, no solo de "Finca X"/"Ficha Y".

type ThreadEntry = { key: string; notes: FeedbackNote[] };

function groupFeedback(feedback: FeedbackNote[]): ThreadEntry[] {
  const order: string[] = [];
  const byKey = new Map<string, FeedbackNote[]>();
  for (const n of feedback) {
    const key = n.contextLabel ?? "General";
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(n);
  }
  return order.map((key) => ({ key, notes: byKey.get(key)!.slice().reverse() }));
}

type LinkType = "finca" | "lote" | "contrato";
type Link = { type: LinkType; id: string } | null;

export function RetroalimentacionPanel({
  feedback,
  fincas,
  lots,
  contracts,
  composeOpen,
  onCloseCompose,
  onReplyToFeedback,
  onAcknowledgeNote,
  onCreateThread,
  onOpenFicha,
  onOpenFincaModal,
}: {
  feedback: FeedbackNote[];
  fincas: Finca[];
  lots: Lot[];
  contracts: ProducerContract[];
  composeOpen: boolean;
  onCloseCompose: () => void;
  onReplyToFeedback: (parent: FeedbackNote, text: string) => void;
  onAcknowledgeNote: (noteId: string, ack: boolean) => void;
  onCreateThread: (title: string, link: Link, message: string) => Promise<boolean>;
  onOpenFicha: (lotId: string) => void;
  onOpenFincaModal: (index: number) => void;
}) {
  const threads = groupFeedback(feedback);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [replyText, setReplyText] = useState("");

  const activeKey = selectedKey && threads.some((t) => t.key === selectedKey) ? selectedKey : threads[0]?.key ?? null;
  const active = threads.find((t) => t.key === activeKey) ?? null;

  function selectThread(key: string) {
    setSelectedKey(key);
    setReplyText("");
  }

  function openTarget(n: FeedbackNote) {
    if (n.lotId) {
      onOpenFicha(n.lotId);
      return;
    }
    if (n.fincaId) {
      const idx = fincas.findIndex((f) => f.id === n.fincaId);
      if (idx >= 0) onOpenFincaModal(idx);
    }
  }

  function submitReply() {
    const text = replyText.trim();
    if (!text || !active) return;
    const parent = [...active.notes].reverse().find((n) => n.authorRole === "bcp") ?? active.notes[active.notes.length - 1];
    if (!parent) return;
    onReplyToFeedback(parent, text);
    setReplyText("");
  }

  return (
    <div className={`${appStyles.acard} ${appStyles.full}`} style={{ padding: 0, overflow: "hidden" }}>
      <div className={styles.wrap}>
        <div className={`${styles.list} ${listOpen ? "" : styles.listClosed}`}>
          <div className={styles.listHead}>
            <span>Retroalimentación y ayuda · notas de CTC</span>
          </div>
          <div className={styles.listBody}>
            {threads.length === 0 ? (
              <div className={styles.empty}>Sin notas todavía. Cree su primer hilo con «Nuevo hilo».</div>
            ) : (
              threads.map((t) => {
                const target = t.notes.find((n) => n.lotId || n.fincaId);
                const unread = t.notes.filter((n) => n.authorRole === "bcp" && !n.acknowledgedAt).length;
                return (
                  <button
                    key={t.key}
                    type="button"
                    className={`${styles.threadRow} ${t.key === activeKey ? styles.threadRowActive : ""}`}
                    onClick={() => selectThread(t.key)}
                  >
                    <span className={styles.threadRowTitle}>
                      {t.key}
                      {target ? (
                        <button
                          type="button"
                          className={styles.jumpBtn}
                          aria-label={`Abrir ${t.key}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openTarget(target);
                          }}
                        >
                          ↗
                        </button>
                      ) : null}
                    </span>
                    <span className={unread > 0 ? styles.countAlert : styles.count}>{t.notes.length}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Pestaña para plegar/desplegar la lista -- se desliza horizontalmente
            en vez de ocupar espacio fijo cuando no hace falta. */}
        <button
          type="button"
          className={styles.toggleTab}
          onClick={() => setListOpen((v) => !v)}
          aria-label={listOpen ? "Ocultar la lista de hilos" : "Mostrar la lista de hilos"}
          aria-expanded={listOpen}
        >
          {listOpen ? "‹" : "›"}
        </button>

        <div className={styles.conversation}>
          {active ? (
            <>
              <div className={styles.convoHead}>
                <h4>{active.key}</h4>
              </div>
              <div className={styles.convoBody}>
                {active.notes.map((n) => (
                  <div key={n.id} className={n.authorRole === "producer" ? styles.bubbleMine : styles.bubbleCtc}>
                    <b>{n.authorRole === "producer" ? "Usted" : "CTC"}</b>{" "}
                    <span className={styles.bubbleDate}>{new Date(n.createdAt).toLocaleDateString("es-CO")}</span>
                    <p>{n.note}</p>
                    {n.authorRole === "bcp" && (
                      <label className={styles.ackRow}>
                        <input type="checkbox" checked={!!n.acknowledgedAt} onChange={(e) => onAcknowledgeNote(n.id, e.target.checked)} />{" "}
                        Entendido
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <div className={styles.convoReply}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escriba su respuesta a CTC…"
                  rows={2}
                />
                <button className="btn btn-sm btn-solid" onClick={submitReply} disabled={!replyText.trim()}>
                  Enviar
                </button>
              </div>
            </>
          ) : (
            <div className={styles.empty}>Seleccione un hilo, o cree uno nuevo con «Nuevo hilo».</div>
          )}
        </div>
      </div>

      {composeOpen && (
        <ComposeThreadModal
          fincas={fincas}
          lots={lots}
          contracts={contracts}
          onClose={onCloseCompose}
          onCreate={async (title, link, message) => {
            const ok = await onCreateThread(title, link, message);
            if (ok) {
              setSelectedKey(title.trim());
              onCloseCompose();
            }
            return ok;
          }}
        />
      )}
    </div>
  );
}

function ComposeThreadModal({
  fincas,
  lots,
  contracts,
  onClose,
  onCreate,
}: {
  fincas: Finca[];
  lots: Lot[];
  contracts: ProducerContract[];
  onClose: () => void;
  onCreate: (title: string, link: Link, message: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [linkType, setLinkType] = useState<"" | LinkType>("");
  const [linkId, setLinkId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !message.trim()) return;
    setBusy(true);
    const link: Link = linkType && linkId ? { type: linkType, id: linkId } : null;
    const ok = await onCreate(title, link, message);
    setBusy(false);
    if (!ok) return;
  }

  return (
    <div className={styles.modalScrim} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Nuevo hilo</h3>
        <label htmlFor="nh-title">Título de la conversación</label>
        <input id="nh-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Pregunta sobre mi próximo despacho" autoFocus />

        <label htmlFor="nh-link-type">Vincular a (opcional)</label>
        <select
          id="nh-link-type"
          value={linkType}
          onChange={(e) => {
            setLinkType(e.target.value as "" | LinkType);
            setLinkId("");
          }}
        >
          <option value="">Sin vincular</option>
          <option value="lote">Lote</option>
          <option value="finca">Finca</option>
          <option value="contrato">Contrato</option>
        </select>

        {linkType === "lote" && (
          <select value={linkId} onChange={(e) => setLinkId(e.target.value)} aria-label="Elegir lote">
            <option value="">— Elija un lote —</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {ctcLotReferenceShort(l.id)}
              </option>
            ))}
          </select>
        )}
        {linkType === "finca" && (
          <select value={linkId} onChange={(e) => setLinkId(e.target.value)} aria-label="Elegir finca">
            <option value="">— Elija una finca —</option>
            {fincas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
        {linkType === "contrato" && (
          <select value={linkId} onChange={(e) => setLinkId(e.target.value)} aria-label="Elegir contrato">
            <option value="">— Elija un contrato —</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lotName} · {ctcLotReferenceShort(c.lotId)}
              </option>
            ))}
          </select>
        )}

        <label htmlFor="nh-msg">Mensaje</label>
        <textarea id="nh-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Escriba su mensaje para CTC…" />

        <div className={styles.modalActions}>
          <button className="btn btn-sm btn-solid" onClick={submit} disabled={busy || !title.trim() || !message.trim()}>
            {busy ? "Creando…" : "Crear hilo"}
          </button>
          <button className="btn btn-sm" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
