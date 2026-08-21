"use client";

import Image from "next/image";
import { type Finca, type GeneralInfo, type Lot, type Parcela, type ProducerContract, type FeedbackNote } from "./data";
import { RedSwitcher } from "@/components/RedSwitcher";
import { LegalFooter } from "@/components/LegalFooter";
import { PanelNav } from "./panel/PanelNav";
import { TAB_META, type PanelDrill, type PanelTab } from "./panel/panelTabs";
import { partirFeed, sinLeer } from "./panel/mensajes";
import { PerfilTab } from "./panel/PerfilTab";
import { EvaluacionesTab } from "./panel/EvaluacionesTab";
import { ContratosTab } from "./panel/ContratosTab";
import { EcosistemaTab } from "./panel/EcosistemaTab";
import { MensajesTab } from "./panel/MensajesTab";
import styles from "./AppDashboard.module.css";

// ── El panel del productor: CINCO interfaces (V5.16) ────────────────────────
// La rejilla de tarjetas (V4.x) y los dos FABs flotantes se retiraron: el
// panel ahora son cinco interfaces detrás de una barra de navegación inferior
// — Mensajes · Ecosistema · Mi Perfil · Evaluaciones · Contratos. Este archivo
// quedó como el CASCARÓN (cabecera, título de pestaña, pie legal y la barra);
// cada interfaz vive en ./panel/. La pestaña activa y el drill viven en
// KaffetalExperience para participar de la pila del botón "Atrás".
//
// El tipo de la rejilla retirada se conserva SOLO como vocabulario del
// contrato `?m=<módulo>` (V4.34): los enlaces de vuelta de la concha de
// herramientas y los marcadores viejos traen estas claves, y
// panel/panelTabs.ts las traduce a su pestaña nueva.
export type DashboardModule = "info" | "arena" | "retro" | "solicitudes" | "fincas" | "lotes" | "cert" | "contratos" | "herramientas" | "servicios" | "coffeed" | "jornadas";

export function AppDashboard({
  userName,
  lots,
  fincas,
  parcelas,
  gi,
  contracts,
  feedback,
  tab,
  onSelectTab,
  drill,
  onSetDrill,
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
  onCreateThread,
  onAcknowledgeNote,
  onOpenInfoModal,
  onConfirmSampleShipped,
}: {
  userName: string;
  lots: Lot[];
  fincas: Finca[];
  /** F3: parcelas de las fincas del productor — la aptitud EUDR se juzga por
   *  parcelas (F1); sin este dato el contador usaba la regla legacy. */
  parcelas: Parcela[];
  gi: GeneralInfo;
  contracts: ProducerContract[];
  feedback: FeedbackNote[];
  tab: PanelTab;
  onSelectTab: (t: PanelTab) => void;
  drill: PanelDrill | null;
  onSetDrill: (d: PanelDrill | null) => void;
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
  onCreateThread: (
    title: string,
    link: { type: "finca" | "lote" | "contrato"; id: string } | null,
    message: string
  ) => Promise<boolean>;
  onAcknowledgeNote: (noteId: string, ack: boolean) => void;
  onOpenInfoModal: () => void;
  onConfirmSampleShipped: (lotId: string) => void;
}) {
  // Cómo se nombra el productor a sí mismo en sus hilos (owner, 2026-08-20):
  // su nombre, no «Usted». Mismo orden de preferencia que el envío de
  // solicitudes: nombre del agricultor → razón social → el nombre de la cuenta.
  const nombreProductor = gi.agri !== "—" ? gi.agri : gi.razon !== "—" ? gi.razon : userName;

  // La insignia de Mensajes cuenta TODAS las notas de CTC sin leer — la suma
  // de las dos mitades (los chips de la pestaña desglosan cada una).
  const { solicitudes, retroalimentacion } = partirFeed(feedback);
  const mensajesBadge = sinLeer(solicitudes) + sinLeer(retroalimentacion);

  const meta = TAB_META[tab];
  const irAEvaluaciones = () => onSelectTab("evaluaciones");
  const irALotes = () => {
    onSelectTab("perfil");
    onSetDrill({ kind: "lotes" });
  };

  return (
    <div className={styles.page}>
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
            <RedSwitcher actual="kr" compact />
            <button className="btn btn-sm" onClick={onLogout}>Cerrar sesión</button>
          </div>
        </div>
      </div>

      <div className={`wrap ${styles.main}`}>
        <p className="eyebrow">Panel del productor</p>
        <h1 className={styles.h1}>{meta.titulo}</h1>
        {tab === "perfil" ? (
          <div className={styles.saludo}>Buenos días, {userName}</div>
        ) : (
          <div className={styles.secSub} style={{ marginTop: 4 }}>{meta.sub}</div>
        )}

        {drill && (
          <button className="btn btn-sm" style={{ marginTop: 14 }} onClick={() => onSetDrill(null)}>
            ← Volver a Mi Perfil
          </button>
        )}

        {tab === "perfil" && (
          <PerfilTab
            gi={gi}
            fincas={fincas}
            lots={lots}
            parcelas={parcelas}
            drill={drill}
            onSetDrill={onSetDrill}
            onOpenInfoModal={onOpenInfoModal}
            onOpenFincaModal={onOpenFincaModal}
            onDeleteFinca={onDeleteFinca}
            onRequestFincaRevision={onRequestFincaRevision}
            onNewLot={onNewLot}
            onOpenFicha={onOpenFicha}
            onRenameLot={onRenameLot}
            onDeleteLot={onDeleteLot}
            onGoEvaluaciones={irAEvaluaciones}
          />
        )}

        {tab === "evaluaciones" && (
          <EvaluacionesTab
            lots={lots}
            onRefreshData={onRefreshData}
            onConfirmSampleShipped={onConfirmSampleShipped}
            onVerLotes={irALotes}
          />
        )}

        {tab === "contratos" && (
          <ContratosTab gi={gi} contracts={contracts} onGoEvaluaciones={irAEvaluaciones} />
        )}

        {tab === "ecosistema" && (
          <EcosistemaTab
            fincas={fincas}
            gi={gi}
            userName={userName}
            onRefreshData={onRefreshData}
            onCreateThread={onCreateThread}
            onGoMensajes={() => onSelectTab("mensajes")}
          />
        )}

        {tab === "mensajes" && (
          <MensajesTab
            feedback={feedback}
            fincas={fincas}
            lots={lots}
            contracts={contracts}
            nombreProductor={nombreProductor}
            onReplyToFeedback={onReplyToFeedback}
            onAcknowledgeNote={onAcknowledgeNote}
            onCreateThread={onCreateThread}
            onOpenFicha={onOpenFicha}
            onOpenFincaModal={onOpenFincaModal}
          />
        )}
      </div>

      {/* El panel del productor no tenía pie alguno: la barra legal cierra
          también esta superficie y, sobre todo, deja la versión a la vista
          donde más se prueba el lado productor. */}
      <LegalFooter />

      <PanelNav tab={tab} onSelectTab={onSelectTab} mensajesBadge={mensajesBadge} />
    </div>
  );
}
