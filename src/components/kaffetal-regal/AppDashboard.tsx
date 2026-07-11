"use client";

import { useState } from "react";
import Image from "next/image";
import { CONTRACT_STATUS_LABEL, GRADES, STAGES, ctcLotReference, ctcLotReferenceShort, fincaEudrUntouched, type Finca, type GeneralInfo, type Lot, type ProducerContract, type FeedbackNote } from "./data";
import { LotCompletionSparkline } from "./LotCompletionSparkline";
import { LotKanbanStepper } from "./LotKanbanStepper";
import styles from "./AppDashboard.module.css";

// Groups feedback notes by their context ("Finca X" / "Lote Y" / general),
// most-recently-active group first, notes within a group newest first
// (matches the order they already arrive in from the server query).
function groupFeedback(feedback: FeedbackNote[]): [string, FeedbackNote[]][] {
  const groups = new Map<string, FeedbackNote[]>();
  for (const n of feedback) {
    const key = n.contextLabel ?? "General";
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }
  return [...groups.entries()];
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
  onOpenInfoModal: () => void;
  onConfirmSampleShipped: (lotId: string) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const certified = lots.filter((l) => l.stage >= 5);

  function startRename(l: Lot) {
    setRenamingId(l.id);
    setRenameValue(l.name);
  }
  function saveRename(id: string) {
    if (renameValue.trim()) onRenameLot(id, renameValue.trim());
    setRenamingId(null);
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
              groupFeedback(feedback).map(([group, notes]) => (
                <div key={group} style={{ marginTop: 10 }}>
                  <h5>{group}</h5>
                  <div className={styles.alist}>
                    {notes.map((n) => (
                      <span key={n.id}>
                        {new Date(n.createdAt).toLocaleDateString("es-CO")}: {n.note}<br />
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={`${styles.acard} ${styles.wide}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className={styles.k}>Mis fincas · {fincas.length} registradas</span>
              <button className="btn btn-sm btn-solid" onClick={() => onOpenFincaModal(-1)}>+ Agregar finca</button>
            </div>
            <div className={styles.fincaScroll}>
              {fincas.map((f, i) => (
                <div className={styles.fincaCard} key={f.name + i}>
                  {f.profilePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                    <img src={f.profilePhotoUrl} alt={f.name} className={styles.fincaThumb} />
                  ) : (
                    <div className={styles.fincaThumbEmpty} />
                  )}
                  <h5>{f.name}</h5>
                  <div className={styles.sub}>
                    {f.vereda} · {f.mun}<br />
                    {f.depto}<br />
                    {f.alt} msnm · {f.ha} ha
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => onOpenFincaModal(i)}>Editar</button>
                    {/* Deletable only before any EUDR declaration has been started -- once
                        the producer begins filling that section, CTC may already be relying
                        on this record. */}
                    {fincaEudrUntouched(f) && (
                      <button className={styles.deletebtn} onClick={() => onDeleteFinca(f.id)}>Eliminar</button>
                    )}
                  </div>
                </div>
              ))}
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
                      <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
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
