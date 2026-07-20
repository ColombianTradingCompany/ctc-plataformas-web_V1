"use client";

// ── Admin Lock (ECP → Usuarios y Credenciales) ───────────────────────────────
// El submenú donde el owner cambia la contraseña del candado suave que
// desbloquea información estructuralmente oculta por el diseño del flujo
// (p. ej. las identidades de una sesión de Arena a ciegas). Semilla: "123".

import { useState, useTransition } from "react";
import { setAdminLockPassword } from "@/app/bcp/(app)/adminLockActions";

export function AdminLockCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const res = await setAdminLockPassword(current, next);
      if (res.ok) {
        setMsg({ ok: true, text: "Contraseña del Admin Lock actualizada ✓" });
        setCurrent("");
        setNext("");
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginTop: 24 }}>
      <h2 style={{ fontSize: 16, margin: 0 }}>Admin Lock</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 14px" }}>
        La contraseña que desbloquea información oculta por diseño del flujo — hoy: mirar bajo el capó de una sesión de
        Arena a ciegas. No protege datos delicados (todo aquí ya está detrás del 2FA); solo evita revelar por accidente
        lo que el flujo quiere mantener tapado.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="password"
          placeholder="Contraseña actual"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          style={{ maxWidth: 200, padding: "9px 11px", border: "1.5px solid var(--line)", borderRadius: 8, background: "var(--paper)" }}
        />
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          style={{ maxWidth: 200, padding: "9px 11px", border: "1.5px solid var(--line)", borderRadius: 8, background: "var(--paper)" }}
        />
        <button className="btn btn-sm btn-solid" disabled={pending || !current || !next} onClick={save}>
          {pending ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </div>
      {msg && (
        <p style={{ marginTop: 8, fontSize: 13, color: msg.ok ? "var(--primary)" : "#B45309", fontWeight: 600 }}>{msg.text}</p>
      )}
    </div>
  );
}
