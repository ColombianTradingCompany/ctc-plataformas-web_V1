"use client";

import { useState } from "react";
import styles from "./TipografiaLab.module.css";

// ── El laboratorio ───────────────────────────────────────────────────────────
// Un titular de verdad sobre el fondo de verdad, y mandos para moverlo. Todo el
// estado vive aquí: no guarda nada, no llama a nada, no toca la base. Se cierra
// la pestaña y no queda rastro — es una mesa de pruebas, no un módulo.

export type FontOption = {
  id: string;
  name: string;
  note: string;
  varName: string;
  hasItalic: boolean;
  weights: number[];
};

type Lang = "es" | "en" | "de";

/** El titular real de CTC Home, partido donde lo parte el componente. */
const H1: Record<Lang, { plain: string; em: string }> = {
  es: { plain: "Un ecosistema para que el café colombiano viaje ", em: "con nombre propio." },
  en: { plain: "An ecosystem so Colombian coffee travels ", em: "under its own name." },
  de: { plain: "Ein Ökosystem, damit kolumbianischer Kaffee ", em: "unter eigenem Namen reist." },
};

/** La palabra a resaltar en cada lengua — es la que el owner quiere mirar. */
const CAFE: Record<Lang, string> = { es: "café", en: "coffee", de: "Kaffee" };

const LANG_NAME: Record<Lang, string> = { es: "Español", en: "English", de: "Deutsch" };

/** Parte el texto en trozos para poder pintar SOLO la palabra del café.
 *  Insensible a mayúsculas y a acentos no hace falta: las tres palabras se
 *  escriben en el titular exactamente como en CAFE. */
function splitOnWord(text: string, word: string): { chunk: string; hit: boolean }[] {
  const i = text.indexOf(word);
  if (i < 0) return [{ chunk: text, hit: false }];
  return [
    { chunk: text.slice(0, i), hit: false },
    { chunk: word, hit: true },
    { chunk: text.slice(i + word.length), hit: false },
  ].filter((p) => p.chunk.length > 0);
}

export function TipografiaLab({ fonts }: { fonts: FontOption[] }) {
  const [fontId, setFontId] = useState(fonts[0].id);
  const [size, setSize] = useState(62);
  const [weight, setWeight] = useState(700);
  const [tracking, setTracking] = useState(-1);
  const [leading, setLeading] = useState(1.08);
  const [lang, setLang] = useState<Lang>("es");
  const [emItalic, setEmItalic] = useState(true);
  const [cafeAccent, setCafeAccent] = useState(false);
  const [cafeItalic, setCafeItalic] = useState(false);

  const font = fonts.find((f) => f.id === fontId) ?? fonts[0];
  const t = H1[lang];

  // Si la familia elegida no trae el peso que había puesto, se cae al más
  // cercano en vez de pedirle al navegador que engorde la letra a mano.
  const usableWeight = font.weights.includes(weight)
    ? weight
    : font.weights.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a));

  const headStyle: React.CSSProperties = {
    fontFamily: `var(${font.varName}), Georgia, serif`,
    fontSize: `${size}px`,
    fontWeight: usableWeight,
    letterSpacing: `${tracking / 100}em`,
    lineHeight: leading,
  };

  const cafeStyle: React.CSSProperties = {
    color: cafeAccent ? "#F7D287" : undefined,
    fontStyle: cafeItalic && font.hasItalic ? "italic" : undefined,
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.kicker}>CTC Home · Hero · Laboratorio del titular</p>
        <h1 className={styles.pageH1}>Prueba el titular</h1>
        <p className={styles.sub}>
          El titular de verdad sobre el fondo de verdad. Mueve los mandos y mira. Nada de lo que hagas aquí se guarda ni
          se publica: cuando tengas el que quieres, dime la familia y los números y lo dejo montado.
        </p>
      </header>

      {/* El escenario, con el mismo velo de dos capas que el hero real. */}
      <section className={styles.stage} aria-label="Vista previa">
        <div className={styles.stageIn}>
          <h2 className={styles.preview} style={headStyle}>
            {splitOnWord(t.plain, CAFE[lang]).map((p, i) => (
              <span key={i} style={p.hit ? cafeStyle : undefined}>
                {p.chunk}
              </span>
            ))}
            <em className={styles.em} style={{ fontStyle: emItalic && font.hasItalic ? "italic" : "normal" }}>
              {t.em}
            </em>
          </h2>
        </div>
      </section>

      <section className={styles.panel}>
        {/* ── Familia ──────────────────────────────────────────────────────── */}
        <div className={styles.group}>
          <p className={styles.groupLabel}>Familia</p>
          <div className={styles.fontGrid}>
            {fonts.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`${styles.fontCard} ${f.id === fontId ? styles.fontCardOn : ""}`}
                onClick={() => setFontId(f.id)}
                aria-pressed={f.id === fontId}
              >
                <span className={styles.fontSample} style={{ fontFamily: `var(${f.varName}), Georgia, serif` }}>
                  {CAFE[lang]}
                </span>
                <span className={styles.fontName}>{f.name}</span>
                <span className={styles.fontNote}>{f.note}</span>
                {!f.hasItalic && <span className={styles.fontFlag}>sin cursiva</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ── Números ──────────────────────────────────────────────────────── */}
        <div className={styles.group}>
          <p className={styles.groupLabel}>Ajustes</p>
          <div className={styles.sliders}>
            <label className={styles.slider}>
              <span>
                Tamaño <b>{size} px</b>
              </span>
              <input type="range" min={32} max={96} step={1} value={size} onChange={(e) => setSize(+e.target.value)} />
            </label>

            <label className={styles.slider}>
              <span>
                Grosor <b>{usableWeight}</b>
                {usableWeight !== weight && <i className={styles.warn}> · la familia no trae {weight}</i>}
              </span>
              <input type="range" min={400} max={900} step={100} value={weight} onChange={(e) => setWeight(+e.target.value)} />
            </label>

            <label className={styles.slider}>
              <span>
                Espaciado <b>{(tracking / 100).toFixed(3)} em</b>
              </span>
              <input type="range" min={-5} max={5} step={0.5} value={tracking} onChange={(e) => setTracking(+e.target.value)} />
            </label>

            <label className={styles.slider}>
              <span>
                Interlínea <b>{leading.toFixed(2)}</b>
              </span>
              <input type="range" min={0.9} max={1.5} step={0.01} value={leading} onChange={(e) => setLeading(+e.target.value)} />
            </label>
          </div>
        </div>

        {/* ── Lengua y tratamientos ────────────────────────────────────────── */}
        <div className={styles.group}>
          <p className={styles.groupLabel}>Lengua y tratamiento</p>
          <div className={styles.chips}>
            {(Object.keys(H1) as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                className={`${styles.chip} ${l === lang ? styles.chipOn : ""}`}
                onClick={() => setLang(l)}
                aria-pressed={l === lang}
              >
                {LANG_NAME[l]}
              </button>
            ))}
          </div>
          <div className={styles.chips}>
            <button
              type="button"
              className={`${styles.chip} ${emItalic ? styles.chipOn : ""}`}
              onClick={() => setEmItalic((v) => !v)}
              aria-pressed={emItalic}
              disabled={!font.hasItalic}
            >
              Cierre en cursiva
            </button>
            <button
              type="button"
              className={`${styles.chip} ${cafeAccent ? styles.chipOn : ""}`}
              onClick={() => setCafeAccent((v) => !v)}
              aria-pressed={cafeAccent}
            >
              «{CAFE[lang]}» en oro
            </button>
            <button
              type="button"
              className={`${styles.chip} ${cafeItalic ? styles.chipOn : ""}`}
              onClick={() => setCafeItalic((v) => !v)}
              aria-pressed={cafeItalic}
              disabled={!font.hasItalic}
            >
              «{CAFE[lang]}» en cursiva
            </button>
          </div>
        </div>

        {/* Lo que hay que decirme para montarlo. */}
        <div className={styles.recipe}>
          <p className={styles.groupLabel}>La receta de lo que estás viendo</p>
          <code>
            {font.name} · {usableWeight} · {size}px · {(tracking / 100).toFixed(3)}em · interlínea {leading.toFixed(2)}
            {emItalic && font.hasItalic ? " · cierre en cursiva" : ""}
            {cafeAccent ? ` · «${CAFE[lang]}» en oro` : ""}
            {cafeItalic && font.hasItalic ? ` · «${CAFE[lang]}» en cursiva` : ""}
          </code>
          <p className={styles.recipeNote}>
            El tamaño real del hero no es fijo: crece con la pantalla (<code>clamp</code>), y {size} px es el techo en
            escritorio. Si eliges un tamaño, lo traduzco a esa escala.
          </p>
        </div>
      </section>
    </div>
  );
}
