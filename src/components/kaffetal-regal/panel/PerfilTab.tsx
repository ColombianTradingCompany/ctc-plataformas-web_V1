"use client";

import { useState } from "react";
import { GRADES, STAGES, fincaCode, fincaSelfDeletable, isLotCommitted, type Finca, type GeneralInfo, type Lot, type Parcela } from "../data";
import { mapPreviewUrl, fincaEudrStatus, lotEudrStatus, type EudrStatus, type ParcelaGeoFields } from "@/lib/eudr";
import { EudrStatusBadge } from "../EudrStatusBadge";
import { FieldInfo } from "../ficha/panes/FieldInfo";
import { LotCompletionSparkline } from "../LotCompletionSparkline";
import { LotKanbanStepper } from "../LotKanbanStepper";
import { CtcRef } from "./CtcRef";
import type { PanelDrill } from "./panelTabs";
import styles from "../AppDashboard.module.css";

// ── Mi Perfil de Productor (V5.16) ──────────────────────────────────────────
// La portada del panel: Información general + Mis Fincas + Mis Lotes como
// CARRUSELES (lo nuevo empuja lo viejo a la derecha). La flecha de cada
// sección abre el DRILL: la lista completa en vertical, con filtros. El drill
// vive en KaffetalExperience porque participa de la pila del botón "Atrás".
export function PerfilTab({
  gi,
  fincas,
  lots,
  parcelas,
  drill,
  onSetDrill,
  onOpenInfoModal,
  onOpenFincaModal,
  onDeleteFinca,
  onRequestFincaRevision,
  onNewLot,
  onOpenFicha,
  onRenameLot,
  onDeleteLot,
  onGoEvaluaciones,
}: {
  gi: GeneralInfo;
  fincas: Finca[];
  lots: Lot[];
  parcelas: Parcela[];
  drill: PanelDrill | null;
  onSetDrill: (d: PanelDrill | null) => void;
  onOpenInfoModal: () => void;
  onOpenFincaModal: (index: number) => void;
  onDeleteFinca: (fincaId: string) => void;
  onRequestFincaRevision: (finca: Finca) => void;
  onNewLot: () => void;
  onOpenFicha: (lotId: string) => void;
  onRenameLot: (lotId: string, newName: string) => void;
  onDeleteLot: (lotId: string) => void;
  onGoEvaluaciones: () => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [filtroFinca, setFiltroFinca] = useState<string>("todas");
  const [filtroLote, setFiltroLote] = useState<string>("todos");

  // F3: la misma regla por parcelas que usan el FincaModal y approveFinca.
  const parcelaGeoOfFinca = (f: Finca): ParcelaGeoFields[] =>
    parcelas
      .filter((p) => p.fincaId === f.id)
      .map((p) => ({
        areaHa: p.areaHa.trim() ? Number(p.areaHa.replace(",", ".")) : null,
        hasPoint: p.lat !== "" && p.lng !== "",
        hasPolygon: (p.polygon?.length ?? 0) >= 3,
      }));
  const fincaStatusOf = (f: Finca): EudrStatus => fincaEudrStatus(f, parcelaGeoOfFinca(f));

  function startRename(l: Lot) {
    setRenamingId(l.id);
    setRenameValue(l.name);
  }
  function saveRename(id: string) {
    if (renameValue.trim()) onRenameLot(id, renameValue.trim());
    setRenamingId(null);
  }

  // Lo nuevo primero: los lotes ya llegan descendentes; las fincas llegan
  // ascendentes (así las indexa el FincaModal), aquí solo se INVIERTE LA VISTA.
  const fincasRecientes = fincas.map((f, i) => ({ f, i })).reverse();

  const fincaCard = (f: Finca, i: number) => {
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
          <EudrStatusBadge status={fincaStatusOf(f)} />
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", overflowWrap: "anywhere" }}>{fincaCode(f.id)}</div>
        <div className={styles.sub}>
          {f.vereda} · {f.mun}<br />
          {f.depto} · {f.alt} msnm · {f.ha} ha
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="btn btn-sm" onClick={() => onOpenFincaModal(i)}>Editar</button>
          {/* Deletable while CTC hasn't accepted the finca and no lot of it has
              entered the paid pipeline (fincaSelfDeletable mirrors the RLS
              policy). Otherwise CTC is relying on it, so the producer can only
              request a data revision -- a full deletion affecting committed
              lots is handled by CTC over that thread. */}
          {fincaSelfDeletable(f, lots) ? (
            <button className={styles.deletebtn} onClick={() => onDeleteFinca(f.id)}>Eliminar</button>
          ) : (
            <button className="btn btn-sm" onClick={() => onRequestFincaRevision(f)}>Solicitar revisión de datos</button>
          )}
        </div>
        {/* La VISA EUDR de la finca (modelo Pasaporte/Visa/Sello, 2026-07-24):
            descargable cuando CTC la otorgó y la compartió; si no, se
            explica en qué va el trámite. */}
        <div className={styles.certRow}>
          {f.status === "approved" && f.certShared ? (
            <a className={styles.certDownload} href={`/kaffetal-regal/certificacion/${f.id}`} target="_blank" rel="noopener noreferrer">
              ⬇ Descargar Visa EUDR de {f.name}
            </a>
          ) : fincaStatusOf(f).code === "pendiente" ? (
            <span className={styles.certPending}>
              Visa EUDR: en trámite — información incompleta
              <FieldInfo text="Complete la información EUDR de esta finca (ubicación/polígono, no deforestación, tenencia de la tierra y el cuestionario de riesgo) desde 'Editar'. Cuando esté completa, CTC la revisará y, si le otorga la Visa EUDR, habilitará su descarga. Con la Visa vigente, todos los lotes de esta finca reciben su Sello EUDR automáticamente." />
            </span>
          ) : (
            <span className={styles.certPending}>Visa EUDR: en trámite (a la espera de la revisión de CTC)</span>
          )}
        </div>
      </div>
    );
  };

  const lotRow = (l: Lot) => {
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
          {l.stage === 2 && !l.inscription && (
            <button className="btn btn-sm btn-solid-accent" style={{ marginTop: 6 }} onClick={onGoEvaluaciones}>
              ¡Apto! · postular a la Arena →
            </button>
          )}
          {l.inscription?.phase === "postulacion" && !l.sampleShippedAt && (
            <button className="btn btn-sm btn-solid-accent" style={{ marginTop: 6 }} onClick={onGoEvaluaciones}>
              Muestra pendiente · gestionar envío →
            </button>
          )}
          <LotKanbanStepper stage={l.stage} intakeStep={l.intakeStep} grade={l.grade} inscription={l.inscription} />
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
              Sello EUDR ↗
            </a>
          )}
          {/* Deletable any time before the paid pipeline takes the lot (sin
              inscripción y antes del legado fila_arena — isLotCommitted), unless
              BCP already has the physical sample in hand (bcp_manual_entry). */}
          {!isLotCommitted(l) && l.source !== "bcp_manual_entry" && (
            <button className={styles.deletebtn} onClick={() => onDeleteLot(l.id)}>Eliminar lote</button>
          )}
        </div>
      </div>
    );
  };

  // Tarjeta compacta del carrusel de lotes (la fila completa vive en el drill).
  const lotCard = (l: Lot) => {
    const col = l.grade ? GRADES[l.grade] : "var(--accent)";
    return (
      <div className={styles.lotCard} style={{ ["--lc" as string]: col } as React.CSSProperties} key={l.id}>
        <h5 style={{ margin: 0 }}>{l.name}</h5>
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", overflowWrap: "anywhere" }}>
          <CtcRef id={l.id} />
        </div>
        <div className={styles.sub}>Finca: {l.finca}</div>
        <div className={styles.chips}>
          <span className={styles.datachip}>Variedad: <b>{l.variety}</b></span>
          <span className={styles.datachip}>Proceso: <b>{l.process}</b></span>
          <span className={styles.datachip}>Puntaje: <b>{l.score}</b></span>
          <span className={styles.datachip}>Grado CTC: <b style={l.grade ? { color: GRADES[l.grade] } : undefined}>{l.grade || "Pendiente"}</b></span>
        </div>
        <LotKanbanStepper stage={l.stage} intakeStep={l.intakeStep} grade={l.grade} inscription={l.inscription} />
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: "auto" }}>
          <button className="btn btn-sm" onClick={() => onOpenFicha(l.id)}>{l.stage === 0 ? "Completar ficha" : "Ver ficha"}</button>
          <span className={styles.state} style={{ ["--lc" as string]: col } as React.CSSProperties}>{STAGES[l.stage]}</span>
        </div>
      </div>
    );
  };

  // ── Drill: la lista completa con filtros ─────────────────────────────────
  if (drill?.kind === "fincas") {
    const codigos = [...new Set(fincas.map((f) => fincaStatusOf(f).code))];
    const visibles = fincasRecientes.filter(({ f }) => filtroFinca === "todas" || fincaStatusOf(f).code === filtroFinca);
    return (
      <div className={`${styles.acard} ${styles.full}`} style={{ marginTop: 14 }}>
        <div className={styles.secHead}>
          <span className={styles.k}>Mis fincas · {fincas.length} registradas</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select className={styles.filterSel} value={filtroFinca} onChange={(e) => setFiltroFinca(e.target.value)} aria-label="Filtrar fincas por estado de la Visa EUDR">
              <option value="todas">Visa EUDR: todas</option>
              {codigos.map((c) => (
                <option key={c} value={c}>{fincas.map((f) => fincaStatusOf(f)).find((s) => s.code === c)?.label}</option>
              ))}
            </select>
            <button className="btn btn-sm btn-solid" onClick={() => onOpenFincaModal(-1)}>+ Agregar finca</button>
          </div>
        </div>
        <div className={styles.fincaList}>
          {visibles.map(({ f, i }) => fincaCard(f, i))}
          {visibles.length === 0 && <div className={styles.alist}>Ninguna finca coincide con el filtro.</div>}
        </div>
      </div>
    );
  }

  if (drill?.kind === "lotes") {
    const etapas = [...new Set(lots.map((l) => l.stage))].sort((a, b) => a - b);
    const visibles = lots.filter((l) => filtroLote === "todos" || String(l.stage) === filtroLote);
    return (
      <div className={`${styles.acard} ${styles.full}`} style={{ marginTop: 14 }}>
        <div className={styles.secHead}>
          <span className={styles.k}>Mis lotes · cada café se asocia a una finca</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select className={styles.filterSel} value={filtroLote} onChange={(e) => setFiltroLote(e.target.value)} aria-label="Filtrar lotes por etapa">
              <option value="todos">Etapa: todas</option>
              {etapas.map((s) => (
                <option key={s} value={String(s)}>{STAGES[s]}</option>
              ))}
            </select>
            <button className="btn btn-sm btn-solid" onClick={onNewLot}>+ Registrar nuevo lote</button>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          {visibles.map(lotRow)}
          {visibles.length === 0 && <div className={styles.alist} style={{ marginTop: 8 }}>Ningún lote coincide con el filtro.</div>}
        </div>
      </div>
    );
  }

  // ── La portada: información general + dos carruseles ─────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 14 }}>
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

      <section>
        <div className={styles.secHead}>
          <button type="button" className={styles.secTitleBtn} onClick={() => onSetDrill({ kind: "fincas" })} aria-label="Ver todas mis fincas">
            <span className={styles.secTitle}>Mis Fincas · {fincas.length}</span>
            <span className={styles.secArrow} aria-hidden>⇨</span>
          </button>
          <button className="btn btn-sm btn-solid" onClick={() => onOpenFincaModal(-1)}>+ Agregar finca</button>
        </div>
        <div className={styles.secSub}>El origen que avala una producción trazable</div>
        {fincas.length === 0 ? (
          <div className={styles.alist} style={{ marginTop: 10 }}>Registre su primera finca — es el primer paso de todo el camino.</div>
        ) : (
          <div className={styles.fincaScroll}>{fincasRecientes.map(({ f, i }) => fincaCard(f, i))}</div>
        )}
      </section>

      <section>
        <div className={styles.secHead}>
          <button type="button" className={styles.secTitleBtn} onClick={() => onSetDrill({ kind: "lotes" })} aria-label="Ver todos mis lotes">
            <span className={styles.secTitle}>Mis Lotes · {lots.length}</span>
            <span className={styles.secArrow} aria-hidden>⇨</span>
          </button>
          <button className="btn btn-sm btn-solid" onClick={onNewLot}>+ Registrar nuevo lote</button>
        </div>
        <div className={styles.secSub}>La cosecha de una temporada particular</div>
        {lots.length === 0 ? (
          <div className={styles.alist} style={{ marginTop: 10 }}>Registre su primer café — cada lote se asocia a una finca.</div>
        ) : (
          <div className={styles.fincaScroll}>{lots.map(lotCard)}</div>
        )}
      </section>
    </div>
  );
}
