"use client";

import { useState, useTransition } from "react";
import { marcarContactado } from "./interesActions";
import styles from "@/components/panel/shared.module.css";

// Una fila de la lista de espera. El botón es la única escritura del módulo, y
// va en los dos sentidos: en una jornada de envíos, marcar de más es tan fácil
// como marcar de menos.
export function InteresRow({
  id,
  email,
  idioma,
  desde,
  contactado,
  contactadoEl,
}: {
  id: string;
  email: string;
  idioma: string;
  desde: string;
  contactado: boolean;
  contactadoEl?: string | null;
}) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const alterna = () => {
    setError(null);
    startTransition(async () => {
      const r = await marcarContactado(id, !contactado);
      if (!r.ok) setError(r.error);
    });
  };

  return (
    <div className={styles.card} style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div>
        <h3 style={{ margin: 0 }}>
          <a href={`mailto:${email}`}>{email}</a>
        </h3>
        <p className={styles.meta} style={{ margin: "2px 0 0" }}>
          {idioma} · en la lista desde el {desde}
          {contactado && contactadoEl && <> · contactado el {contactadoEl}</>}
        </p>
        {error && (
          <p className={styles.meta} style={{ margin: "4px 0 0", color: "var(--accent)" }}>
            {error}
          </p>
        )}
      </div>
      {/* Clases GLOBALES `btn btn-sm`, como el resto de botones de las consolas:
          shared.module.css no define `.btn`, y `styles.btn` habría salido
          `undefined` — un botón sin estilo y sin que nada fallara. */}
      <button type="button" className="btn btn-sm" onClick={alterna} disabled={pendiente}>
        {contactado ? "Marcar sin contactar" : "Marcar contactado"}
      </button>
    </div>
  );
}
