"use client";

import { useState } from "react";
import { num, type FichaFormData } from "./fichaData";
import type { PaneId } from "./FichaNav";
import styles from "./NextStepWidget.module.css";

const PANE_LABELS: Record<Exclude<PaneId, "ficha">, string> = {
  a1: "Identidad y Comercio",
  a2: "Información de Origen",
  a3: "Certificados de Origen",
  a4: "Certificados Internacionales",
  b1: "Variedades y Básica",
  b2: "Perfil de Taza y Notas",
  b3: "Física y Granulometría",
  b4: "Video del Café",
};

type AdviceResponse = { configured: boolean; advice?: string; error?: string; cached?: boolean };

async function requestAdvice(payload: unknown): Promise<AdviceResponse> {
  const res = await fetch("/api/kaffetal-regal/next-step", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export function NextStepWidget({
  lotId,
  lotCode,
  stageLabel,
  data,
  completed,
  scaTotal,
  cachedAdvice,
  onAdviceUpdate,
}: {
  lotId: string;
  lotCode: string;
  stageLabel: string;
  data: FichaFormData;
  completed: Partial<Record<PaneId, boolean>>;
  scaTotal: number;
  cachedAdvice: string | null;
  onAdviceUpdate: (advice: string, context: Record<string, unknown>) => void;
}) {
  const [advice, setAdvice] = useState<string | null>(cachedAdvice);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildContext() {
    const panes = (Object.keys(PANE_LABELS) as Exclude<PaneId, "ficha">[]).map((id) => ({
      id,
      label: PANE_LABELS[id],
      done: !!completed[id],
    }));
    return {
      lotCode,
      stageLabel,
      panes,
      productName: data.product_name,
      species: data.species,
      estate: data.estate,
      varietyCount: data.varieties.filter((v) => num(v.pct) > 0).length,
      scaTotal,
      primaryDefect: num(data.fa_primary_defect),
      secondaryDefect: num(data.fa_secondary_defect),
    };
  }

  function handleResult(json: AdviceResponse) {
    setLoading(false);
    if (json.configured === false) {
      setConfigured(false);
    } else if (json.error) {
      setError(json.error);
    } else if (json.advice) {
      setAdvice(json.advice);
    }
  }

  function ask(force: boolean) {
    setLoading(true);
    setError(null);
    const context = buildContext();
    requestAdvice({ lotId, ...context, force }).then((json) => {
      handleResult(json);
      if (json.configured !== false && !json.error && json.advice) onAdviceUpdate(json.advice, context);
    });
  }

  if (!configured) {
    return (
      <div className={styles.widget}>
        <span className={styles.label}>¿Y ahora qué?</span>
        <p className={styles.muted}>Configura ANTHROPIC_API_KEY en el servidor para activar el asistente.</p>
      </div>
    );
  }

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.label}>¿Y ahora qué?</span>
        {advice && !loading && (
          <button className={styles.refresh} onClick={() => ask(true)} title="Actualizar recomendación">
            ↻
          </button>
        )}
      </div>
      {loading ? (
        <p className={styles.muted}>Pensando…</p>
      ) : error ? (
        <p className={styles.muted}>{error}</p>
      ) : advice ? (
        <p className={styles.advice}>{advice}</p>
      ) : (
        <>
          <p className={styles.muted}>Pida una recomendación puntual sobre el siguiente paso para este lote, cuando la necesite.</p>
          <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => ask(false)}>
            ¿Y ahora qué?
          </button>
        </>
      )}
    </div>
  );
}
