"use client";

// Secciones "Aptos" y "No aptos" bajo el kanban de intake (2026-07-20):
// reemplazan la vieja tira "Aptos · rumbo a la Arena". Cada sección filtra por
// TEMPORADA DE REGISTRO del lote (lots.season_id) — la temporada es la unidad
// de participación (máximo 2 por lote, regla validada en la postulación).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revertNoApto } from "../actions";
import { PostularOnBehalfButton } from "../nominados/NominadosClient";
import styles from "../shared.module.css";

export type SectionLot = {
  id: string;
  name: string;
  reference: string;
  producerName: string;
  seasonId: string | null;
  seasonLabel: string;
  /** Aptos: ¿ya está postulado? (con inscripción) */
  postulated?: boolean;
  /** No aptos: la razón del veredicto. */
  reason?: string | null;
};

function SeasonFilter({
  seasons,
  active,
  onChange,
}: {
  seasons: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 10px" }}>
      {[{ id: "todas", label: "Todas las temporadas" }, ...seasons].map((s) => (
        <button
          key={s.id}
          type="button"
          className={styles.badge}
          style={{
            cursor: "pointer",
            border: "1px solid var(--line)",
            background: active === s.id ? "var(--primary)" : undefined,
            color: active === s.id ? "#fff" : undefined,
          }}
          onClick={() => onChange(s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function RevertNoAptoButton({ lotId }: { lotId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <button
        className="btn btn-sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await revertNoApto(lotId);
            if (res.ok) router.refresh();
            else setError(res.error);
          });
        }}
      >
        {pending ? "Reabriendo…" : "Reabrir evaluación"}
      </button>
      {error && <span className={styles.warn}> {error}</span>}
    </span>
  );
}

export function AptosNoAptosSections({
  aptos,
  noAptos,
  seasons,
}: {
  aptos: SectionLot[];
  noAptos: SectionLot[];
  seasons: { id: string; label: string }[];
}) {
  const [aptosSeason, setAptosSeason] = useState("todas");
  const [noAptosSeason, setNoAptosSeason] = useState("todas");

  const filtered = (list: SectionLot[], season: string) =>
    season === "todas" ? list : list.filter((l) => l.seasonId === season);

  const fAptos = filtered(aptos, aptosSeason);
  const fNoAptos = filtered(noAptos, noAptosSeason);

  return (
    <>
      <div style={{ marginTop: 30 }} id="aptos">
        <h2 style={{ fontSize: 17, marginBottom: 2 }}>Aptos</h2>
        <p className={styles.subtitle} style={{ marginTop: 0 }}>
          Superaron la evaluación documental — la postulación a la Arena es del productor (o de CTC en su nombre).
        </p>
        <SeasonFilter seasons={seasons} active={aptosSeason} onChange={setAptosSeason} />
        {!fAptos.length ? (
          <p className={styles.empty}>Sin lotes aptos en esta temporada.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {fAptos.map((l) => (
              <div key={l.id} id={`lot-${l.id}`} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <b>{l.name}</b>
                  <span className={`${styles.badge} mono`}>{l.reference}</span>
                  <span className={styles.badge}>{l.seasonLabel}</span>
                  {l.postulated && <span className={`${styles.badge} ${styles.badgeGood}`}>Postulado ✓ · en Nominados</span>}
                </div>
                <p className={styles.meta}>{l.producerName}</p>
                {!l.postulated && <PostularOnBehalfButton lotId={l.id} />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 26 }} id="no-aptos">
        <h2 style={{ fontSize: 17, marginBottom: 2 }}>No aptos</h2>
        <p className={styles.subtitle} style={{ marginTop: 0 }}>
          El veredicto puede reabrirse — la razón queda visible para el productor mientras tanto.
        </p>
        <SeasonFilter seasons={seasons} active={noAptosSeason} onChange={setNoAptosSeason} />
        {!fNoAptos.length ? (
          <p className={styles.empty}>Sin lotes no aptos en esta temporada.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {fNoAptos.map((l) => (
              <div key={l.id} id={`lot-${l.id}`} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <b>{l.name}</b>
                  <span className={`${styles.badge} mono`}>{l.reference}</span>
                  <span className={styles.badge}>{l.seasonLabel}</span>
                </div>
                <p className={styles.meta}>
                  {l.producerName} · Motivo: {l.reason || "—"}
                </p>
                <div>
                  <RevertNoAptoButton lotId={l.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
