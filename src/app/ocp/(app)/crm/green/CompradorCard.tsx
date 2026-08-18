"use client";

import { useState, useTransition } from "react";
import { setEtapaComprador } from "./crmGreenActions";
import { ETAPAS_CRM, ETAPA_LABEL, type EtapaCrm } from "@/lib/crm/etapaComprador";
import styles from "@/components/panel/shared.module.css";

// ── CRM CP Green · la tarjeta de un comprador ───────────────────────────────
// Enseña lo que hace falta para decidir a quién llamar: quién es, en qué punto
// del embudo está y cuánto ha comprado.
//
// El selector de etapa no es un campo más: lo que guarda es una EXCEPCIÓN a la
// regla de los pedidos. Por eso la opción por defecto se llama «Automática» y
// dice en voz alta qué etapa dictan los pedidos — si el operador no ve la
// diferencia entre «esto lo decidió el sistema» y «esto lo decidí yo», acabará
// fijando etapas a mano sin querer y el tablero dejará de reflejar la realidad.

export function CompradorCard({
  profileId,
  nombre,
  email,
  empresa,
  tier,
  puntos,
  pedidos,
  totalComprado,
  etapaSugerida,
  anulado,
}: {
  profileId: string;
  nombre: string;
  email: string | null;
  empresa: string | null;
  tier: string | null;
  puntos: number | null;
  pedidos: number;
  totalComprado: number;
  etapaSugerida: EtapaCrm;
  anulado: EtapaCrm | null;
}) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cambia = (valor: string) => {
    setError(null);
    startTransition(async () => {
      const r = await setEtapaComprador(profileId, valor === "auto" ? null : valor);
      if (!r.ok) setError(r.error);
    });
  };

  return (
    <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
      <div>
        <h3 style={{ margin: 0 }}>{empresa || nombre}</h3>
        <p className={styles.meta} style={{ margin: "2px 0 0" }}>
          {empresa ? `${nombre} · ` : ""}
          {email ?? "sin correo"}
        </p>
      </div>

      <p className={styles.meta} style={{ margin: 0 }}>
        {pedidos === 0 ? "Sin pedidos" : `${pedidos} pedido${pedidos === 1 ? "" : "s"}`}
        {totalComprado > 0 && <> · ${totalComprado.toLocaleString("es-CO")} </>}
        {tier && <> · Club {tier}</>}
        {puntos != null && puntos > 0 && <> · {puntos.toLocaleString("es-CO")} pts</>}
      </p>

      <label className={styles.meta} style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
        Etapa:
        <select
          value={anulado ?? "auto"}
          onChange={(e) => cambia(e.target.value)}
          disabled={pendiente}
          style={{ font: "inherit", padding: "2px 4px" }}
        >
          <option value="auto">Automática ({ETAPA_LABEL[etapaSugerida]})</option>
          {ETAPAS_CRM.map((e) => (
            <option key={e} value={e}>
              Fijar: {ETAPA_LABEL[e]}
            </option>
          ))}
        </select>
        {anulado && anulado !== etapaSugerida && (
          <span className={styles.badgeWarn} title="Fijada a mano; los pedidos dirían otra cosa">
            a mano
          </span>
        )}
      </label>

      {error && (
        <p className={styles.meta} style={{ margin: 0, color: "var(--accent)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
