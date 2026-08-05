"use client";

// ── ECP · Grados de Calidad ──────────────────────────────────────────────────
// LA página de referencia. Existe porque los grados estaban definidos en tres
// sitios con tres respuestas distintas —y dos de ellas eran material que se le
// enseña a un cliente—. A partir de ahora: se mira aquí, y lo demás copia.
//
// Los datos salen de `src/lib/grados/definicion.ts`, que es la fuente única.
// Esta página no los guarda ni los edita: los MUESTRA. Cambiar un umbral es
// cambiar ese archivo, con su guardián (`scripts/qa-grados-check.mjs`)
// vigilando que la escala siga siendo continua.

import { useState } from "react";
import { GRADOS, SCA_MAXIMO, SCA_MINIMO, bandaPorPuntaje, escalaEsContinua } from "@/lib/grados/definicion";
import styles from "@/app/bcp/(app)/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";
import grados from "./gradosBoard.module.css";

export function GradosBoard() {
  const [sca, setSca] = useState("");
  const n = parseFloat(sca.replace(",", "."));
  const banda = sca.trim() === "" ? null : bandaPorPuntaje(n);
  const fuera = sca.trim() !== "" && banda === null;

  return (
    <>
      <h1 className={styles.title}>Grados de Calidad CTC</h1>
      <p className={styles.subtitle}>
        La escala de la casa, en un solo sitio. Cinco grados que cubren de {SCA_MINIMO} a {SCA_MAXIMO} SCA sin huecos.
        Todo lo que hable de grados —la Arena, el catálogo, los cotizadores, Notion— tiene que citar esto.
      </p>

      {/* ── La escalera ── */}
      <div className={grados.escalera}>
        {[...GRADOS].reverse().map((g) => (
          <article key={g.id} className={grados.grado} style={{ ["--g" as string]: g.hex }}>
            <header className={grados.head}>
              <span className={grados.chip} style={{ background: g.hex }} aria-hidden />
              <span className={grados.nombre}>{g.nombre}</span>
              <span className={grados.rango}>SCA {g.scaMin}–{g.scaMax}</span>
            </header>
            <p className={grados.lema}>{g.lema}</p>
            <ul className={grados.criterios}>
              {g.criterios.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </article>
        ))}
      </div>

      {/* ── Consulta rápida ── */}
      <div className={grados.panel}>
        <div className={grados.panelHead}><strong>¿Qué banda le toca a un puntaje?</strong></div>
        <div className={styles.formGrid}>
          <div className={styles.field} style={{ minWidth: 160 }}>
            <label htmlFor="sca">Puntaje SCA</label>
            <input id="sca" inputMode="decimal" value={sca} placeholder="86.5" onChange={(e) => setSca(e.target.value)} />
          </div>
          {banda && (
            <div className={styles.field}>
              <label>Banda</label>
              <span className={grados.resultado} style={{ color: banda.hex }}>
                ⬤ {banda.nombre} <small>SCA {banda.scaMin}–{banda.scaMax}</small>
              </span>
            </div>
          )}
          {fuera && (
            <div className={styles.field}>
              <label>Banda</label>
              <span className={styles.warn}>
                Fuera de la escala. Por debajo de {SCA_MINIMO} no hay grado: no es que sea peor que Black, es que no
                entra como café de especialidad.
              </span>
            </div>
          )}
        </div>
        {/* La advertencia importa más que la calculadora. */}
        <p className={styles.meta}>
          El puntaje da la <b>banda</b>, no el grado entero. Los criterios cualitativos son parte de la definición: un
          café de 88 en un macrolote de variedad común cumple la banda de Tyrian pero no su descripción. Hoy el grado lo
          otorga el comité en la Jornada de Arena; esto orienta.
        </p>
      </div>

      {/* ── Procedencia y decisiones abiertas ── */}
      <div className={grados.panel}>
        <div className={grados.panelHead}>
          <strong>De dónde salen estos números</strong>
          {escalaEsContinua() && <span className={styles.badgeGood}>escala continua</span>}
        </div>
        <p className={styles.meta}>
          Fijados por el owner el <b>5 de agosto de 2026</b>. Antes había <b>tres</b> definiciones distintas y ninguna
          coincidía con esta:
        </p>
        <div className={table.scroll}>
          <table className={table.t}>
            <thead>
              <tr><th>Fuente</th><th>Black</th><th>Red</th><th>Blue</th><th>Gold</th><th>Tyrian</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><span className={table.strong}>Oficial (esta)</span><small>desde 2026-08-05</small></td>
                <td>80–82.99</td><td>83–84.99</td><td>85–86.99</td><td>87–87.99</td><td>88–100</td>
              </tr>
              <tr>
                <td className={table.muted}>Notion · Conceptos Fundamentales<small>desactualizada</small></td>
                <td className={table.muted}>80+</td><td className={table.muted}>84+</td>
                <td className={table.muted}>85+</td><td className={table.muted}>87+</td><td className={table.muted}>89+</td>
              </tr>
              <tr>
                <td className={table.muted}>Notion · Pitch Go To Market<small>desactualizada</small></td>
                <td className={table.muted}>80+</td><td className={table.muted}>84+</td>
                <td className={table.muted}>86+</td><td className={table.muted}>88+</td><td className={table.muted}>91+</td>
              </tr>
              <tr>
                <td className={table.muted}>La plataforma (antes)<small>sin umbrales</small></td>
                <td className={table.muted} colSpan={5}>El comité asignaba el grado; el puntaje vivía aparte</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={styles.warn}>
          Las dos páginas de Notion siguen diciendo lo viejo. Hay que actualizarlas <b>desde aquí</b> — es la dirección
          correcta del espejo (ver el plan de integraciones).
        </p>

        <div className={grados.panelHead} style={{ marginTop: 16 }}><strong>Decisiones abiertas</strong></div>
        <ul className={styles.auditList}>
          <li>
            <b>¿El puntaje ES el grado, o solo la banda?</b> Los criterios cualitativos sugieren que el comité decide
            dentro de la banda, y la Jornada está construida sobre voto de comité. Mientras no se cierre, manda la Jornada.
          </li>
          <li>
            <b>«Mix»</b> existe hoy solo en el Cotizador Logístico, no en el enum <code>lot_grade</code>. Falta decidir
            si es un grado, un concepto de empaque, o una comodidad de cotización que nunca debe llegar a un lote.
          </li>
        </ul>
      </div>
    </>
  );
}
