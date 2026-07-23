"use client";

import { useMemo, useState } from "react";
import { FincaModalRow } from "../fincas/FincaModalRow";
import { ProducerPanel, ModuleIcon, type ProducerData, type ModuleKey } from "./ProducerPanel";
import styles from "../shared.module.css";

// ── Tablero de Productores con filtros (2026-07-23) ──────────────────────────
// El servidor prepara TODO (segmentos + datos serializados + URLs firmadas de
// media) y este cliente sólo añade la interacción: filtros por País y por
// Departamento arriba, y abre el pop-up con pestañas (ProducerPanel). El conteo
// de cada columna refleja lo que queda visible tras el filtro.

export type BoardSegment = { id: string; label: string; producers: ProducerData[] };

export function ProductoresBoard({ segments }: { segments: BoardSegment[] }) {
  const all = useMemo(() => segments.flatMap((s) => s.producers), [segments]);
  const [pais, setPais] = useState<string | null>(null);
  const [depto, setDepto] = useState<string | null>(null);

  const paises = useMemo(
    () => [...new Set(all.map((p) => p.country).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b)),
    [all]
  );
  // Los departamentos dependen del país elegido — no tiene sentido ofrecer un
  // departamento de un país que no está seleccionado.
  const deptos = useMemo(() => {
    const pool = pais ? all.filter((p) => p.country === pais) : all;
    return [...new Set(pool.map((p) => p.department).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b));
  }, [all, pais]);

  const matches = (p: ProducerData) => (!pais || p.country === pais) && (!depto || p.department === depto);
  const totalVisible = all.filter(matches).length;

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <FilterRow label="País" value={pais} options={paises} onPick={(v) => { setPais(v); setDepto(null); }} />
        <FilterRow label="Departamento" value={depto} options={deptos} onPick={setDepto} />
      </div>

      {(pais || depto) && totalVisible === 0 && (
        <p className={styles.empty}>Ningún productor coincide con el filtro.</p>
      )}

      <div className={styles.board}>
        {segments.map((seg) => {
          const list = seg.producers.filter(matches);
          return (
            <div className={styles.column} key={seg.id}>
              <div className={styles.columnHead}>
                <h3>{seg.label}</h3>
                <span className={styles.columnCount}>{list.length}</span>
              </div>
              <div className={styles.columnList}>
                {!list.length && <p className={styles.empty}>—</p>}
                {list.map((p) => (
                  <FincaModalRow key={p.id} title={p.fullName || "Productor"} anchorId={`prod-${p.id}`} summary={<Summary p={p} />}>
                    <ProducerPanel data={p} />
                  </FincaModalRow>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterRow({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: string | null;
  options: string[];
  onPick: (v: string | null) => void;
}) {
  if (!options.length) return null;
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", width: 96, flex: "0 0 auto" }}>
        {label}
      </span>
      <Pill active={value === null} onClick={() => onPick(null)}>Todos</Pill>
      {options.map((o) => (
        <Pill key={o} active={value === o} onClick={() => onPick(o)}>
          {o}
        </Pill>
      ))}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
        border: `1.5px solid ${active ? "var(--primary)" : "var(--line)"}`,
        background: active ? "var(--primary)" : "transparent",
        color: active ? "#fff" : "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}

const MODULE_ORDER: { key: ModuleKey; label: string }[] = [
  { key: "general", label: "Información general" },
  { key: "fincas", label: "Fincas" },
  { key: "lotes", label: "Lotes" },
  { key: "arena", label: "Arena" },
  { key: "contratos", label: "Contratos" },
  { key: "comm", label: "Comunicación" },
];

function Summary({ p }: { p: ProducerData }) {
  return (
    <span style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      {p.media.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL firmada efímera; next/image no aporta aquí
        <img
          src={p.media.avatarUrl}
          alt=""
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto", border: "1.5px solid var(--line)" }}
        />
      ) : (
        <span
          aria-hidden
          style={{
            width: 40, height: 40, borderRadius: "50%", flex: "0 0 auto",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "var(--line)", fontWeight: 700, fontSize: 15,
          }}
        >
          {(p.fullName || "?").trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span style={{ minWidth: 0, flex: 1 }}>
        <b style={{ fontSize: 13.5, color: "var(--ink)", display: "block" }}>{p.fullName || "Sin nombre"}</b>
        <span className={styles.meta}>
          {p.companyName || "—"}
          {p.clubMemberSince ? " · Club ✓" : ""}
        </span>
        {/* Tira de estado por módulo: icono + contador + ✓/✗ (pedido del owner). */}
        <span style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 5 }}>
          {MODULE_ORDER.map(({ key, label }) => {
            const { count, state } = p.modules[key];
            const mark = state === "issue" ? "✗" : state === "ok" ? "✓" : null;
            const tip = `${label}${count != null ? ` · ${count}` : ""} · ${state === "issue" ? "requiere atención" : state === "ok" ? "en orden" : "sin registros"}`;
            return (
              <span
                key={key}
                title={tip}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 2.5, fontSize: 11,
                  color: state === "issue" ? "var(--red)" : "var(--muted)", opacity: state === "empty" ? 0.5 : 1,
                }}
              >
                <ModuleIcon k={key} size={13} />
                {count != null && <b style={{ fontWeight: 700 }}>{count}</b>}
                {mark && <span style={{ color: state === "issue" ? "var(--red)" : "var(--green)", fontWeight: 800, fontSize: 11.5 }}>{mark}</span>}
              </span>
            );
          })}
        </span>
      </span>
    </span>
  );
}
