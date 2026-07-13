"use client";

import { useState } from "react";
import Image from "next/image";
import { CONTRACT_STATUS_LABEL, GRADES, STAGES, ctcLotReference, ctcLotReferenceShort, fincaCode, fincaSelfDeletable, type Finca, type GeneralInfo, type Lot, type ProducerContract, type FeedbackNote } from "./data";
import { mapPreviewUrl, fincaEudrStatus } from "@/lib/eudr";
import { EudrStatusBadge } from "./EudrStatusBadge";
import { LotCompletionSparkline } from "./LotCompletionSparkline";
import { LotKanbanStepper } from "./LotKanbanStepper";
import styles from "./AppDashboard.module.css";

// A conversation thread = every note (CTC notes + the producer's replies)
// sharing one hyperlinked element (Finca X / Lote Y / General). Notes arrive
// newest-first; within a thread we show them oldest-first so it reads top to
// bottom in time. Groups stay in most-recent-activity order.
type FeedbackThreadEntry = { key: string; notes: FeedbackNote[] };
function groupFeedback(feedback: FeedbackNote[]): FeedbackThreadEntry[] {
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

// The reference is long, so only the 7 characters that actually go on the
// physical sample package are bolded -- same convention used in the Ficha.
function CtcRef({ id }: { id: string }) {
  const ref = ctcLotReference(id);
  const short = ctcLotReferenceShort(id);
  const idx = ref.indexOf(short);
  return <span className="mono">{ref.slice(0, idx)}<b style={{ color: "var(--ink)" }}>{short}</b>{ref.slice(idx + short.length)}</span>;
}

export function AppDashboard({
  userName,
  lots,
  fincas,
  gi,
  contracts,
  feedback,
  onBackHome,
  onLogout,
  onNewLot,
  onOpenFicha,
  onRenameLot,
  onDeleteLot,
  onOpenFincaModal,
  onDeleteFinca,
  onRequestFincaRevision,
  onReplyToFeedback,
  onAcknowledgeNote,
  onOpenInfoModal,
  onConfirmSampleShipped,
}: {
  userName: string;
  lots: Lot[];
  fincas: Finca[];
  gi: GeneralInfo;
  contracts: ProducerContract[];
  feedback: FeedbackNote[];
  onBackHome: () => void;
  onLogout: () => void;
  onNewLot: () => void;
  onOpenFicha: (lotId: string) => void;
  onRenameLot: (lotId: string, newName: string) => void;
  onDeleteLot: (lotId: string) => void;
  onOpenFincaModal: (index: number) => void;
  onDeleteFinca: (fincaId: string) => void;
  onRequestFincaRevision: (finca: Finca) => void;
  onReplyToFeedback: (parent: FeedbackNote, text: string) => void;
  onAcknowledgeNote: (noteId: string, ack: boolean) => void;
  onOpenInfoModal: () => void;
  onConfirmSampleShipped: (lotId: string) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  // Reply is per conversation thread (per hyperlinked element), keyed by the
  // thread key; and threads can be collapsed.
  const [replyThreadKey, setReplyThreadKey] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function submitThreadReply(threadKey: string, notes: FeedbackNote[]) {
    const text = replyText.trim();
    if (!text) return;
    // The reply attaches to the thread; parent_id (required by RLS) points at
    // the thread's most recent CTC note, falling back to its most recent note.
    const parent = [...notes].reverse().find((n) => n.authorRole === "bcp") ?? notes[notes.length - 1];
    if (!parent) return;
    onReplyToFeedback(parent, text);
    setReplyThreadKey(null);
    setReplyText("");
  }

  const certified = lots.filter((l) => l.stage >= 5);

  function startRename(l: Lot) {
    setRenamingId(l.id);
    setRenameValue(l.name);
  }
  function saveRename(id: string) {
    if (renameValue.trim()) onRenameLot(id, renameValue.trim());
    setRenamingId(null);
  }

  // A feedback group's notes were all left from the same finca/lote card, so
  // any note carrying a fincaId/lotId is enough to resolve where the group's
  // heading link should go -- there's no in-app route to jump to for a
  // finca/lot, so this reuses the same modal/view-switch handlers the cards
  // themselves use, rather than a real <a href>.
  function openFeedbackTarget(n: FeedbackNote) {
    if (n.lotId) {
      onOpenFicha(n.lotId);
      return;
    }
    if (n.fincaId) {
      const idx = fincas.findIndex((f) => f.id === n.fincaId);
      if (idx >= 0) onOpenFincaModal(idx);
    }
  }

  return (
    <div>
      <div className={styles.appTop}>
        <div className={`wrap ${styles.nav}`}>
          <a href="#" className={styles.brand} onClick={(e) => { e.preventDefault(); onBackHome(); }}>
            <Image className={styles.krl} src="/images/shared/kaffetal-regal-logo.png" alt="Kaffetal Regal" width={1254} height={1254} />
            <span>
              <span className={styles.name}>Kaffetal Regal</span>
              <span className={styles.by}>Panel del productor · by CTC</span>
            </span>
          </a>
          <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={onBackHome}>← Inicio</button>
          <button className="btn btn-sm" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </div>

      <div className={`wrap ${styles.main}`}>
        <p className="eyebrow">Panel del productor</p>
        <h1 className={styles.h1}>Buenos días, {userName}</h1>
        <div className={styles.ag}>
          <div className={styles.acard}>
            <span className={styles.k}>Información general · se registra una sola vez</span>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 8 }}>
              {gi.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                <img src={gi.avatarUrl} alt={gi.agri} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--line)" }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--paper)", border: "1.5px dashed var(--line)", flexShrink: 0 }} />
              )}
              <div className={styles.alist}>
                Razón social: <b>{gi.razon}</b><br />
                NIT / CC: <b>{gi.nit}</b><br />
                Agricultor: <b>{gi.agri}</b>
              </div>
            </div>
            {gi.galleryUrls.filter(Boolean).length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {gi.galleryUrls.filter(Boolean).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                  <img key={i} src={url} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover", border: "1px solid var(--line)" }} />
                ))}
              </div>
            )}
            <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={onOpenInfoModal}>Editar información</button>
          </div>

          <div className={styles.acard}>
            <span className={styles.k}>Envío de muestras · 2 kg pergamino por lote</span>
            <div className={styles.alist} style={{ marginTop: 6 }}>
              <b>CTC · Cra. 4 #8N-30, vía Guatiguará, casa 205, conjunto campestre Santillana · Piedecuesta, Santander · Colombia</b><br />
              Marque el paquete con el código del lote. El envío corre por su cuenta; con la muestra recibida, el lote entra en fila para la Arena.
            </div>
          </div>

          <div className={`${styles.acard} ${styles.tall}`}>
            <span className={styles.k}>Retroalimentación y ayuda · notas de CTC</span>
            {feedback.length === 0 ? (
              <div className={styles.alist} style={{ marginTop: 8 }}>Sin notas todavía. Aquí verá lo que CTC le comunique sobre sus fincas y lotes.</div>
            ) : (
              groupFeedback(feedback).map(({ key, notes }) => {
                const target = notes.find((n) => n.lotId || n.fincaId);
                const isCollapsed = collapsed[key];
                return (
                  <div key={key} className={styles.thread}>
                    <div className={styles.threadHead}>
                      <button
                        type="button"
                        className={styles.threadToggle}
                        aria-expanded={!isCollapsed}
                        onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
                      >
                        {isCollapsed ? "▸" : "▾"}
                      </button>
                      {target ? (
                        <button type="button" className={styles.feedbackLink} onClick={() => openFeedbackTarget(target)}>
                          {key} ↗
                        </button>
                      ) : (
                        <span className={styles.threadTitle}>{key}</span>
                      )}
                      <span className={styles.threadCount}>{notes.length}</span>
                    </div>

                    {!isCollapsed && (
                      <>
                        {notes.map((n) => (
                          <div key={n.id} className={n.authorRole === "producer" ? styles.reply : styles.alist}>
                            <b>
                              {n.authorRole === "producer" ? "Usted" : "CTC"} · {new Date(n.createdAt).toLocaleDateString("es-CO")}:
                            </b>{" "}
                            {n.note}
                            {n.authorRole === "bcp" && (
                              <label className={styles.ackRow}>
                                <input
                                  type="checkbox"
                                  checked={!!n.acknowledgedAt}
                                  onChange={(e) => onAcknowledgeNote(n.id, e.target.checked)}
                                />{" "}
                                Entendido
                              </label>
                            )}
                          </div>
                        ))}
                        {replyThreadKey === key ? (
                          <div className={styles.replyBox}>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Escriba su respuesta a CTC…"
                              rows={2}
                              autoFocus
                            />
                            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                              <button className="btn btn-sm btn-solid" onClick={() => submitThreadReply(key, notes)} disabled={!replyText.trim()}>
                                Enviar
                              </button>
                              <button className="btn btn-sm" onClick={() => { setReplyThreadKey(null); setReplyText(""); }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={styles.replyLink}
                            onClick={() => { setReplyThreadKey(key); setReplyText(""); }}
                          >
                            Responder a este hilo
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className={`${styles.acard} ${styles.wide}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className={styles.k}>Mis fincas · {fincas.length} registradas</span>
              <button className="btn btn-sm btn-solid" onClick={() => onOpenFincaModal(-1)}>+ Agregar finca</button>
            </div>
            <div className={styles.fincaScroll}>
              {fincas.map((f, i) => {
                const mapUrl = mapPreviewUrl({ lat: f.lat, lng: f.lng, polygon: f.eudrPolygon }, "160x90");
                return (
                <div className={styles.fincaCard} key={f.name + i}>
                  {f.profilePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                    <img src={f.profilePhotoUrl} alt={f.name} className={styles.fincaThumb} />
                  ) : (
                    <div className={styles.fincaThumbEmpty} />
                  )}
                  {mapUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- Google Static Maps URL, not a local asset
                    <img src={mapUrl} alt={`Ubicación de ${f.name}`} className={styles.fincaMap} />
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <h5 style={{ margin: 0 }}>{f.name}</h5>
                    <EudrStatusBadge status={fincaEudrStatus(f)} />
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)", overflowWrap: "anywhere", marginTop: 2 }}>{fincaCode(f.id)}</div>
                  <div className={styles.sub}>
                    {f.vereda} · {f.mun}<br />
                    {f.depto}<br />
                    {f.alt} msnm · {f.ha} ha
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="btn btn-sm" onClick={() => onOpenFincaModal(i)}>Editar</button>
                    {/* Deletable while CTC hasn't accepted the finca and no lot of it has
                        entered the Arena pipeline (fincaSelfDeletable mirrors the RLS
                        policy). Otherwise CTC is relying on it, so the producer can only
                        request a data revision -- a full deletion affecting committed
                        lots is handled by CTC over that email thread. */}
                    {fincaSelfDeletable(f, lots) ? (
                      <button className={styles.deletebtn} onClick={() => onDeleteFinca(f.id)}>Eliminar</button>
                    ) : (
                      <button className="btn btn-sm" onClick={() => onRequestFincaRevision(f)}>Solicitar revisión de datos</button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          <div className={`${styles.acard} ${styles.full}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className={styles.k}>Mis lotes · cada café se asocia a una finca</span>
              <button className="btn btn-sm btn-solid" onClick={onNewLot}>+ Registrar nuevo lote</button>
            </div>
            <div style={{ marginTop: 8 }}>
              {lots.map((l) => {
                const col = l.grade ? GRADES[l.grade] : "var(--accent)";
                const state = STAGES[l.stage];
                return (
                  <div className={styles.lotrow} style={{ ["--lc" as string]: col } as React.CSSProperties} key={l.id}>
                    <div>
                      {renamingId === l.id ? (
                        <div className={styles.rn}>
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveRename(l.id)}
                            autoFocus
                          />
                          <button className={styles.iconbtn} onClick={() => saveRename(l.id)}>✓</button>
                          <button className={styles.iconbtn} onClick={() => setRenamingId(null)}>✕</button>
                        </div>
                      ) : (
                        <h4>
                          {l.name}{" "}
                          <button className={styles.iconbtn} title="Renombrar lote" aria-label={`Renombrar ${l.name}`} onClick={() => startRename(l)}>✎</button>
                        </h4>
                      )}
                      <div className="mono" style={{ fontSize: 11, color: "var(--muted)", overflowWrap: "anywhere" }}>
                        <CtcRef id={l.id} />
                      </div>
                      <div className={styles.sub}>Finca: {l.finca} · {l.extra}</div>
                      {l.stage === 1 && !l.sampleShippedAt && (
                        <button className="btn btn-sm btn-solid-accent" style={{ marginTop: 6 }} onClick={() => onConfirmSampleShipped(l.id)}>
                          Confirmar envío de la muestra
                        </button>
                      )}
                      <LotKanbanStepper stage={l.stage} intakeStep={l.intakeStep} grade={l.grade} />
                      {l.nextStepAdvice && (
                        <div className={styles.nextstep}>
                          <span className={styles.nextstepLabel}>¿Y ahora qué?</span> {l.nextStepAdvice}
                        </div>
                      )}
                    </div>
                    <div className={styles.metrics}>
                      <div className={styles.chips}>
                        <span className={styles.state} style={{ ["--lc" as string]: col } as React.CSSProperties}>{state}</span>
                        <span className={styles.datachip}>Variedad: <b>{l.variety}</b></span>
                        <span className={styles.datachip}>Puntaje: <b>{l.score}</b></span>
                        <span className={styles.datachip}>Proceso: <b>{l.process}</b></span>
                        <span className={styles.datachip}>Grado CTC: <b style={l.grade ? { color: GRADES[l.grade] } : undefined}>{l.grade || "Pendiente"}</b></span>
                      </div>
                      <LotCompletionSparkline history={l.completionHistory} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch" }}>
                      <button className="btn btn-sm" onClick={() => onOpenFicha(l.id)}>{l.stage === 0 ? "Completar ficha" : "Ver ficha"}</button>
                      {/* Deletable any time before MUE passes the lot into the Arena
                          backlog (stage < 4 = fila_arena), unless BCP already has the
                          physical sample in hand (bcp_manual_entry). */}
                      {l.stage < 4 && l.source !== "bcp_manual_entry" && (
                        <button className={styles.deletebtn} onClick={() => onDeleteLot(l.id)}>Eliminar lote</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.acard}>
            <span className={styles.k}>Certificación CTC</span>
            {certified.length === 0 ? (
              <div className={styles.alist} style={{ marginTop: 8 }}>Sin certificados todavía. Aparecerán aquí cuando sus lotes sean evaluados en la Arena.</div>
            ) : (
              <>
                <div className={styles.v} style={{ fontSize: 20 }}>{certified.length} {certified.length === 1 ? "emitido" : "emitidos"}</div>
                <div className={styles.alist}>
                  {certified.map((l) => (
                    <span key={l.id}>
                      <CtcRef id={l.id} /> · {l.grade ? `Galardonado ${l.grade}` : "Evaluado (sin galardón)"}<br />
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className={`${styles.acard} ${styles.wide}`}>
            <span className={styles.k}>Mis contratos con CTC</span>
            {contracts.length === 0 ? (
              <div className={styles.alist} style={{ marginTop: 8 }}>Sin lotes galardonados todavía. Cuando un lote suyo gane un galardón en la Arena, su contrato aparecerá aquí.</div>
            ) : (
              contracts.map((c) => (
                <div className={styles.fincarow} key={c.id} style={{ marginTop: 10 }}>
                  <h5>
                    <CtcRef id={c.lotId} /> · {c.lotName}{" "}
                    {c.grade && <b style={{ color: GRADES[c.grade] }}>· {c.grade}</b>}
                  </h5>
                  <div className={styles.sub}>
                    Estado: <b>{CONTRACT_STATUS_LABEL[c.status]}</b>
                    {c.quantityFrozenKg != null && <> · Congelado: <b>{c.quantityFrozenKg} kg pergamino</b></>}
                    {c.pricePerKgLocked != null && <> · Precio: <b>${c.pricePerKgLocked}/kg</b></>}
                  </div>
                  <div className={styles.track} aria-label="Progreso del trato">
                    {[1, 2, 3].map((m) => (
                      <i key={m} className={c.releases.find((r) => r.month === m)?.releasedAt ? styles.on : ""} />
                    ))}
                  </div>
                  <div className={styles.alist} style={{ marginTop: 4 }}>
                    {c.releases.map((r) => (
                      <span key={r.month}>
                        Mes {r.month}: {r.releasedKg != null ? `liberó ${r.releasedKg} kg` : "pendiente"}
                        {r.shippedAt ? " · enviado" : ""}
                        {r.month < 3 ? " · " : ""}
                      </span>
                    ))}
                  </div>
                  {c.humidity.length > 0 && (
                    <div className={styles.alist} style={{ marginTop: 6 }}>
                      Humedad: {c.humidity.map((h) => `mes ${h.month}: ${h.pct.toFixed(1)}%${h.flagged ? " ⚠" : " ✓"}`).join(" · ")}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
