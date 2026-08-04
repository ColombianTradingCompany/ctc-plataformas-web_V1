"use client";

// ── OCP · Cotizaciones · a quién va dirigida ─────────────────────────────────
// Busca a la vez en productores, compradores y leads. NO impone quién puede
// recibir qué: el cotizador de lotes suele apuntar a un productor y el logístico
// a un cliente, pero la vía Co-Create cotiza logística para un productor y eso
// tiene que caber.
//
// El nombre se COPIA a la cotización al elegirlo. Si el perfil cambia de razón
// social o se borra, el papel que se envió sigue diciendo a quién se le hizo.

import { useState } from "react";
import { searchCounterparties, setQuoteCounterparty } from "@/lib/cotizador/actions";
import { COUNTERPARTY_LABEL, type Counterparty, type CounterpartyOption } from "@/lib/cotizador/types";
import styles from "@/app/bcp/(app)/shared.module.css";

export function CounterpartyPicker({
  quoteId,
  current,
  locked,
  onChanged,
}: {
  quoteId: string;
  current: Counterparty;
  /** Emitida ⇒ solo lectura: el destinatario es parte de lo que se congeló. */
  locked: boolean;
  onChanged: () => void;
}) {
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<CounterpartyOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState({ name: "", email: "" });

  async function find() {
    setBusy(true);
    setError("");
    setHits(await searchCounterparties(term));
    setBusy(false);
  }

  async function assign(cp: Parameters<typeof setQuoteCounterparty>[1]) {
    setBusy(true);
    setError("");
    const r = await setQuoteCounterparty(quoteId, cp);
    setBusy(false);
    if (!r.ok) setError(r.error);
    else {
      setHits(null);
      setTerm("");
      onChanged();
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.sectionHead}>
        <strong>Destinatario</strong>
        {current.name && <span className={styles.badge}>{COUNTERPARTY_LABEL[current.kind]}</span>}
      </div>

      {current.name ? (
        <p className={styles.meta}>
          <strong>{current.name}</strong>
          {current.email ? ` · ${current.email}` : ""}
          {current.currentName && current.currentName !== current.name && (
            <>
              <br />
              <em>La cuenta hoy se llama «{current.currentName}»; la cotización conserva el nombre de cuando se hizo.</em>
            </>
          )}
        </p>
      ) : (
        <p className={styles.meta}>
          <em>Sin destinatario todavía.</em> Búscalo entre productores, compradores y leads, o escríbelo a mano si aún no existe en el sistema.
        </p>
      )}

      {locked ? (
        <p className={styles.meta}>La cotización ya está emitida: el destinatario queda fijo. Duplícala para cambiarlo.</p>
      ) : (
        <>
          <div className={styles.formGrid}>
            <div className={styles.field} style={{ flex: 1, minWidth: 220 }}>
              <label htmlFor="cpq">Buscar por nombre o correo</label>
              <input
                id="cpq"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void find();
                  }
                }}
                placeholder="Mínimo 2 caracteres"
              />
            </div>
            <button className="btn btn-sm" type="button" onClick={find} disabled={busy || term.trim().length < 2}>
              Buscar
            </button>
          </div>

          {hits !== null && (
            hits.length === 0 ? (
              <p className={styles.meta}>Nadie con ese nombre. Puedes escribirlo a mano abajo.</p>
            ) : (
              <div className={styles.list}>
                {hits.map((h) => (
                  <div key={`${h.kind}-${h.profileId ?? h.leadId}`} className={styles.fincaRow}>
                    <span>
                      <strong>{h.name}</strong>{" "}
                      <span className={styles.badge}>{COUNTERPARTY_LABEL[h.kind]}</span>
                      {h.hint && <span className={styles.meta}> · {h.hint}</span>}
                      {h.email && <span className={styles.meta}> · {h.email}</span>}
                    </span>
                    <button
                      className="btn btn-sm btn-solid"
                      type="button"
                      disabled={busy}
                      onClick={() => assign({ kind: h.kind, profileId: h.profileId, leadId: h.leadId, name: h.name, email: h.email })}
                    >
                      Elegir
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          <div className={styles.formGrid} style={{ marginTop: 10 }}>
            <div className={styles.field} style={{ minWidth: 180 }}>
              <label htmlFor="cpn">O a nombre de</label>
              <input id="cpn" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Contacto externo" />
            </div>
            <div className={styles.field} style={{ minWidth: 180 }}>
              <label htmlFor="cpe">Correo</label>
              <input id="cpe" type="email" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} placeholder="opcional" />
            </div>
            <button
              className="btn btn-sm"
              type="button"
              disabled={busy || !manual.name.trim()}
              onClick={() => assign({ kind: "externo", name: manual.name, email: manual.email })}
            >
              Asignar
            </button>
          </div>
        </>
      )}

      {error && <p className={styles.warn}>{error}</p>}
    </div>
  );
}
