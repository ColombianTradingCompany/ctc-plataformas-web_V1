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
  detalle,
  onToggle,
}: {
  id: string;
  email: string;
  /** Se omite cuando la lista no guarda idioma (Terratalento). */
  idioma?: string | null;
  desde: string;
  contactado: boolean;
  contactadoEl?: string | null;
  /** El campo propio de la fuente, ya rotulado («Especialidad: Barista»).
   *  A6, 2026-08-19 — sin fuente que lo traiga, la fila se ve como siempre. */
  detalle?: string | null;
  /** Quién escribe el «contactado». Por defecto la lista de espera de
   *  `newsletter_subscribers`; Terratalento pasa la suya porque vive en otra
   *  tabla y la fila, por dentro, es la misma. */
  onToggle?: (id: string, contactado: boolean) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const alterna = () => {
    setError(null);
    startTransition(async () => {
      const r = await (onToggle ?? marcarContactado)(id, !contactado);
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
          {detalle && <><b>{detalle}</b> · </>}
          {idioma && <>{idioma} · </>}
          en la lista desde el {desde}
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
