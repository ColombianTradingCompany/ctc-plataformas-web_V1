"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./TipografiaLab.module.css";

// ── Laboratorio de UNA palabra ───────────────────────────────────────────────
// El encargo, en corto: el titular del hero se queda EXACTAMENTE donde está, con
// su tipografía y su tamaño, y lo único que se puede tocar es la palabra «café».
//
// Por eso la frase de la vista previa no tiene mandos: hereda `h1` de
// globals.css (Fraunces, 700, interlínea 1.1) y el mismo `clamp()` que el hero
// real. Cambiar el titular entero NO es lo que se pidió, y poder hacerlo aquí
// solo serviría para comparar contra algo que no se va a cambiar.

export type FontOption = {
  id: string;
  name: string;
  note: string;
  varName: string;
  hasItalic: boolean;
  weights: number[];
};

type Lang = "es" | "en" | "de";

/** El titular real, con la palabra que se puede tocar marcada aparte. */
const H1: Record<Lang, { before: string; word: string; after: string; em: string }> = {
  es: { before: "Un ecosistema para que el ", word: "café", after: " colombiano viaje ", em: "con nombre propio." },
  en: { before: "An ecosystem so Colombian ", word: "coffee", after: " travels ", em: "under its own name." },
  de: { before: "Ein Ökosystem, damit kolumbianischer ", word: "Kaffee", after: " reist ", em: "unter eigenem Namen." },
};

const LANG_NAME: Record<Lang, string> = { es: "Español", en: "English", de: "Deutsch" };

/** Familias del sistema que suelen estar en un Windows con Office. Se comprueba
 *  una por una si existen de verdad: prometer una que no está y que el navegador
 *  sustituye en silencio es peor que no ofrecerla. */
const SYSTEM_FONTS: { name: string; note: string }[] = [
  { name: "Georgia", note: "Serif de pantalla, cálida" },
  { name: "Palatino Linotype", note: "Humanista, de libro" },
  { name: "Book Antiqua", note: "Prima de Palatino" },
  { name: "Garamond", note: "Garalda clásica, ligera" },
  { name: "Goudy Old Style", note: "Antigua, con carácter" },
  { name: "Baskerville Old Face", note: "Transicional, alto contraste" },
  { name: "Bodoni MT", note: "Didona seca" },
  { name: "Modern No. 20", note: "Didona compacta" },
  { name: "Perpetua", note: "Clásica inglesa, fina" },
  { name: "Bell MT", note: "Elegante, de rótulo" },
  { name: "High Tower Text", note: "Serif esbelta" },
  { name: "Century Schoolbook", note: "Robusta y legible" },
  { name: "Cambria", note: "Serif de sistema, sólida" },
  { name: "Constantia", note: "Serif moderna, suave" },
  { name: "Rockwell", note: "Egipcia geométrica" },
  { name: "Cooper Black", note: "Gorda y redonda, muy 70s" },
  { name: "Elephant", note: "Serif pesadísima" },
  { name: "Engravers MT", note: "Grabado, versalitas" },
  { name: "Copperplate Gothic Bold", note: "Placa grabada" },
  { name: "Tw Cen MT", note: "Geométrica de palo seco" },
  { name: "Gill Sans MT", note: "Humanista británica" },
  { name: "Franklin Gothic Heavy", note: "Palo seco de titular" },
  { name: "Impact", note: "Condensada, muy pesada" },
  { name: "Monotype Corsiva", note: "Cursiva caligráfica" },
  { name: "Lucida Calligraphy", note: "Caligráfica formal" },
  { name: "Gabriola", note: "Caligráfica con florituras" },
  { name: "Segoe Script", note: "Manuscrita informal" },
  { name: "Ink Free", note: "Rotulador a mano" },
  { name: "Stencil", note: "Plantilla, como el costal" },
  { name: "Old English Text MT", note: "Gótica de cabecera" },
];

/** ¿Existe la familia en este equipo? Se mide el ancho del mismo texto contra
 *  tres genéricas: si con la familia pedida no cambia respecto a NINGUNA, es que
 *  el navegador la ignoró y está usando la genérica. */
function detectFonts(names: string[]): Set<string> {
  const found = new Set<string>();
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return found;
  const probe = "CaféKaffeeCoffee";
  const generics = ["monospace", "serif", "sans-serif"];
  for (const name of names) {
    for (const g of generics) {
      ctx.font = `72px ${g}`;
      const base = ctx.measureText(probe).width;
      ctx.font = `72px "${name}", ${g}`;
      if (Math.abs(ctx.measureText(probe).width - base) > 0.5) {
        found.add(name);
        break;
      }
    }
  }
  return found;
}

export function TipografiaLab({ fonts }: { fonts: FontOption[] }) {
  const [lang, setLang] = useState<Lang>("es");
  // `null` = la palabra se queda con la tipografía del titular (el estado de hoy).
  const [pick, setPick] = useState<{ kind: "project" | "system" | "custom"; value: string } | null>(null);
  const [scale, setScale] = useState(1);
  const [weight, setWeight] = useState(700);
  const [italic, setItalic] = useState(false);
  const [gold, setGold] = useState(false);
  const [custom, setCustom] = useState("");
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  // La detección necesita el DOM, así que corre después de montar. Diferida con
  // `Promise.resolve()` como el runtime de Cherry Picked: el cuerpo del efecto
  // no puede llamar a setState de forma síncrona (react-hooks/set-state-in-effect),
  // y así además el marcado del servidor queda determinista.
  useEffect(() => {
    Promise.resolve().then(() => setInstalled(detectFonts(SYSTEM_FONTS.map((f) => f.name))));
  }, []);

  const t = H1[lang];

  const systemAvailable = useMemo(
    () => SYSTEM_FONTS.filter((f) => installed.has(f.name)),
    [installed]
  );
  const systemMissing = SYSTEM_FONTS.length - systemAvailable.length;

  // La familia aplicada SOLO a la palabra. Sin selección, hereda del titular.
  const wordFamily =
    pick === null
      ? undefined
      : pick.kind === "project"
        ? `var(${pick.value}), serif`
        : `"${pick.value}", serif`;

  const wordStyle: React.CSSProperties = {
    fontFamily: wordFamily,
    // `em` y no `px`: la palabra crece con el titular, que es responsive.
    fontSize: `${scale}em`,
    fontWeight: weight,
    fontStyle: italic ? "italic" : undefined,
    color: gold ? "#F7D287" : undefined,
  };

  const pickedName =
    pick === null
      ? "la del titular (Fraunces)"
      : pick.kind === "project"
        ? (fonts.find((f) => f.varName === pick.value)?.name ?? pick.value)
        : pick.value;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.kicker}>CTC Home · Hero · La palabra «{t.word}»</p>
        <h1 className={styles.pageH1}>Prueba una sola palabra</h1>
        <p className={styles.sub}>
          La frase se queda donde está, con su tipografía y su tamaño. Lo único que cambia es <b>«{t.word}»</b>. Elige
          una familia, muévele el tamaño y mira cómo cae dentro del titular.
        </p>
      </header>

      {/* El escenario: mismo fondo, mismo velo y misma rejilla que el hero real. */}
      <section className={styles.stage} aria-label="Vista previa del hero">
        <div className={styles.stageIn}>
          <h2 className={styles.preview}>
            {t.before}
            <span className={styles.word} style={wordStyle}>
              {t.word}
            </span>
            {t.after}
            <em className={styles.em}>{t.em}</em>
          </h2>
        </div>
      </section>

      <div className={styles.panel}>
        {/* ── Tamaño y tratamiento ─────────────────────────────────────────── */}
        <section className={styles.group}>
          <p className={styles.groupLabel}>Tamaño de la palabra</p>
          <label className={styles.slider}>
            <span>
              <b>{scale.toFixed(2)}×</b> respecto al resto de la frase
            </span>
            <input
              type="range"
              min={0.7}
              max={2}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(+e.target.value)}
            />
          </label>
          <div className={styles.chips}>
            {[0.85, 1, 1.15, 1.3, 1.5].map((s) => (
              <button
                key={s}
                type="button"
                className={`${styles.chip} ${Math.abs(scale - s) < 0.005 ? styles.chipOn : ""}`}
                onClick={() => setScale(s)}
              >
                {s.toFixed(2)}×
              </button>
            ))}
          </div>

          <p className={styles.groupLabel}>Tratamiento</p>
          <div className={styles.chips}>
            <button
              type="button"
              className={`${styles.chip} ${italic ? styles.chipOn : ""}`}
              onClick={() => setItalic((v) => !v)}
              aria-pressed={italic}
            >
              Cursiva
            </button>
            <button
              type="button"
              className={`${styles.chip} ${gold ? styles.chipOn : ""}`}
              onClick={() => setGold((v) => !v)}
              aria-pressed={gold}
            >
              En oro
            </button>
            {[400, 600, 700, 900].map((w) => (
              <button
                key={w}
                type="button"
                className={`${styles.chip} ${weight === w ? styles.chipOn : ""}`}
                onClick={() => setWeight(w)}
                aria-pressed={weight === w}
              >
                {w}
              </button>
            ))}
          </div>

          <p className={styles.groupLabel}>Lengua</p>
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
        </section>

        {/* ── Familias ─────────────────────────────────────────────────────── */}
        <section className={styles.group}>
          <p className={styles.groupLabel}>Familia · del proyecto</p>
          <p className={styles.groupHint}>
            Estas van cargadas de verdad. Si eliges una, se despliega tal cual — no hace falta que la tengas instalada.
          </p>
          <div className={styles.grid}>
            <button
              type="button"
              className={`${styles.card} ${pick === null ? styles.cardOn : ""}`}
              onClick={() => setPick(null)}
              aria-pressed={pick === null}
            >
              <span className={styles.sample}>{t.word}</span>
              <span className={styles.cardName}>Sin cambio</span>
              <span className={styles.cardNote}>La del titular · Fraunces</span>
            </button>
            {fonts.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`${styles.card} ${pick?.value === f.varName ? styles.cardOn : ""}`}
                onClick={() => setPick({ kind: "project", value: f.varName })}
                aria-pressed={pick?.value === f.varName}
              >
                <span className={styles.sample} style={{ fontFamily: `var(${f.varName}), serif` }}>
                  {t.word}
                </span>
                <span className={styles.cardName}>{f.name}</span>
                <span className={styles.cardNote}>{f.note}</span>
              </button>
            ))}
          </div>

          <p className={styles.groupLabel}>Familia · de tu equipo</p>
          <p className={styles.groupHint}>
            Detectadas en este ordenador: <b>{systemAvailable.length}</b> de {SYSTEM_FONTS.length}.
            {systemMissing > 0 && ` Las ${systemMissing} que faltan no están instaladas y por eso no se ofrecen.`}{" "}
            <b>Ojo:</b> una fuente de tu equipo no la tiene quien visite la web — si eliges una de estas, hay que
            comprarla o buscar su equivalente antes de montarla.
          </p>
          <div className={styles.grid}>
            {systemAvailable.map((f) => (
              <button
                key={f.name}
                type="button"
                className={`${styles.card} ${pick?.value === f.name ? styles.cardOn : ""}`}
                onClick={() => setPick({ kind: "system", value: f.name })}
                aria-pressed={pick?.value === f.name}
              >
                <span className={styles.sample} style={{ fontFamily: `"${f.name}", serif` }}>
                  {t.word}
                </span>
                <span className={styles.cardName}>{f.name}</span>
                <span className={styles.cardNote}>{f.note}</span>
              </button>
            ))}
          </div>

          <p className={styles.groupLabel}>Familia · a mano</p>
          <div className={styles.customRow}>
            <input
              className={styles.customInput}
              type="text"
              value={custom}
              placeholder="Escribe el nombre exacto de una fuente"
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && custom.trim()) setPick({ kind: "custom", value: custom.trim() });
              }}
            />
            <button
              type="button"
              className={styles.chip}
              onClick={() => custom.trim() && setPick({ kind: "custom", value: custom.trim() })}
            >
              Probar
            </button>
          </div>
        </section>

        {/* La receta, para poder pedírmela tal cual. */}
        <section className={styles.recipe}>
          <p className={styles.groupLabel}>La receta de lo que estás viendo</p>
          <code>
            «{t.word}» · {pickedName} · {scale.toFixed(2)}× · grosor {weight}
            {italic ? " · cursiva" : ""}
            {gold ? " · en oro" : ""}
          </code>
          <p className={styles.recipeNote}>
            El tamaño va en múltiplos y no en píxeles a propósito: el titular del hero crece con la pantalla, así que la
            palabra tiene que crecer con él. Mándame esta línea y lo dejo montado en las tres lenguas.
          </p>
        </section>
      </div>
    </div>
  );
}
