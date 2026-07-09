"use client";

import { useEffect, useState } from "react";
import { num, type FichaFormData } from "./fichaData";
import type { PaneId } from "./FichaNav";
import styles from "./NextStepWidget.module.css";

const PANE_LABELS: Record<Exclude<PaneId, "ficha">, string> = {
  a1: "Identidad y Comercio",
  a2: "Información de Origen",
  a3: "Certificados de Origen",
  a4: "Certificados Internacionales",
  b1: "Variedades y Básica",
  b2: "Perfil de Taza",
  b3: "Física y Granulometría",
  b4: "Notas y Q-Grader",
};

type AdviceResponse = { configured: boolean; advice?: string; error?: string };

async function requestAdvice(payload: unknown): Promise<AdviceResponse> {
  const res = await fetch("/api/kaffetal-regal/next-step", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export function NextStepWidget({
  lotCode,
  stageLabel,
  data,
  completed,
  scaTotal,
}: {
  lotCode: string;
  stageLabel: string;
  data: FichaFormData;
  completed: Partial<Record<PaneId, boolean>>;
  scaTotal: number;
}) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function buildPayload() {
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
    } else {
      setAdvice(json.advice ?? null);
    }
  }

  useEffect(() => {
    // FichaView remounts this widget on every lot switch (keyed by lot id), so
    // `loading`/`error` already start fresh -- this only needs to kick off the fetch.
    requestAdvice(buildPayload()).then(handleResult);
    // Re-fetch only when switching lots -- not on every keystroke, to keep API calls bounded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotCode]);

  function refresh() {
    setLoading(true);
    setError(null);
    requestAdvice(buildPayload()).then(handleResult);
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
        <button className={styles.refresh} onClick={refresh} disabled={loading} title="Actualizar recomendación">
          ↻
        </button>
      </div>
      {loading ? (
        <p className={styles.muted}>Pensando…</p>
      ) : error ? (
        <p className={styles.muted}>{error}</p>
      ) : (
        <p className={styles.advice}>{advice}</p>
      )}
    </div>
  );
}
