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
//
// V5.160 (owner, 2026-10-06): «La definición de la franja SCA es OBSOLETA. Debemos retirarla de TODOS LADOS y dejar solo la
// regla del Punto y la Tríada.» Cada grado es una banda de PUNTOS; los puntos salen del Punto SCA de la taza por el
// multiplicador de la tríada (variedad · proceso · reconocimiento). La calculadora de abajo pide las dos cosas.

import { useState } from "react";
import Link from "next/link";
import {
  GRADOS, PUNTOS_MAX, PUNTOS_MIN, SCA_MAXIMO, SCA_MINIMO, escalaEsContinua, gradoDelLote, puntajeValido, redondeaPuntaje,
} from "@/lib/grados/definicion";
import { ATRIBUTOS, K, NIVELES, ORDEN_TRIADA, letras, type Atributo, type Nivel, type Triada } from "@/lib/pvc/escala";
import styles from "@/components/panel/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";
import grados from "./gradosBoard.module.css";

const fmt = (n: number) => n.toLocaleString("es-CO");

export function GradosBoard() {
  const [sca, setSca] = useState("");
  const [t, setT] = useState<Triada>({ variedad: "C", proceso: "C", reconocimiento: "C" });
  const n = parseFloat(sca.replace(",", "."));
  const r = sca.trim() === "" || !Number.isFinite(n) ? null : gradoDelLote(n, t);
  const grado = r?.grado ?? null;
  const fuera = r !== null && grado === null;
  // Se aceptó el puntaje pero hubo que redondearlo: hay que decirlo, porque el
  // grado que se muestra no es el del número que se escribió.
  const redondeado = grado !== null && !puntajeValido(n);
  const pon = (a: Atributo, v: Nivel) => setT((x) => ({ ...x, [a]: v }));

  return (
    <>
      <h1 className={styles.title}>Grados de Calidad CTC</h1>
      <p className={styles.subtitle}>
        La escala de la casa, en un solo sitio: <b>El Punto y la Tríada</b>. Cinco bandas de puntos que cubren de {fmt(PUNTOS_MIN)} a{" "}
        {fmt(PUNTOS_MAX)} sin huecos; los puntos salen del Punto SCA de la taza ({SCA_MINIMO}–{SCA_MAXIMO}) por el multiplicador de
        la tríada. Todo lo que hable de grados —la Arena, el catálogo, los cotizadores, Notion— tiene que citar esto.
      </p>

      {/* ── La escalera ── */}
      <div className={grados.escalera}>
        {[...GRADOS].reverse().map((g) => (
          <article key={g.id} className={grados.grado} style={{ ["--g" as string]: g.hex }}>
            <header className={grados.head}>
              <span className={grados.chip} style={{ background: g.hex }} aria-hidden />
              <span className={grados.nombre}>{g.nombre}</span>
              <span className={grados.rango}>
                {fmt(g.puntosMin)}–{fmt(g.puntosMax)} pts · {g.scaDesdeComun != null ? `café común desde SCA ${g.scaDesdeComun}` : "SCA ≥ 89 + surplus"}
              </span>
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
        <div className={grados.panelHead}><strong>¿Qué grado le toca a un lote?</strong></div>
        <div className={styles.formGrid}>
          <div className={styles.field} style={{ minWidth: 160 }}>
            <label htmlFor="sca">Punto SCA de la taza</label>
            <input id="sca" inputMode="decimal" value={sca} placeholder="86.5" onChange={(e) => setSca(e.target.value)} />
          </div>
          {ORDEN_TRIADA.map((a) => (
            <div key={a} className={styles.field}>
              <label>{ATRIBUTOS[a].nombre}</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="group" aria-label={ATRIBUTOS[a].nombre}>
                {NIVELES.map((v) => (
                  <button key={v} type="button" className={`btn btn-sm${t[a] === v ? " btn-solid" : ""}`} onClick={() => pon(a, v)} aria-pressed={t[a] === v} title={ATRIBUTOS[a].niveles[v]}>
                    {v} <small>{ATRIBUTOS[a].niveles[v]}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {r && grado && (
            <div className={styles.field}>
              <label>Grado</label>
              <span className={grados.resultado} style={{ color: grado.hex }}>
                ⬤ {grado.nombre} <small>{fmt(r.puntaje.puntos)} pts · tríada {letras(t)} · base {fmt(Math.round(r.puntaje.base))} × {r.puntaje.mult.toFixed(4)}</small>
              </span>
            </div>
          )}
          {fuera && r && (
            <div className={styles.field}>
              <label>Grado</label>
              <span className={styles.warn}>
                Sin grado: {fmt(r.puntaje.puntos)} puntos no llegan a Black ({fmt(PUNTOS_MIN)}).{" "}
                {n < SCA_MINIMO ? `Por debajo de ${SCA_MINIMO} no es café de especialidad y ningún surplus lo salva.` : "Un café común entra desde SCA 82; con al menos una letra B o A entra desde 80."}
              </span>
            </div>
          )}
        </div>
        {redondeado && (
          <p className={styles.warn}>
            Los puntajes de la casa llevan <b>dos decimales como máximo</b>. Se ha tomado {redondeaPuntaje(n)}.
          </p>
        )}
        <p className={styles.meta}>
          Los puntos <b>mandan</b>: determinan el grado y no se negocian. La tríada entra en el grado (cada B suma +{(K * 100).toFixed(2)} % y cada A +{(2 * K * 100).toFixed(2)} %);
          la clase de lote y la disponibilidad por malla siguen siendo guía de <b>valor dentro de la banda</b>. Tyrian exige SCA ≥ 89 <i>y</i> surplus; un café común
          nunca es Tyrian. La doctrina completa y la curva viven en <Link href="/ecp/pvc">Modelo Económico · El Punto y la Tríada</Link>.
        </p>
      </div>

      {/* ── Procedencia y decisiones abiertas ── */}
      <div className={grados.panel}>
        <div className={grados.panelHead}>
          <strong>De dónde salen estos números</strong>
          {escalaEsContinua() && <span className={styles.badgeGood}>escala continua</span>}
        </div>
        <p className={styles.meta}>
          La escala de puntos la decidió el owner el <b>15 de septiembre de 2026</b> (plan PVC, decisión #1) y la puso a gobernar el{" "}
          <b>6 de octubre de 2026</b> (V5.160). Antes hubo <b>cuatro</b> definiciones, todas por puntaje SCA solo:
        </p>
        <div className={table.scroll}>
          <table className={table.t}>
            <thead>
              <tr><th>Fuente</th><th>Black</th><th>Red</th><th>Blue</th><th>Gold</th><th>Tyrian</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><span className={table.strong}>Oficial (esta)</span><small>puntos CTC · desde 2026-10-06</small></td>
                {/* ⚠️ Esta fila SE LEE de `definicion.ts`, no se escribe a mano. */}
                {GRADOS.map((g) => (
                  <td key={g.id}>
                    {fmt(g.puntosMin)}–{fmt(g.puntosMax)}
                    <small>{g.scaDesdeComun != null ? `común desde ${g.scaDesdeComun}` : "≥ 89 + surplus"}</small>
                  </td>
                ))}
              </tr>
              <tr>
                <td className={table.muted}>SCA de dos en dos<small>2026-08-19 → 2026-10-06 · obsoleta</small></td>
                <td className={table.muted}>80–81.99</td><td className={table.muted}>82–83.99</td>
                <td className={table.muted}>84–85.99</td><td className={table.muted}>86–87.99</td><td className={table.muted}>88+</td>
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
            <b>Los puntos mandan.</b> El grado se lee de los puntos CTC y no se negocia. No es una banda dentro de la cual
            alguien elija después: es el grado.
          </li>
          <li>
            <b>La tríada entra en el grado.</b> Variedad, proceso y reconocimiento multiplican el Punto de la taza: la misma
            taza vale más cuanto más tiene que contar. La clase de lote y la disponibilidad por malla siguen siendo guía de
            valor <i>dentro</i> de la banda.
          </li>
          <li>
            <b>Dos decimales como máximo</b> en el Punto SCA. No existe un puntaje de 81.995.
          </li>
        </ul>

        <div className={grados.panelHead} style={{ marginTop: 16 }}><strong>«Mix» no es un grado</strong></div>
        <p className={styles.meta}>
          El Cotizador Logístico ofrece «Mix» junto a los cinco grados: significa que la carga cotizada <b>no proviene de
          un solo grado</b>. Por eso no está en el enum <code>lot_grade</code> y no debe llegar nunca a un lote — un lote
          tiene unos puntos, y unos puntos tienen un grado. Vive donde tiene sentido: en una cotización, que puede cubrir
          varias calidades a la vez.
        </p>

        <div className={grados.panelHead} style={{ marginTop: 16 }}><strong>Lo que falta alinear</strong></div>
        <ul className={styles.auditList}>
          <li>
            <b>La tríada de un lote</b> se deriva de su Ficha (variedad contra el catálogo semilla, proceso por sus
            palabras, reconocimientos contados). Cuando el comité publique el marco de mercado, la variedad se lee de ahí.
          </li>
          <li>
            <b>La Base física</b> (factor, humedad, densidad) da el derecho al grado y no da puntos. Se exhibe; todavía no
            cierra la puerta.
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
