"use client";

import { useState } from "react";
import type { Finca, Lot, ProducerContract, FeedbackNote } from "../data";
import { RetroalimentacionPanel } from "../RetroalimentacionPanel";
import { partirFeed, sinLeer } from "./mensajes";
import styles from "../AppDashboard.module.css";

// ── Mensajes y Notificaciones (V5.16) ───────────────────────────────────────
// Reemplaza a «Retroalimentación y ayuda» y absorbe «Mis solicitudes»: TODOS
// los mensajes viven aquí, en una sola bandeja con dos filtros. La partición
// sigue siendo por CAMPO (panel/mensajes.ts) — un chip es presentación, el
// predicado es el contrato.
export function MensajesTab({
  feedback,
  fincas,
  lots,
  contracts,
  nombreProductor,
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
  nombreProductor: string;
  onReplyToFeedback: (parent: FeedbackNote, text: string) => void;
  onAcknowledgeNote: (noteId: string, ack: boolean) => void;
  onCreateThread: (
    title: string,
    link: { type: "finca" | "lote" | "contrato"; id: string } | null,
    message: string
  ) => Promise<boolean>;
  onOpenFicha: (lotId: string) => void;
  onOpenFincaModal: (index: number) => void;
}) {
  const { solicitudes, retroalimentacion } = partirFeed(feedback);
  const [mitad, setMitad] = useState<"retro" | "solicitudes">("retro");
  const [composeOpen, setComposeOpen] = useState(false);

  const nuevasRetro = sinLeer(retroalimentacion);
  const nuevasSolicitudes = sinLeer(solicitudes);

  const chip = (activa: boolean): React.CSSProperties => ({
    border: activa ? "1.5px solid var(--primary)" : "1.5px solid var(--line)",
    background: activa ? "var(--paper)" : "var(--card)",
    color: activa ? "var(--primary-deep)" : "var(--muted)",
    borderRadius: 999,
    padding: "7px 14px",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
        <button type="button" style={chip(mitad === "retro")} onClick={() => setMitad("retro")}>
          Retroalimentación y ayuda{nuevasRetro > 0 && <b style={{ color: "var(--accent)" }}> · {nuevasRetro}</b>}
        </button>
        <button type="button" style={chip(mitad === "solicitudes")} onClick={() => setMitad("solicitudes")}>
          Solicitudes de servicio{nuevasSolicitudes > 0 && <b style={{ color: "var(--accent)" }}> · {nuevasSolicitudes}</b>}
        </button>
        {mitad === "retro" && (
          <button className="btn btn-sm btn-solid-accent" style={{ marginLeft: "auto" }} onClick={() => setComposeOpen(true)}>
            Nuevo hilo
          </button>
        )}
      </div>

      <div className={styles.ag} style={{ marginTop: 14 }}>
        {mitad === "solicitudes" ? (
          <RetroalimentacionPanel
            feedback={solicitudes}
            tituloLista="Mis solicitudes · CTC Tech · Varietales · CaaS"
            vacio="Todavía no ha enviado ninguna solicitud. Se abren desde el Ecosistema de Valor; aquí aparece la conversación."
            fincas={fincas}
            lots={lots}
            contracts={contracts}
            composeOpen={false}
            onCloseCompose={() => {}}
            onReplyToFeedback={onReplyToFeedback}
            onAcknowledgeNote={onAcknowledgeNote}
            onCreateThread={onCreateThread}
            nombreProductor={nombreProductor}
            onOpenFicha={onOpenFicha}
            onOpenFincaModal={onOpenFincaModal}
          />
        ) : (
          <RetroalimentacionPanel
            feedback={retroalimentacion}
            fincas={fincas}
            lots={lots}
            contracts={contracts}
            composeOpen={composeOpen}
            onCloseCompose={() => setComposeOpen(false)}
            onReplyToFeedback={onReplyToFeedback}
            onAcknowledgeNote={onAcknowledgeNote}
            onCreateThread={onCreateThread}
            nombreProductor={nombreProductor}
            onOpenFicha={onOpenFicha}
            onOpenFincaModal={onOpenFincaModal}
          />
        )}
      </div>
    </div>
  );
}
