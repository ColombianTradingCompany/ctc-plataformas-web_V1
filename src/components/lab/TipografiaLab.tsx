"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import styles from "./TipografiaLab.module.css";

// ── Laboratorio del titular ──────────────────────────────────────────────────
// La frase se compone de CUATRO trozos —inicio, palabra destacada, final y
// cierre— y cada uno se puede reescribir y vestir por separado. La palabra
// destacada, además, tiene familia y tamaño propios.
//
// Los trozos se guardan SIN espacios en los bordes y se unen con uno al pintar:
// así nadie tiene que acordarse de dejar el espacio final al editar, que es el
// error que convierte "el café colombiano" en "el cafécolombiano".
//
// Los mandos van en acordeón de UNA sola sección abierta: son cinco grupos y
// desplegados todos a la vez empujaban la vista previa fuera de la pantalla,
// que es justo lo que hay que estar mirando.

export type FontOption = {
  id: string;
  name: string;
  note: string;
  varName: string;
  hasItalic: boolean;
  weights: number[];
};

type Lang = "es" | "en" | "de";
type PartKey = "before" | "word" | "after" | "em";
type Parts = Record<PartKey, string>;
type PartStyle = { color: string | null; bold: boolean; italic: boolean };

const PART_LABEL: Record<PartKey, string> = {
  before: "Inicio de la frase",
  word: "Palabra destacada",
  after: "Continuación",
  em: "Cierre",
};

/** El titular real de CTC Home, ya partido en cuatro. */
const DEFAULT_TEXT: Record<Lang, Parts> = {
  es: { before: "Un ecosistema para que el", word: "café", after: "colombiano viaje", em: "con nombre propio." },
  en: { before: "An ecosystem so Colombian", word: "coffee", after: "travels", em: "under its own name." },
  de: { before: "Ein Ökosystem, damit kolumbianischer", word: "Kaffee", after: "", em: "unter eigenem Namen reist." },
};

/** El vestido de salida = exactamente como está hoy en el hero. */
const DEFAULT_STYLE: Record<PartKey, PartStyle> = {
  before: { color: null, bold: false, italic: false },
  word: { color: null, bold: false, italic: false },
  after: { color: null, bold: false, italic: false },
  em: { color: "#F7D287", bold: false, italic: true },
};

const LANG_NAME: Record<Lang, string> = { es: "Español", en: "English", de: "Deutsch" };
const PART_ORDER: PartKey[] = ["before", "word", "after", "em"];

/** Colores de la casa, más el blanco del titular. */
const SWATCHES: { hex: string; name: string }[] = [
  { hex: "#FFFFFF", name: "Blanco del titular" },
  { hex: "#F7D287", name: "Oro del hero" },
  { hex: "#E3A32C", name: "Acento CTC" },
  { hex: "#D3B8FA", name: "Lavanda corporativa" },
  { hex: "#FFCD00", name: "Amarillo corporativo" },
  { hex: "#C8102F", name: "Carmesí corporativo" },
  { hex: "#8FE3B0", name: "Verde claro" },
  { hex: "#0E2C48", name: "Azul profundo" },
];

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
 *  tres genéricas: si no cambia con NINGUNA, el navegador la ignoró. */
function detectFonts(names: string[]): Set<string> {
  const found = new Set<string>();
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return found;
  const probe = "CaféKaffeeCoffee";
  for (const name of names) {
    for (const g of ["monospace", "serif", "sans-serif"]) {
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

type SectionId = "texto" | "familia" | "tamano" | "color" | "lengua";

export function TipografiaLab({ fonts }: { fonts: FontOption[] }) {
  const [lang, setLang] = useState<Lang>("es");
  const [open, setOpen] = useState<SectionId | null>("texto");

  // El texto se guarda POR LENGUA: cambiar de lengua no debe borrar lo escrito
  // en la anterior.
  const [texts, setTexts] = useState<Record<Lang, Parts>>(() => structuredClone(DEFAULT_TEXT));
  const [partStyle, setPartStyle] = useState<Record<PartKey, PartStyle>>(() => structuredClone(DEFAULT_STYLE));
  const [editing, setEditing] = useState<PartKey>("word");

  const [pick, setPick] = useState<{ kind: "project" | "system" | "custom"; value: string } | null>(null);
  const [scale, setScale] = useState(1);
  const [custom, setCustom] = useState("");
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  // Diferido: el cuerpo del efecto no puede llamar a setState de forma síncrona
  // (react-hooks/set-state-in-effect), y así el marcado del servidor es estable.
  useEffect(() => {
    Promise.resolve().then(() => setInstalled(detectFonts(SYSTEM_FONTS.map((f) => f.name))));
  }, []);

  const parts = texts[lang];
  const setPart = (k: PartKey, v: string) =>
    setTexts((prev) => ({ ...prev, [lang]: { ...prev[lang], [k]: v } }));
  const setStyle = (k: PartKey, patch: Partial<PartStyle>) =>
    setPartStyle((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));

  const systemAvailable = useMemo(() => SYSTEM_FONTS.filter((f) => installed.has(f.name)), [installed]);

  const wordFamily =
    pick === null
      ? undefined
      : pick.kind === "project"
        ? `var(${pick.value}), serif`
        : `"${pick.value}", serif`;

  const styleFor = (k: PartKey): React.CSSProperties => {
    const s = partStyle[k];
    return {
      color: s.color ?? undefined,
      fontWeight: s.bold ? 800 : undefined,
      fontStyle: s.italic ? "italic" : "normal",
      // Ni `display:inline-block` ni nada que cree una caja: un elemento en
      // línea de bloque SE COME el espacio que lo precede, y la frase salía
      // "que elcafé". El trozo tiene que fluir como texto normal.
      ...(k === "word" ? { fontFamily: wordFamily, fontSize: `${scale}em` } : null),
    };
  };

  // Los trozos vacíos no dejan un espacio de más.
  const visible = PART_ORDER.filter((k) => parts[k].trim().length > 0);

  const pickedName =
    pick === null
      ? "la del titular (Fraunces)"
      : pick.kind === "project"
        ? (fonts.find((f) => f.varName === pick.value)?.name ?? pick.value)
        : pick.value;

  const section = (id: SectionId, title: string, hint: string, body: React.ReactNode) => {
    const isOpen = open === id;
    return (
      <div className={`${styles.acc} ${isOpen ? styles.accOpen : ""}`} key={id}>
        <h3 className={styles.accH}>
          <button
            type="button"
            className={styles.accBtn}
            aria-expanded={isOpen}
            aria-controls={`sec-${id}`}
            onClick={() => setOpen(isOpen ? null : id)}
          >
            <span className={styles.accTitle}>{title}</span>
            <span className={styles.accHint}>{hint}</span>
            <span className={styles.accChev} aria-hidden>
              ▾
            </span>
          </button>
        </h3>
        {isOpen && (
          <div className={styles.accBody} id={`sec-${id}`}>
            {body}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.kicker}>CTC Home · Hero · Laboratorio del titular</p>
        <h1 className={styles.pageH1}>Escribe y viste el titular</h1>
        <p className={styles.sub}>
          La frase son cuatro trozos: inicio, <b>palabra destacada</b>, continuación y cierre. Puedes reescribir
          cualquiera y darle a cada uno su color, su negrita y su cursiva. La palabra destacada tiene además familia y
          tamaño propios.
        </p>
      </header>

      {/* Mismo fondo, mismo velo y mismo tamaño que el hero real. */}
      <section className={styles.stage} aria-label="Vista previa del hero">
        <div className={styles.stageIn}>
          <h2 className={styles.preview}>
            {/* El espacio va FUERA del <span>, como hermano: dentro se lo comería
                cualquier trozo que llegue a crear caja propia. */}
            {visible.map((k, i) => (
              <Fragment key={k}>
                {i > 0 ? " " : null}
                <span style={styleFor(k)}>{parts[k].trim()}</span>
              </Fragment>
            ))}
          </h2>
        </div>
      </section>

      <div className={styles.panel}>
        {section(
          "texto",
          "Texto",
          "Reescribe cualquiera de los cuatro trozos",
          <div className={styles.fields}>
            {PART_ORDER.map((k) => (
              <label className={styles.field} key={k}>
                <span className={styles.fieldLabel}>{PART_LABEL[k]}</span>
                <input
                  type="text"
                  className={styles.input}
                  value={parts[k]}
                  placeholder={k === "after" ? "(puede quedarse vacío)" : ""}
                  onChange={(e) => setPart(k, e.target.value)}
                />
              </label>
            ))}
            <p className={styles.hint}>
              No hace falta cuidar los espacios de los extremos: los trozos se unen con uno solo. Un trozo vacío
              simplemente desaparece.
            </p>
            <button
              type="button"
              className={styles.chip}
              onClick={() => setTexts((prev) => ({ ...prev, [lang]: { ...DEFAULT_TEXT[lang] } }))}
            >
              Restaurar el texto de {LANG_NAME[lang]}
            </button>
          </div>
        )}

        {section(
          "familia",
          "Familia de la palabra destacada",
          pickedName,
          <>
            <p className={styles.groupLabel}>Del proyecto</p>
            <p className={styles.hint}>
              Cargadas de verdad: si eliges una, se despliega tal cual, sin que nadie tenga que tenerla instalada.
            </p>
            <div className={styles.grid}>
              <button
                type="button"
                className={`${styles.card} ${pick === null ? styles.cardOn : ""}`}
                onClick={() => setPick(null)}
                aria-pressed={pick === null}
              >
                <span className={styles.sample}>{parts.word || "café"}</span>
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
                    {parts.word || "café"}
                  </span>
                  <span className={styles.cardName}>{f.name}</span>
                  <span className={styles.cardNote}>{f.note}</span>
                </button>
              ))}
            </div>

            <p className={styles.groupLabel}>De tu equipo</p>
            <p className={styles.hint}>
              Detectadas aquí: <b>{systemAvailable.length}</b> de {SYSTEM_FONTS.length}. <b>Ojo:</b> una fuente de tu
              ordenador no la tiene quien visita la web — habría que licenciarla o buscar su equivalente.
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
                    {parts.word || "café"}
                  </span>
                  <span className={styles.cardName}>{f.name}</span>
                  <span className={styles.cardNote}>{f.note}</span>
                </button>
              ))}
            </div>

            <p className={styles.groupLabel}>A mano</p>
            <div className={styles.customRow}>
              <input
                className={styles.input}
                type="text"
                value={custom}
                placeholder="Nombre exacto de una fuente"
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
          </>
        )}

        {section(
          "tamano",
          "Tamaño de la palabra destacada",
          `${scale.toFixed(2)}×`,
          <>
            <label className={styles.slider}>
              <span>
                <b>{scale.toFixed(2)}×</b> respecto al resto de la frase
              </span>
              <input type="range" min={0.7} max={2} step={0.01} value={scale} onChange={(e) => setScale(+e.target.value)} />
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
            <p className={styles.hint}>
              Va en múltiplos y no en píxeles a propósito: el titular crece con la pantalla y la palabra tiene que
              crecer con él.
            </p>
          </>
        )}

        {section(
          "color",
          "Color, negrita y cursiva",
          `Editando: ${PART_LABEL[editing].toLowerCase()}`,
          <>
            <p className={styles.groupLabel}>¿Qué trozo estás vistiendo?</p>
            <div className={styles.chips}>
              {PART_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`${styles.chip} ${editing === k ? styles.chipOn : ""}`}
                  onClick={() => setEditing(k)}
                  aria-pressed={editing === k}
                >
                  {PART_LABEL[k]}
                </button>
              ))}
            </div>

            <p className={styles.groupLabel}>Estilo</p>
            <div className={styles.chips}>
              <button
                type="button"
                className={`${styles.chip} ${partStyle[editing].bold ? styles.chipOn : ""}`}
                onClick={() => setStyle(editing, { bold: !partStyle[editing].bold })}
                aria-pressed={partStyle[editing].bold}
              >
                Negrita
              </button>
              <button
                type="button"
                className={`${styles.chip} ${partStyle[editing].italic ? styles.chipOn : ""}`}
                onClick={() => setStyle(editing, { italic: !partStyle[editing].italic })}
                aria-pressed={partStyle[editing].italic}
              >
                Cursiva
              </button>
            </div>

            <p className={styles.groupLabel}>Color</p>
            <div className={styles.swatches}>
              <button
                type="button"
                className={`${styles.swatch} ${styles.swatchNone} ${partStyle[editing].color === null ? styles.swatchOn : ""}`}
                onClick={() => setStyle(editing, { color: null })}
                title="Sin cambio · hereda el del titular"
                aria-label="Sin cambio, hereda el color del titular"
              />
              {SWATCHES.map((s) => (
                <button
                  key={s.hex}
                  type="button"
                  className={`${styles.swatch} ${partStyle[editing].color === s.hex ? styles.swatchOn : ""}`}
                  style={{ background: s.hex }}
                  onClick={() => setStyle(editing, { color: s.hex })}
                  title={`${s.name} · ${s.hex}`}
                  aria-label={s.name}
                />
              ))}
              <label className={styles.picker} title="Cualquier otro color">
                <input
                  type="color"
                  value={partStyle[editing].color ?? "#FFFFFF"}
                  onChange={(e) => setStyle(editing, { color: e.target.value })}
                />
                <span>Otro…</span>
              </label>
            </div>
            <p className={styles.hint}>
              El cierre sale en el oro del hero y en cursiva porque así está hoy en la web. «Sin cambio» devuelve
              cualquier trozo al blanco del titular.
            </p>
          </>
        )}

        {section(
          "lengua",
          "Lengua",
          LANG_NAME[lang],
          <>
            <div className={styles.chips}>
              {(Object.keys(DEFAULT_TEXT) as Lang[]).map((l) => (
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
            <p className={styles.hint}>
              El texto se guarda por lengua: lo que escribas en una no se pierde al pasar a otra. El vestido (color,
              negrita, cursiva, familia y tamaño) es el mismo para las tres, como en la web.
            </p>
          </>
        )}

        <section className={styles.recipe}>
          <p className={styles.groupLabel}>La receta de lo que estás viendo</p>
          <code>
            «{parts.word || "—"}» · {pickedName} · {scale.toFixed(2)}×
            {PART_ORDER.map((k) => {
              const s = partStyle[k];
              const bits = [s.color ? s.color : null, s.bold ? "negrita" : null, s.italic ? "cursiva" : null].filter(
                Boolean
              );
              return bits.length ? ` · ${PART_LABEL[k].toLowerCase()}: ${bits.join(" + ")}` : "";
            })}
          </code>
          <p className={styles.recipeNote}>
            Mándame esta línea —y el texto, si lo cambiaste— y lo dejo montado en el hero, en las tres lenguas.
          </p>
        </section>
      </div>
    </div>
  );
}
