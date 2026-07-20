"use client";

// ── Disponibilidad de las herramientas (2026-07-20, petición del owner) ──────
// Tablero para decidir DÓNDE se ve cada herramienta (Kaffetal Regal / Cherry
// Picked) y con qué NIVEL: "Default" la ve cualquier cuenta de esa superficie;
// "Plus" solo quien tiene el estatus (Pasaporte del Kaffetal Club en el lado
// productor; membresía por encima de 'verde' en Cherry Picked). El reparto
// vivía fijo en el código — ahora se administra aquí.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveToolsConfig } from "@/lib/tools/toolAccess";
import { ALL_TOOL_IDS, type ToolId, type ToolsConfig, type ToolTier } from "@/lib/tools/catalog";
import styles from "@/app/bcp/(app)/shared.module.css";

export function ToolsAdmin({
  initial,
  names,
}: {
  initial: ToolsConfig;
  names: Record<ToolId, string>;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<ToolsConfig>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = JSON.stringify(config) !== JSON.stringify(initial);

  const patch = (id: ToolId, next: Partial<ToolsConfig[ToolId]>) =>
    setConfig((c) => ({ ...c, [id]: { ...c[id], ...next } }));

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveToolsConfig(config);
      if (res.ok) {
        setMsg({ ok: true, text: "Disponibilidad guardada ✓" });
        router.refresh();
      } else setMsg({ ok: false, text: res.error });
    });
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 26 }}>
      <h2 style={{ fontSize: 16, margin: 0 }}>Disponibilidad</h2>
      <p className={styles.subtitle} style={{ marginTop: 6 }}>
        Dónde se ofrece cada herramienta y con qué nivel. <b>Default</b>: la ve cualquier cuenta de esa superficie.{" "}
        <b>Plus</b>: solo con Pasaporte del Kaffetal Club (productores) o membresía por encima de «verde» (Cherry
        Picked). Las herramientas internas del equipo se ven siempre aquí, sin importar esta tabla.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 460 }}>
          <thead>
            <tr>
              <th style={th}>Herramienta</th>
              <th style={{ ...th, textAlign: "center", width: 120 }}>Kaffetal Regal</th>
              <th style={{ ...th, textAlign: "center", width: 120 }}>Cherry Picked</th>
              <th style={{ ...th, width: 130 }}>Nivel</th>
            </tr>
          </thead>
          <tbody>
            {ALL_TOOL_IDS.map((id) => (
              <tr key={id}>
                <td style={td}>{names[id]}</td>
                <td style={{ ...td, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={config[id].kr}
                    onChange={(e) => patch(id, { kr: e.target.checked })}
                    aria-label={`${names[id]} en Kaffetal Regal`}
                  />
                </td>
                <td style={{ ...td, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={config[id].cp}
                    onChange={(e) => patch(id, { cp: e.target.checked })}
                    aria-label={`${names[id]} en Cherry Picked`}
                  />
                </td>
                <td style={td}>
                  <select
                    value={config[id].tier}
                    onChange={(e) => patch(id, { tier: e.target.value as ToolTier })}
                    aria-label={`Nivel de ${names[id]}`}
                  >
                    <option value="default">Default</option>
                    <option value="plus">Plus</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <button className="btn btn-sm btn-solid" disabled={pending || !dirty} onClick={save}>
          {pending ? "Guardando…" : "Guardar disponibilidad"}
        </button>
        {dirty && !pending && <span className={styles.meta}>Hay cambios sin guardar.</span>}
        {msg && (
          <span style={{ fontSize: 13, fontWeight: 600, color: msg.ok ? "var(--primary)" : "#B45309" }}>{msg.text}</span>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "2px solid var(--line)",
  fontFamily: "var(--font-spline-mono), monospace",
  fontSize: 10.5,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--muted)",
};
const td: React.CSSProperties = { padding: "8px", borderBottom: "1px solid var(--line)" };
