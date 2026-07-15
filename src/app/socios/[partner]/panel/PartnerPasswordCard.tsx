"use client";

import { useState } from "react";
import { changePartnerPassword } from "./actions";
import styles from "../socios.module.css";

export function PartnerPasswordCard() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await changePartnerPassword(pw, confirm);
    setLoading(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Contraseña actualizada." });
      setPw("");
      setConfirm("");
      setOpen(false);
    } else {
      setMsg({ ok: false, text: res.error });
    }
  }

  return (
    <div className={styles.card} style={{ marginBottom: 30, maxWidth: 460 }}>
      <div className={styles.cardK}>Seguridad</div>
      {msg && <span className={msg.ok ? undefined : styles.err} style={msg.ok ? { color: "#166534", fontSize: 13 } : undefined}>{msg.text}</span>}
      {!open ? (
        <p>
          Si tu contraseña es la temporal de la invitación, cámbiala ahora.{" "}
          <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => setOpen(true)}>
            Cambiar contraseña
          </button>
        </p>
      ) : (
        <form onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="npw">Nueva contraseña (mín. 10)</label>
            <input id="npw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={10} autoComplete="new-password" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="npw2">Confírmala</label>
            <input id="npw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={10} autoComplete="new-password" required />
          </div>
          <button className="btn btn-solid" type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Guardar"}
          </button>
          <button className="btn btn-sm" type="button" style={{ marginLeft: 8 }} onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
