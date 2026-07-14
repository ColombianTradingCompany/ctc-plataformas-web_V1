"use client";

import { useState } from "react";
import Image from "next/image";
import { CONTRACT_STATUS_LABEL, GRADES, STAGES, ctcLotReference, ctcLotReferenceShort, fincaCode, fincaSelfDeletable, type Finca, type GeneralInfo, type Lot, type ProducerContract, type FeedbackNote } from "./data";
import { mapPreviewUrl, fincaEudrStatus, lotEudrStatus } from "@/lib/eudr";
import { useToast } from "@/components/Toast";
import { submitLeadAuthed } from "@/lib/leads/actions";
import { redeemClubCode } from "@/lib/club/actions";
import { EudrStatusBadge } from "./EudrStatusBadge";
import { FieldInfo } from "./ficha/panes/FieldInfo";
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

// The producer panel is a HUB: a landing of big module tiles (each with its
// key facts) that open one module at a time, instead of one endless page.
// The active module lives in KaffetalExperience so the phone's Back button
// closes it like any other layer.
export type DashboardModule = "info" | "muestras" | "retro" | "fincas" | "lotes" | "cert" | "contratos" | "servicios";

// Minimalist stroked line icons (one visual language, currentColor) — replaces
// the multicolor emoji that clashed with the panel's editorial tone.
function LineIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
const HUB_ICON: Record<DashboardModule, React.ReactNode> = {
  info: (
    <LineIcon><circle cx="12" cy="8" r="3.4" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></LineIcon>
  ),
  fincas: (
    <LineIcon><path d="M12 20v-8" /><path d="M12 12c0-3 2.2-5 5.2-5 0 3-2.2 5-5.2 5Z" /><path d="M12 14.5c0-2.4-1.8-4-4.3-4 0 2.4 1.8 4 4.3 4Z" /></LineIcon>
  ),
  lotes: (
    <LineIcon><path d="M4 8h13v4.5a4.5 4.5 0 0 1-4.5 4.5H8.5A4.5 4.5 0 0 1 4 12.5V8Z" /><path d="M17 9h1.6a2.4 2.4 0 0 1 0 4.8H17" /><path d="M7.5 3.2c.5.8-.5 1.4 0 2.4M11 3.2c.5.8-.5 1.4 0 2.4" /></LineIcon>
  ),
  muestras: (
    <LineIcon><path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" /><path d="M4 7l8 4 8-4" /><path d="M12 21V11" /></LineIcon>
  ),
  retro: (
    <LineIcon><path d="M20 12a7.2 7.2 0 0 1-9.9 6.7L5 20l1.3-4.4A7.2 7.2 0 1 1 20 12Z" /></LineIcon>
  ),
  cert: (
    <LineIcon><circle cx="12" cy="10" r="5" /><path d="M8.7 14.3 7 21l5-2.4L17 21l-1.7-6.7" /></LineIcon>
  ),
  contratos: (
    <LineIcon><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M10 13h5M10 16.5h5" /></LineIcon>
  ),
  servicios: (
    <LineIcon><path d="M12 3.5l1.7 5.3 5.3 1.7-5.3 1.7L12 17.5l-1.7-5.3L5 10.5l5.3-1.7Z" /><path d="M18.5 16.5l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6Z" /></LineIcon>
  ),
};

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
  module,
  onSelectModule,
  onRefreshData,
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
  module: DashboardModule | null;
  onSelectModule: (m: DashboardModule | null) => void;
  onRefreshData: () => void;
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
  const { showToast } = useToast();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  // "Más allá de la exportación": in-panel requests for CTC Tech / Varietales.
  // They feed the same leads pipeline as ctcexport.com's Escríbenos, but with
  // the producer's account (and finca) already linked -- so the reply lands in
  // their email AND in "Retroalimentación y ayuda".
  const [serviceSent, setServiceSent] = useState<{ tech?: boolean; varietales?: boolean }>({});
  const [serviceBusy, setServiceBusy] = useState(false);
  // Kaffetal Club: "Mis contratos" (y con ello el catálogo activo / Cherry
  // Picked) es exclusivo de miembros. El productor activa su membresía
  // canjeando aquí el código que CTC le emite desde el BCP.
  const isClubMember = !!gi.clubMemberSince;
  const [clubCode, setClubCode] = useState("");
  const [clubBusy, setClubBusy] = useState(false);

  async function submitClubCode() {
    const code = clubCode.trim();
    if (!code) return;
    setClubBusy(true);
    try {
      const result = await redeemClubCode(code);
      if (result.ok) {
        showToast("¡Bienvenido al Kaffetal Club! Su membresía quedó activa ✓");
        setClubCode("");
        // club_member_since cambió server-side; recargar refleja la membresía
        // (y la nota de bienvenida en Retroalimentación) sin salir del módulo.
        onRefreshData();
      } else {
        showToast(result.message);
      }
    } catch {
      showToast("No se pudo canjear el código. Intente de nuevo.");
    } finally {
      setClubBusy(false);
    }
  }

  async function requestService(pillar: "tech" | "varietales", form: HTMLFormElement) {
    setServiceBusy(true);
    try {
      const fd = new FormData(form);
      const fincaName = String(fd.get("finca") ?? "");
      const finca = fincas.find((f) => f.name === fincaName);
      const ubicacion = finca ? `${finca.mun}, ${finca.depto}` : "";
      const fields: Record<string, unknown> =
        pillar === "tech"
          ? { finca: fincaName, ubicacion, interes: fd.getAll("interes").map(String) }
          : { finca: fincaName, ubicacion, varietal: String(fd.get("varietal") ?? ""), cantidad: String(fd.get("cantidad") ?? "") };
      const result = await submitLeadAuthed({
        pillar,
        nombre: gi.agri !== "—" ? gi.agri : userName,
        message: String(fd.get("msg") ?? "").trim(),
        fields,
      });
      if (result.ok) {
        setServiceSent((s) => ({ ...s, [pillar]: true }));
        showToast("Solicitud enviada a CTC ✓ · la conversación sigue en Retroalimentación y ayuda");
        // The mirror note just landed in producer_comm_log server-side --
        // refresh so Retroalimentación shows the new thread without a reload.
        onRefreshData();
      } else {
        showToast(result.message);
      }
    } catch {
      showToast("No se pudo enviar la solicitud. Intente de nuevo.");
    } finally {
      setServiceBusy(false);
    }
  }
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

  // Key facts for the hub tiles: enough to know whether a module needs
  // attention without opening it. `alert` facts render highlighted.
  const samplesToShip = lots.filter((l) => l.stage === 1 && !l.sampleShippedAt).length;
  const newCtcNotes = feedback.filter((n) => n.authorRole === "bcp" && !n.acknowledgedAt).length;
  const aptFincas = fincas.filter((f) => fincaEudrStatus(f).code === "apta").length;
  const lotsInQueue = lots.filter((l) => l.stage === 4).length;
  const infoComplete = gi.razon !== "—" && gi.agri !== "—";

  const tiles: { key: DashboardModule; icon: React.ReactNode; title: string; fact: string; alert?: boolean }[] = [
    {
      key: "info",
      icon: HUB_ICON.info,
      title: "Información general",
      fact: infoComplete ? `${gi.agri} · ${gi.razon}` : "Complete su información una sola vez",
      alert: !infoComplete,
    },
    {
      key: "fincas",
      icon: HUB_ICON.fincas,
      title: "Mis fincas",
      fact: fincas.length
        ? `${fincas.length} registrada${fincas.length === 1 ? "" : "s"} · ${aptFincas} EUDR Apta${aptFincas === 1 ? "" : "s"}`
        : "Registre su primera finca",
      alert: fincas.length === 0,
    },
    {
      key: "lotes",
      icon: HUB_ICON.lotes,
      title: "Mis lotes",
      fact: lots.length
        ? `${lots.length} lote${lots.length === 1 ? "" : "s"} · ${lotsInQueue} en fila para la Arena`
        : "Registre su primer café",
    },
    {
      key: "muestras",
      icon: HUB_ICON.muestras,
      title: "Envío de muestras",
      fact: samplesToShip > 0 ? `${samplesToShip} muestra${samplesToShip === 1 ? "" : "s"} por enviar` : "Dirección y guía de envío · 2 kg por lote",
      alert: samplesToShip > 0,
    },
    {
      key: "retro",
      icon: HUB_ICON.retro,
      title: "Retroalimentación y ayuda",
      fact: newCtcNotes > 0 ? `${newCtcNotes} nota${newCtcNotes === 1 ? "" : "s"} nueva${newCtcNotes === 1 ? "" : "s"} de CTC` : "Converse con CTC sobre sus fincas y solicitudes",
      alert: newCtcNotes > 0,
    },
    {
      key: "cert",
      icon: HUB_ICON.cert,
      title: "Certificación CTC",
      fact: certified.length ? `${certified.length} certificado${certified.length === 1 ? "" : "s"} emitido${certified.length === 1 ? "" : "s"}` : "Se emiten al evaluar sus lotes en la Arena",
    },
    {
      key: "contratos",
      icon: HUB_ICON.contratos,
      title: "Mis contratos",
      fact: !isClubMember
        ? "Exclusivo Kaffetal Club · canjee su código de miembro"
        : contracts.length
          ? `${contracts.length} contrato${contracts.length === 1 ? "" : "s"} con CTC`
          : "Aparecen al ganar un galardón en la Arena",
      alert: !isClubMember,
    },
    {
      key: "servicios",
      icon: HUB_ICON.servicios,
      title: "Más allá de la exportación",
      fact: "CTC Tech · Varietales Registrados — solicítelos desde su panel",
    },
  ];

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
          <div className={styles.navActions}>
            <button className="btn btn-sm" onClick={onBackHome}>← Inicio</button>
            <button className="btn btn-sm" onClick={onLogout}>Cerrar sesión</button>
          </div>
        </div>
      </div>

      <div className={`wrap ${styles.main}`}>
        <p className="eyebrow">Panel del productor</p>
        <h1 className={styles.h1}>Buenos días, {userName}</h1>

        {module === null && (
          <div className={styles.hubGrid}>
            {tiles.map((t) => (
              <button key={t.key} type="button" className={styles.hubTile} onClick={() => onSelectModule(t.key)}>
                <span className={styles.hubIcon} aria-hidden>{t.icon}</span>
                <span className={styles.hubText}>
                  <span className={styles.hubTitle}>{t.title}</span>
                  <span className={t.alert ? styles.hubFactAlert : styles.hubFact}>{t.fact}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {module !== null && (
          <>
          <button className="btn btn-sm" style={{ marginTop: 14 }} onClick={() => onSelectModule(null)}>
            ← Volver al panel
          </button>
          <div className={styles.ag} style={{ marginTop: 14 }}>
          {module === "info" && (
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
          )}

          {module === "muestras" && (
          <div className={styles.acard}>
            <span className={styles.k}>Envío de muestras · 2 kg pergamino por lote</span>
            <div className={styles.alist} style={{ marginTop: 6 }}>
              <b>CTC · Cra. 4 #8N-30, vía Guatiguará, casa 205, conjunto campestre Santillana · Piedecuesta, Santander · Colombia</b><br />
              Marque el paquete con el código del lote. El envío corre por su cuenta; con la muestra recibida, el lote entra en fila para la Arena.
            </div>
            {samplesToShip > 0 && (
              <div className={styles.alist} style={{ marginTop: 10 }}>
                <b>{samplesToShip} lote{samplesToShip === 1 ? "" : "s"} esperando su envío</b> — confírmelo desde la tarjeta del lote en &quot;Mis lotes&quot;.
              </div>
            )}
          </div>
          )}

          {module === "retro" && (
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
          )}

          {module === "fincas" && (
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
                  <div className={styles.fincaImgs}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL or local placeholder */}
                    <img src={f.profilePhotoUrl || "/images/kaffetal-regal/finca-placeholder.jpg"} alt={f.name} className={styles.fincaThumb} />
                    {mapUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- Google Static Maps URL, not a local asset
                      <img src={mapUrl} alt={`Ubicación de ${f.name}`} className={styles.fincaThumb} />
                    )}
                  </div>
                  <div className={styles.fincaHead}>
                    <h5 style={{ margin: 0 }}>{f.name}</h5>
                    <EudrStatusBadge status={fincaEudrStatus(f)} />
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)", overflowWrap: "anywhere" }}>{fincaCode(f.id)}</div>
                  <div className={styles.sub}>
                    {f.vereda} · {f.mun}<br />
                    {f.depto} · {f.alt} msnm · {f.ha} ha
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                  {/* EUDR certification state: download once CTC approved + shared;
                      otherwise show why it isn't available yet. */}
                  <div className={styles.certRow}>
                    {f.status === "approved" && f.certShared ? (
                      <a className={styles.certDownload} href={`/kaffetal-regal/certificacion/${f.id}`} target="_blank" rel="noopener noreferrer">
                        ⬇ Descargar Certificación EUDR de {f.name}
                      </a>
                    ) : fincaEudrStatus(f).code === "pendiente" ? (
                      <span className={styles.certPending}>
                        Certificación: Información incompleta
                        <FieldInfo text="Complete la información EUDR de esta finca (ubicación/polígono, no deforestación, tenencia de la tierra y áreas legales) desde 'Editar'. Cuando esté completa, CTC la revisará y, si la aprueba, habilitará la descarga de su Certificación EUDR." />
                      </span>
                    ) : (
                      <span className={styles.certPending}>Certificación: En proceso (a la espera de la revisión de CTC)</span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          )}

          {module === "lotes" && (
          <div className={`${styles.acard} ${styles.full}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className={styles.k}>Mis lotes · cada café se asocia a una finca</span>
              <button className="btn btn-sm btn-solid" onClick={onNewLot}>+ Registrar nuevo lote</button>
            </div>
            <div style={{ marginTop: 8 }}>
              {lots.map((l) => {
                const col = l.grade ? GRADES[l.grade] : "var(--accent)";
                const state = STAGES[l.stage];
                const sourceFinca = fincas.find((f) => f.id === l.fincaId);
                const lotEudrReady =
                  lotEudrStatus(
                    { eudr_risk_level: l.eudrRiskLevel, eudr_mitigation_effective: l.eudrMitigationEffective },
                    sourceFinca ? [sourceFinca] : []
                  ).code === "eudr_ready";
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
                      {lotEudrReady && (
                        <a className="btn btn-sm btn-solid" href={`/kaffetal-regal/certificacion-lote/${l.id}`} target="_blank" rel="noopener noreferrer" style={{ textAlign: "center" }}>
                          Certificación EUDR ↗
                        </a>
                      )}
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

          )}

          {module === "cert" && (
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

          )}

          {module === "contratos" && !isClubMember && (
          <div className={`${styles.acard} ${styles.wide}`}>
            <span className={styles.k}>Mis contratos · exclusivo Kaffetal Club</span>
            <div className={styles.alist} style={{ marginTop: 8 }}>
              El <b>Kaffetal Club</b> es el círculo de productores con los que CTC firma contratos de compra: solo sus
              lotes galardonados entran al <b>catálogo activo</b> y se venden con nombre propio en <b>Cherry Picked</b>{" "}
              (Europa). La membresía se activa con un <b>código de miembro</b>{" "}que CTC le entrega personalmente —
              si aún no tiene el suyo, escríbanos por &quot;Retroalimentación y ayuda&quot;.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={clubCode}
                onChange={(e) => setClubCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && !clubBusy && submitClubCode()}
                placeholder="KC-XXXX-XXXX"
                className="mono"
                style={{ padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14, letterSpacing: ".08em", width: 180 }}
                aria-label="Código de miembro Kaffetal Club"
              />
              <button className="btn btn-sm btn-solid" onClick={submitClubCode} disabled={clubBusy || !clubCode.trim()}>
                {clubBusy ? "Activando…" : "Activar membresía"}
              </button>
            </div>
          </div>
          )}

          {module === "contratos" && isClubMember && (
          <div className={`${styles.acard} ${styles.wide}`}>
            <span className={styles.k}>
              Mis contratos con CTC · Kaffetal Club desde {new Date(gi.clubMemberSince!).toLocaleDateString("es-CO")}
            </span>
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
          )}

          {module === "servicios" && (
          <div className={`${styles.acard} ${styles.full}`}>
            <span className={styles.k}>Más allá de la exportación · servicios CTC para su finca</span>
            <div className={styles.alist} style={{ marginTop: 6 }}>
              Los mismos servicios de ctcexport.com, a un clic desde su panel: su solicitud llega al equipo CTC con su
              cuenta y su finca ya vinculadas, y la conversación sigue por correo y en &quot;Retroalimentación y ayuda&quot;.
            </div>

            <div style={{ marginTop: 18 }}>
              <h5 style={{ margin: 0 }}>CTC Tech · Implementación de nuevas tecnologías agrónomas</h5>
              <div className={styles.sub}>
                Diagnóstico en finca para definir qué tecnología aplica a su beneficio y su presupuesto: ozono + UV,
                fermentación controlada, selección óptica, cromatografía de suelos e instrumentación de medición.
              </div>
              {serviceSent.tech ? (
                <div className={styles.alist} style={{ marginTop: 10 }}>
                  ✓ Solicitud enviada. CTC le responderá por correo y en &quot;Retroalimentación y ayuda&quot;.
                </div>
              ) : (
                <form
                  className={styles.svcForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    requestService("tech", e.currentTarget);
                  }}
                >
                  <div>
                    <label htmlFor="svc-t-finca">Finca</label>
                    <select id="svc-t-finca" name="finca" defaultValue={fincas[0]?.name ?? ""}>
                      {fincas.map((f) => (
                        <option key={f.id} value={f.name}>{f.name} · {f.mun}</option>
                      ))}
                      <option value="">Otra / sin registrar</option>
                    </select>
                  </div>
                  <div>
                    <label>Tecnologías de interés</label>
                    <div className={styles.svcChips}>
                      {["Ozono + UV", "Técnicas de fermentación", "Selección óptica", "Cromatografía de suelos", "Instrumentación de medición"].map((opt) => (
                        <label className={styles.svcChip} key={opt}>
                          <input type="checkbox" name="interes" value={opt} /> {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="svc-t-msg">Cuéntenos de su proceso actual</label>
                    <textarea id="svc-t-msg" name="msg" rows={2} placeholder="Volumen, beneficio actual, retos…" />
                  </div>
                  <button className="btn btn-sm btn-solid" type="submit" disabled={serviceBusy} style={{ justifySelf: "start" }}>
                    {serviceBusy ? "Enviando…" : "Solicitar diagnóstico"}
                  </button>
                </form>
              )}
            </div>

            <div style={{ marginTop: 24, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <h5 style={{ margin: 0 }}>Varietales Registrados · Plántulas verificadas desde la chapola</h5>
              <div className={styles.sub}>
                Genética con papeles y asesoría de siembra. Mínimo 100 chapolas · $150–$300 COP c/u según varietal.
              </div>
              {serviceSent.varietales ? (
                <div className={styles.alist} style={{ marginTop: 10 }}>
                  ✓ Solicitud enviada. CTC le responderá por correo y en &quot;Retroalimentación y ayuda&quot;.
                </div>
              ) : (
                <form
                  className={styles.svcForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    requestService("varietales", e.currentTarget);
                  }}
                >
                  <div>
                    <label htmlFor="svc-v-finca">Finca donde sembrará</label>
                    <select id="svc-v-finca" name="finca" defaultValue={fincas[0]?.name ?? ""}>
                      {fincas.map((f) => (
                        <option key={f.id} value={f.name}>{f.name} · {f.mun}</option>
                      ))}
                      <option value="">Otra / sin registrar</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="svc-v-var">Varietal de interés</label>
                    <input id="svc-v-var" name="varietal" placeholder="Ej. Gesha, Sidra, Pink Bourbon…" />
                  </div>
                  <div>
                    <label htmlFor="svc-v-cant">Cantidad de chapolas</label>
                    <input id="svc-v-cant" name="cantidad" type="number" min={100} placeholder="Mínimo 100" />
                  </div>
                  <div>
                    <label htmlFor="svc-v-msg">Mensaje</label>
                    <textarea id="svc-v-msg" name="msg" rows={2} placeholder="Perfil de taza objetivo, fecha de siembra…" />
                  </div>
                  <button className="btn btn-sm btn-solid" type="submit" disabled={serviceBusy} style={{ justifySelf: "start" }}>
                    {serviceBusy ? "Enviando…" : "Solicitar catálogo de varietales"}
                  </button>
                </form>
              )}
            </div>
          </div>
          )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
