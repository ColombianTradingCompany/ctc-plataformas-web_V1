"use client";

// ── El embudo de la competencia (2026-07-20, diagrama del owner) ─────────────
// Representación visual de la "Competition Structure" de la Kaffetal Regal
// Arena: ronda a ciegas (L1..Ln) → primer descarte (Red/Black) → revelación de
// variedad/proceso (sin decir cuál es cuál) → segundo descarte (Red/Blue) →
// revelación de origen → ronda final (1º/2º/3º, grados Red/Blue/Gold/Tyrian).
//
// A CIEGAS POR DISEÑO: mientras la sesión no esté culminada, las tarjetas
// muestran solo la etiqueta de taza. "Mirar bajo el capó" exige el ADMIN LOCK
// (contraseña, cambiable en ECP → Usuarios y Credenciales): las identidades no
// viajan al cliente en el render — las devuelve el servidor SOLO tras
// verificar la contraseña (revealSessionIdentities).

import Link from "next/link";
import { useState, useTransition } from "react";
import { revealSessionIdentities, type RevealedIdentity } from "../../adminLockActions";
import styles from "../../shared.module.css";

export type FunnelCup = {
  lotId: string;
  blindLabel: string; // "Taza 3" / "L4"
  /** null = sigue a ciegas; con valor = ya es público (sesión culminada). */
  publicName: string | null;
  grade: string | null; // grado ya asignado (descarte o veredicto)
  rank: number | null; // 1..3 en la ronda final
};

export type FunnelRound = { title: string; note: string; cups: FunnelCup[] };

const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };

function CupChip({ cup, identity }: { cup: FunnelCup; identity: RevealedIdentity | null }) {
  const revealed = cup.publicName ?? identity?.lotName ?? null;
  return (
    <span
      style={{
        display: "inline-flex", flexDirection: "column", gap: 2, alignItems: "center",
        border: "1.5px solid var(--line)", borderRadius: 10, padding: "8px 10px", minWidth: 74,
        background: "var(--card)", position: "relative",
      }}
    >
      <b style={{ fontSize: 12.5, fontFamily: "var(--font-spline-mono), monospace" }}>{cup.blindLabel}</b>
      {revealed ? (
        <Link href={`/bcp/lotes#lot-${cup.lotId}`} style={{ fontSize: 11, textDecoration: "underline", maxWidth: 120, textAlign: "center" }}>
          {revealed}
        </Link>
      ) : (
        <span style={{ fontSize: 11, color: "var(--muted)" }}>a ciegas</span>
      )}
      {identity?.producerName && !cup.publicName && (
        <span style={{ fontSize: 10, color: "var(--muted)" }}>{identity.producerName}</span>
      )}
      {cup.rank != null && <span style={{ fontSize: 11 }}>{cup.rank}º{cup.rank === 1 ? " 🏆" : ""}</span>}
      {cup.grade && (
        <span
          className={styles.badge}
          style={{ background: `var(--t-${cup.grade}, var(--line))`, color: "#fff" }}
        >
          {GRADE_LABEL[cup.grade] ?? cup.grade}
        </span>
      )}
    </span>
  );
}

export function SessionFunnel({
  sessionId,
  rounds,
  completed,
}: {
  sessionId: string;
  rounds: FunnelRound[];
  completed: boolean;
}) {
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [identities, setIdentities] = useState<Map<string, RevealedIdentity> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function unlock() {
    setError(null);
    start(async () => {
      const res = await revealSessionIdentities(sessionId, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setIdentities(new Map(res.identities.map((i) => [i.lotId, i])));
      setUnlockOpen(false);
      setPassword("");
    });
  }

  return (
    <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Estructura de la competencia</h3>
        {!completed &&
          (identities ? (
            <>
              <span className={`${styles.badge} ${styles.badgeWarn}`}>🔓 Identidades a la vista (solo usted)</span>
              <button className="btn btn-sm" onClick={() => setIdentities(null)}>
                Volver a ciegas
              </button>
            </>
          ) : (
            <button className="btn btn-sm" onClick={() => setUnlockOpen((v) => !v)}>
              🔒 Admin Lock — mirar bajo el capó
            </button>
          ))}
      </div>
      {unlockOpen && !identities && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <input
            type="password"
            placeholder="Contraseña del Admin Lock"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            style={{ maxWidth: 220 }}
          />
          <button className="btn btn-sm btn-solid" disabled={pending || !password} onClick={unlock}>
            {pending ? "Verificando…" : "Desbloquear"}
          </button>
          <span className={styles.meta}>Se cambia en ECP → Usuarios y Credenciales.</span>
        </div>
      )}
      {error && <p className={styles.warn} style={{ marginTop: 6 }}>{error}</p>}

      <div style={{ display: "grid", gap: 4, marginTop: 12 }}>
        {rounds.map((round, i) => (
          <div key={round.title}>
            {i > 0 && (
              // El estrechamiento del embudo entre rondas.
              <div aria-hidden style={{ display: "flex", justifyContent: "center", margin: "2px 0" }}>
                <div
                  style={{
                    width: `${Math.max(30, 86 - i * 18)}%`, height: 0,
                    borderLeft: "16px solid transparent", borderRight: "16px solid transparent",
                    borderTop: "12px solid var(--line)",
                  }}
                />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {round.cups.map((c) => (
                  <CupChip key={c.lotId} cup={c} identity={identities?.get(c.lotId) ?? null} />
                ))}
              </div>
            </div>
            <p className={styles.meta} style={{ textAlign: "center", margin: "4px 0 8px" }}>
              <b style={{ color: "var(--ink)" }}>{round.title}</b> · {round.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
