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
import {
  GRADOS, SCA_MAXIMO, SCA_MINIMO, gradoPorPuntaje, escalaEsContinua, puntajeValido, redondeaPuntaje,
} from "@/lib/grados/definicion";
import styles from "@/components/panel/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";
import grados from "./gradosBoard.module.css";

export function GradosBoard() {
  const [sca, setSca] = useState("");
  const n = parseFloat(sca.replace(",", "."));
  const grado = sca.trim() === "" ? null : gradoPorPuntaje(n);
  const fuera = sca.trim() !== "" && grado === null;
  // Se aceptó el puntaje pero hubo que redondearlo: hay que decirlo, porque el
  // grado que se muestra no es el del número que se escribió.
  const redondeado = grado !== null && !puntajeValido(n);

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
        <div className={grados.panelHead}><strong>¿Qué grado le toca a un puntaje?</strong></div>
        <div className={styles.formGrid}>
          <div className={styles.field} style={{ minWidth: 160 }}>
            <label htmlFor="sca">Puntaje SCA</label>
            <input id="sca" inputMode="decimal" value={sca} placeholder="86.5" onChange={(e) => setSca(e.target.value)} />
          </div>
          {grado && (
            <div className={styles.field}>
              <label>Grado</label>
              <span className={grados.resultado} style={{ color: grado.hex }}>
                ⬤ {grado.nombre} <small>SCA {grado.scaMin}–{grado.scaMax}</small>
              </span>
            </div>
          )}
          {fuera && (
            <div className={styles.field}>
              <label>Grado</label>
              <span className={styles.warn}>
                Fuera de la escala. Por debajo de {SCA_MINIMO} no hay grado: no es que sea peor que Black, es que no
                entra como café de especialidad.
              </span>
            </div>
          )}
        </div>
        {redondeado && (
          <p className={styles.warn}>
            Los puntajes de la casa llevan <b>dos decimales como máximo</b>. Se ha tomado {redondeaPuntaje(n)}.
          </p>
        )}
        {/* Lo que hay que entender de esta calculadora: no propone, decide. */}
        <p className={styles.meta}>
          El puntaje <b>manda</b>: determina el grado y no se negocia. Los criterios cualitativos de cada grado —clase de
          lote, rareza de variedad, disponibilidad por malla— son guía de <b>valor dentro del rango</b>, no requisitos de
          entrada: un café de 88 en un macrolote de variedad común es Tyrian, y se cotiza en la parte baja de Tyrian.
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

        <div className={grados.panelHead} style={{ marginTop: 16 }}><strong>Las tres reglas</strong></div>
        <ul className={styles.auditList}>
          <li>
            <b>El puntaje manda.</b> El grado se lee del puntaje SCA y no se negocia. No es una banda dentro de la cual
            alguien elija después: es el grado.
          </li>
          <li>
            <b>Los criterios cualitativos son guía, no puerta.</b> Clase de lote, rareza de variedad y disponibilidad por
            malla no cambian el grado — orientan el valor <i>dentro</i> del rango. Un Blue de variedad exótica se cotiza
            arriba en Blue; sigue siendo Blue.
          </li>
          <li>
            <b>Dos decimales como máximo.</b> No existe un puntaje de 82.995. Es la regla que hace que la escala no tenga
            huecos: las bandas cierran en <code>.99</code>, así que un tercer decimal caería entre dos grados.
          </li>
        </ul>

        <div className={grados.panelHead} style={{ marginTop: 16 }}><strong>«Mix» no es un grado</strong></div>
        <p className={styles.meta}>
          El Cotizador Logístico ofrece «Mix» junto a los cinco grados: significa que la carga cotizada <b>no proviene de
          un solo grado</b>. Por eso no está en el enum <code>lot_grade</code> y no debe llegar nunca a un lote — un lote
          tiene un puntaje, y un puntaje tiene un grado. Vive donde tiene sentido: en una cotización, que puede cubrir
          varias calidades a la vez.
        </p>

        <div className={grados.panelHead} style={{ marginTop: 16 }}><strong>Lo que falta alinear</strong></div>
        <ul className={styles.auditList}>
          <li>
            <b>La Jornada de Arena.</b> Hoy el comité vota el grado directamente. Con la regla 1, lo que el comité aporta
            es el <i>puntaje</i> y el grado se deriva. No se ha tocado todavía: es un cambio en el flujo de la Jornada,
            no en esta definición.
          </li>
          <li>
            <b>Las dos páginas de Notion.</b> Siguen publicando umbrales viejos y contradictorios, y son material de
            cliente. Se actualizan desde aquí.
          </li>
        </ul>
      </div>
    </>
  );
}
