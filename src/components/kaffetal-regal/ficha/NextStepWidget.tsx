"use client";

import { useEffect, useState } from "react";
import { num, type FichaFormData } from "./fichaData";
import type { PaneId } from "./FichaNav";
import { stableStringify } from "@/lib/stableStringify";
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
  cachedContext,
  onAdviceUpdate,
}: {
  lotId: string;
  lotCode: string;
  stageLabel: string;
  data: FichaFormData;
  completed: Partial<Record<PaneId, boolean>>;
  scaTotal: number;
  cachedAdvice: string | null;
  cachedContext: Record<string, unknown> | null;
  onAdviceUpdate: (advice: string, context: Record<string, unknown>) => void;
}) {
  const [advice, setAdvice] = useState<string | null>(cachedAdvice);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(!cachedAdvice);
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

  useEffect(() => {
    // FichaView remounts this widget on every lot switch (keyed by lot id).
    // Client-side memoization: if the context that produced the cached advice
    // is byte-identical to the current one, skip the network call entirely --
    // no reason to re-derive advice from data that hasn't changed.
    const context = buildContext();
    if (cachedAdvice && stableStringify(context) === stableStringify(cachedContext)) {
      // Already reflected by the cachedAdvice-seeded initial state above -- nothing to do.
      return;
    }
    requestAdvice({ lotId, ...context }).then((json) => {
      handleResult(json);
      if (json.configured !== false && !json.error && json.advice) onAdviceUpdate(json.advice, context);
    });
    // Re-fetch only when switching lots -- not on every keystroke, to keep API calls bounded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotCode]);

  function refresh() {
    setLoading(true);
    setError(null);
    const context = buildContext();
    requestAdvice({ lotId, ...context, force: true }).then((json) => {
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
