"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ChevronDown, Sparkles, Download, Upload, RotateCcw, Plus, X, Check,
  Loader2, Link2, CornerDownLeft, ExternalLink, FileText, ImagePlus, Scissors,
} from "lucide-react";

/* ==================================================================
   LOGOS · marcas oficiales embebidas (no dependen de la red)
   ================================================================== */
const LOGOS = {
  ctcx: "data:image/png;base64,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",
  kr: "data:image/png;base64,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",
  chp: "data:image/png;base64,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",
};

/* ==================================================================
   CONTRATO DE INTEGRACIÓN  ·  ver INTEGRACION.md
   ==================================================================
   El componente es autónomo, pero acepta que el sistema de CTC le dé
   memoria y persistencia. Orden de resolución de cada dependencia:

     adapter    props.adapter    → window.CTC_ADAPTER    → window.storage
     aiComplete props.aiComplete → window.CTC_AI_COMPLETE → API Anthropic
     memory     props.memory     → window.CTC_MEMORY     → (vacío)
     onChange   props.onChange   → window.CTC_ON_CHANGE  → postMessage

   Adapter:  { load(scope) → data|null,  save(scope, data) → void }
             scope ∈ "record" | "assets"
   Salida:   postMessage({ type:"ctc:context-change", payload })  al padre
             CustomEvent("ctc:context-change", { detail: payload })
   Entrada:  postMessage({ type:"ctc:context-load", payload })
   ================================================================== */

export const CTC_SCHEMA_VERSION = "2.0";

/* ==================================================================
   CONTEXTO DE LA COMPAÑÍA — alimenta al asistente "Dame una mano"
   ================================================================== */

const CTC_CONTEXT = `
COLOMBIAN TRADING COMPANY (CTC / CTCX) — ctcexport.com
Exportadora de café verde fundada por un padre y un hijo (G&G), ingenieros y caficultores,
con casa matriz en Piedecuesta, Santander, Colombia. Construyen la infraestructura completa
—tecnológica, comercial y logística— para que los microlotes colombianos lleguen a las
tostadurías del mundo sin perder ni la calidad ni la identidad de quien los cultivó.
Tesis: el café repite el camino del vino — de commodity anónimo a expresión de un terruño
medible. La cuarta ola exige ciencia de fermentación, datos abiertos y trazabilidad
verificable. "Quien no elige orilla, la corriente elige por él."

ARQUITECTURA: dos plataformas, dos orillas, un solo hilo de datos.
La geolocalización que el productor registra en Kaffetal Regal se convierte en la declaración
EUDR que CTC presenta en Bruselas; la catación de la Arena se convierte en el grado que se
compra en Ámsterdam; el contrato firmado en Piedecuesta se convierte en el Transparency
Credit que el consumidor lee al escanear la taza. Nada se cuenta dos veces.

KAFFETAL REGAL (KR) — kaffetal-regal.ctcexport.com — En Colombia, para el productor.
Portal donde el caficultor registra gratis fincas georreferenciadas (requisito EUDR) y lotes
con ficha técnica, sube sus videos, envía 2 kg de muestra y compite en la CUPPING ARENA:
catación a ciegas ante Q-Graders invitados, dos cosechas al año (principal y mitaca).
Hasta tres galardones por sesión — o ninguno, si la taza no lo amerita. Certificación CTC
gratuita para todos los participantes, con puntaje, perfil sensorial y feedback de mejora.
Los galardonados firman contrato de opción de compra a 3 meses, con precio pactado el día de
la firma contra referencia internacional + Fedecafé, independiente de fluctuaciones. Congelan
stock con escalera de liberación mensual y compromiso de control de humedad (bolsas + papeletas
HIC gratis). CTC compra de entrada 15 kg para muestras. Panel del productor: información
general, mis fincas, mis lotes, Arena, mis contratos, más allá de la exportación.
Frase de los fundadores: "No venimos a comprarle barato. Venimos a subirle el techo."

CHERRY PICKED (CHP) — cherry-picked.ctcexport.com — En Europa, para el tostador.
Vitrina donde las tostadurías compran FRACCIONES de microlotes con nombre propio, EXW bodega
Ámsterdam. Black on spot toda la temporada (desde 490 kg, 350 kg para asociados); preorden por
grados con prepago 30% reembolsable; subasta Tyrian por mitades; última milla con tarifa fija
por 5 zonas (0,10–0,45 €/kg). Existencias reales de 300–1.000 kg por lote. Prioridad que se
gana catando: packs de muestras (300 €, abril y octubre) y niveles de asociado Verde → Pintón →
Maduro. Cada lote trae su página pública con QR, videos de origen y catación, ficha técnica,
certificado de la Arena con sello criptográfico y el opcional Transparency Credit (precio base
pagado al productor frente al precio del mercado del día).

GRADOS DE CALIDAD CTC (los decide la taza, no el marketing):
Black (base, 105–110) · Red (110–125) · Blue (125–135) · Gold (135–150) · Tyrian (150–200 +
bono de subasta). Base 100 = precio interno de referencia del día para pergamino corriente.

MÁS ALLÁ DE LA EXPORTACIÓN (servicios y red): CTC Tech (ozono+UVC, fermentación, selección
óptica, cromatografía de suelos, instrumentación), CTC CaaS (proyectos de marca en EE.UU.
y Europa), Directorio del Café (DC — ficha pública gratuita para caficultores, baristas,
tostadores, catadores y formadores de Colombia, Ley 1581 de 2012), Varietales Registrados
(chapolas con genética verificada, mín. 100, $150–300 COP c/u), Coffeed (muro de noticias),
Herramientas del Café, Terratalento, Cherry Picked Roast y Cherry Picked X (2027),
CTC Control Panel. Socios: Centro de Calidad, Agente de Carga, Agente de Nacionalización,
Master Roaster, Estudio de Contenido.

VOZ DE MARCA: directa, técnica y campesina a la vez. Ingeniería y vereda. Nada de superlativos
vacíos: se afirma lo que se puede demostrar. Al productor se le habla de usted, en español
llano, sin anglicismos ni jerga digital. Al tostador europeo se le habla de tú, con precisión
técnica y comercial. La transparencia se ofrece, no se impone.

SISTEMA DE PIEZAS DE VIDEO:
· VIDEO LARGO — 5 a 6 minutos. Es la pieza madre: se rueda completa y de ella salen las demás.
· VIDEO CORTO PLUS — como máximo el 40% de su contenido proviene del largo; el resto (60% o
  más) es material nuevo rodado o creado para esa pieza.
· VIDEO CORTO FAST — como mínimo el 60% de su contenido proviene del largo; es un corte
  directo de la pieza madre, con muy poco material añadido.
Todo corto se define eligiendo qué elementos del largo se reutilizan, cuáles se adaptan y
cuáles se agregan nuevos.
`.trim();

/* ==================================================================
   MODELO
   ================================================================== */

const UNITS = [
  {
    id: "ctcx", code: "CTCX", name: "Colombian Trading Company",
    role: "La sombrilla · el ecosistema completo",
    color: "#4A1D96", tint: "#EFE9FA",
    who: "Productores, tostadores, aliados y la red de servicios",
    site: "https://www.ctcexport.com",
    brief: "Explicar la estructura de CTCX y navegar la información de la página sombrilla: CTCX, KR, CHP, CTC Tech.",
  },
  {
    id: "kr", code: "KR", name: "Kaffetal Regal",
    role: "En Colombia · para el productor",
    color: "#1E4A2E", tint: "#E6EFE8",
    who: "Caficultores colombianos, asociaciones y sus familias",
    site: "https://kaffetal-regal.ctcexport.com",
    brief: "Explicación completa del panel del productor: información general, fincas, lotes, Arena, contratos.",
  },
  {
    id: "chp", code: "CHP", name: "Cherry Picked",
    role: "En Europa · para el tostador",
    color: "#8C2130", tint: "#F7E9EA",
    who: "Tostadurías de especialidad y compradores europeos",
    site: "https://cherry-picked.ctcexport.com",
    brief: "Explicación completa del panel del comprador, beneficios de estar dentro y llamado a inscribirse.",
  },
];

const FORMATS = [
  { id: "largo", name: "Video largo", short: "Largo", hint: "5–6 min · pieza madre, se rueda completa", rule: null },
  { id: "plus", name: "Video corto plus", short: "Corto plus", hint: "Máx. 40% derivado del largo", rule: { kind: "max", value: 0.40 } },
  { id: "fast", name: "Video corto fast", short: "Corto fast", hint: "Mín. 60% derivado del largo", rule: { kind: "min", value: 0.60 } },
];

const DEFAULT_COUNTS = {
  ctcx: { largo: 1, plus: 1, fast: 1 },
  kr: { largo: 1, plus: 1, fast: 3 },
  chp: { largo: 1, plus: 1, fast: 2 },
};

const PALANCAS = ["Morbo", "Familia", "Dinero", "Deseos", "Sueños", "Salud"];

const SECTIONS = [
  {
    id: "producto",
    title: "¿Cuál es el producto?",
    kicker: "Qué se muestra en pantalla",
    scope: "formato",
    groups: [{
      id: "g1", label: null,
      fields: [
        { id: "objetivo", label: "Objetivo general", help: "Qué tiene que lograr esta pieza. Una frase, en infinitivo.", ph: "Introducción y explicación del funcionamiento de CTCX" },
        { id: "caracteristicas", label: "Características", help: "Qué es, materialmente: página interactiva, login, panel, herramientas.", ph: "Página interactiva, login, herramientas" },
        { id: "producto", label: "Producto a comunicar", help: "El recorte exacto de la plataforma que aparece en cámara.", ph: "Kaffetal Regal Arena, desde la ficha del lote hasta mis contratos" },
        { id: "promesa", label: "Promesa en una frase", help: "Lo que se lleva quien mira, dicho como se lo diría a un caficultor en la vereda.", ph: "Esta sería tu oficina cafetera virtual y tu pasaporte a Europa" },
        { id: "cta", label: "Llamado a la acción", help: "Qué hace al terminar. Un verbo, un destino.", ph: "Cree su cuenta gratis y registre su primera finca" },
      ],
    }],
  },
  {
    id: "cliente",
    title: "¿Quién es el cliente?",
    kicker: "A quién le habla esta unidad",
    scope: "unidad",
    groups: [{
      id: "g1", label: null,
      fields: [
        { id: "relacion", label: "Cómo se relaciona con CTCX", help: "Su lugar exacto en el ecosistema.", ph: "Productores de café en Colombia" },
        { id: "duele", label: "Qué le duele", help: "El dolor concreto, con su costo. No la categoría, el caso.", ph: "Bajos precios, costos de vender fuera" },
        { id: "necesita", label: "Qué necesita", help: "La necesidad funcional, aunque no sepa nombrarla.", ph: "Mejores precios, vitrina internacional" },
        { id: "quiere", label: "Qué quiere", help: "El deseo declarado, con sus palabras.", ph: "Que su café salga con su nombre y su finca" },
        { id: "puede", label: "Qué puede", help: "Su margen real: tiempo, dinero, conectividad, manejo del celular.", ph: "Celular con datos, 20 minutos al día, 2 kg de muestra" },
      ],
    }],
  },
  {
    id: "contexto",
    title: "Contexto específico",
    kicker: "Cómo se cuenta y cómo se rueda",
    scope: "formato",
    palancas: true,
    groups: [
      {
        id: "comunicar", label: "Qué quiero comunicar",
        fields: [
          { id: "compartir", label: "Compartir", help: "Lo que ponemos sobre la mesa sin pedir nada a cambio.", ph: "La cadena completa, a la vista" },
          { id: "ensenar", label: "Enseñar", help: "Lo que el espectador sabrá hacer al terminar.", ph: "Cómo georreferenciar la finca desde el celular" },
          { id: "resultados", label: "Mostrar resultados", help: "La prueba: un número, un contrato, una taza, una cara.", ph: "Un lote Gold pagado 135 sobre base 100" },
        ],
      },
      {
        id: "forma", label: "Situación y forma",
        fields: [
          { id: "situacion", label: "Situación", help: "Dónde ocurre y en qué momento del año o de la jornada.", ph: "Patio de secado al final de la tarde, cosecha de mitaca" },
          { id: "concepto", label: "Concepto y formato", help: "La idea que sostiene la pieza y su estructura narrativa.", ph: "Demo guiada en primera persona, sin guion visible" },
          { id: "identidad", label: "Identidad visual y estética", help: "Luz, color, textura, tipo de plano. Suba referencias abajo.", ph: "Luz natural, verde pergamino, planos cerrados de manos", moodboard: true },
          { id: "personajes", label: "Personajes", help: "Quién aparece y con qué papel.", ph: "Gabriel hijo + un caficultor de Santander" },
          { id: "voz", label: "Personalidad y voz del personaje", help: "Cómo habla: tratamiento, ritmo, muletillas propias.", ph: "De usted, pausado, sin anglicismos" },
        ],
      },
      {
        id: "rodaje", label: "Plan de rodaje",
        fields: [
          { id: "aroll", label: "A-roll · hablar a la cámara", help: "Lo que se dice de frente. Frases, no párrafos.", ph: "Tres frases: qué es, qué gana, qué hace ahora" },
          { id: "broll", label: "B-roll · mostrar algo", help: "Lo que se ve mientras se habla.", ph: "Pantalla del panel, papeleta HIC, costal marcado" },
          { id: "croll", label: "C-roll · contextualizar", help: "El plano que ubica: paisaje, mapa, calendario, feria.", ph: "Montaña cafetera al amanecer, mapa de regiones" },
        ],
      },
    ],
  },
  {
    id: "recursos",
    title: "Recursos",
    kicker: "Con qué se hace",
    scope: "unidad",
    links: true,
    groups: [{
      id: "g1", label: null,
      fields: [
        { id: "material", label: "Material existente", help: "Lo que ya está grabado, escrito o diseñado y sirve.", ph: "Cataciones de la Arena de mitaca, fotos de marquesinas" },
        { id: "falta", label: "Qué falta conseguir", help: "Lo que hay que producir o pedir antes de rodar.", ph: "Permiso de finca, dron, testimonio del productor" },
        { id: "responsables", label: "Responsables y fechas", help: "Quién lo hace y para cuándo.", ph: "Estudio de Contenido · corte antes del embarque" },
      ],
    }],
  },
];

const SEC = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

/* elementos que un corto puede heredar de su video largo */
const DERIVABLES = [
  { id: "objetivo", label: "Objetivo general", sec: "producto", field: "objetivo" },
  { id: "producto", label: "Producto en pantalla", sec: "producto", field: "producto" },
  { id: "promesa", label: "Promesa", sec: "producto", field: "promesa" },
  { id: "cta", label: "Llamado a la acción", sec: "producto", field: "cta" },
  { id: "resultados", label: "Resultado que se muestra", sec: "contexto", field: "resultados" },
  { id: "situacion", label: "Situación y locación", sec: "contexto", field: "situacion" },
  { id: "identidad", label: "Identidad visual", sec: "contexto", field: "identidad" },
  { id: "personajes", label: "Personajes", sec: "contexto", field: "personajes" },
  { id: "voz", label: "Voz del personaje", sec: "contexto", field: "voz" },
  { id: "aroll", label: "A-roll", sec: "contexto", field: "aroll" },
  { id: "broll", label: "B-roll", sec: "contexto", field: "broll" },
  { id: "croll", label: "C-roll", sec: "contexto", field: "croll" },
];

const DERIV_STATES = [
  { id: "reuse", label: "Se reutiliza", w: 1, tone: "#1E4A2E" },
  { id: "adapt", label: "Se adapta", w: 0.5, tone: "#9A6A12" },
  { id: "skip", label: "No se usa", w: null, tone: "#8A837E" },
];

const SYSTEM_LINKS = [
  { label: "Recursos de contenido", url: "https://app.notion.com/p/Recursos-de-Contenido-388e04a4b7ca80198386fa3d7c3aed49?source=copy_link" },
  { label: "Narrative Threads & Concepts", url: "https://app.notion.com/p/38ae04a4b7ca80828bece29812583c2b?v=38ae04a4b7ca8031a448000cfb31226b&source=copy_link" },
  { label: "Narrative threads · situación", url: "https://app.notion.com/p/38ae04a4b7ca80828bece29812583c2b?v=38ae04a4b7ca80a29022000c2143632b&source=copy_link" },
  { label: "Identidad visual y estética", url: "https://app.notion.com/p/3a0e04a4b7ca802ab675eee654d0d653?v=3a0e04a4b7ca80e7bba3000c17190caa&source=copy_link" },
  { label: "Banco de recursos", url: "https://app.notion.com/p/388e04a4b7ca804a8419c800e6e50292?v=389e04a4b7ca80e58f05000c84af98b5&source=copy_link" },
];

/* ==================================================================
   HELPERS
   ================================================================== */

const pieceKey = (fmt, i) => (i <= 1 ? fmt : `${fmt}-${i}`);
const pieceOf = (fkey) => { const p = String(fkey).split("-"); return { fmt: p[0], n: p[1] ? Number(p[1]) : 1 }; };

const keyFor = (section, unitId, fkey, fieldId) =>
  section.scope === "unidad"
    ? `${unitId}|${section.id}|${fieldId}`
    : `${unitId}|${fkey}|${section.id}|${fieldId}`;

const RIPENESS = [
  { max: 0.34, label: "Verde", color: "#4F7A3A" },
  { max: 0.75, label: "Pintón", color: "#C8891B" },
  { max: 1.01, label: "Maduro", color: "#8C2130" },
];
const ripeness = (r) => RIPENESS.find((x) => r < x.max) || RIPENESS[2];

function sectionKeys(section, unitId, fkey) {
  const out = [];
  section.groups.forEach((g) => g.fields.forEach((f) => out.push(keyFor(section, unitId, fkey, f.id))));
  if (section.palancas) out.push(`${unitId}|${fkey}|${section.id}|palancasNota`);
  return out;
}

const filled = (v) => (v || "").trim().length > 3;

function download(name, text, type) {
  const blob = new Blob([text], { type: `${type || "text/plain"};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* --- adaptador por defecto: window.storage, con respaldo en memoria --- */
function defaultAdapter() {
  const mem = {};
  const K = { record: "ctc-contexto:record", assets: "ctc-contexto:assets" };
  return {
    async load(scope) {
      try {
        const r = await window.storage.get(K[scope]);
        return r && r.value ? JSON.parse(r.value) : null;
      } catch (e) { return mem[scope] || null; }
    },
    async save(scope, data) {
      mem[scope] = data;
      await window.storage.set(K[scope], JSON.stringify(data));
    },
  };
}

/* --- derivación: cuánto de este corto viene del largo --- */
function derivStats(unitId, fkey, values) {
  const states = DERIVABLES.map((d) => values[`${unitId}|${fkey}|deriv|${d.id}`] || "");
  const used = [];
  states.forEach((s) => { const st = DERIV_STATES.find((x) => x.id === s); if (st && st.w !== null) used.push(st.w); });
  let nuevos = [];
  try { nuevos = JSON.parse(values[`${unitId}|${fkey}|deriv|nuevos`] || "[]"); } catch (e) { nuevos = []; }
  const denom = used.length + nuevos.length;
  const ratio = denom ? used.reduce((a, b) => a + b, 0) / denom : 0;
  return { ratio, denom, usados: used.length, nuevos: nuevos.length, lista: nuevos, decidido: states.filter(Boolean).length };
}

function ruleVerdict(fmtId, ratio, denom) {
  const rule = (FORMATS.find((f) => f.id === fmtId) || {}).rule;
  if (!rule) return null;
  const pct = Math.round(ratio * 100);
  if (!denom) return { ok: null, text: "Marque los elementos para calcular la derivación." };
  if (rule.kind === "max") {
    return ratio <= rule.value
      ? { ok: true, text: `${pct}% derivado · dentro del máximo de 40%.` }
      : { ok: false, text: `${pct}% derivado · pasa el máximo de 40%. Agregue material nuevo o marque menos elementos como reutilizados.` };
  }
  return ratio >= rule.value
    ? { ok: true, text: `${pct}% derivado · cumple el mínimo de 60%.` }
    : { ok: false, text: `${pct}% derivado · queda corto del 60%. Reutilice más elementos del largo o quite elementos nuevos.` };
}

/* ==================================================================
   COMPONENTE PRINCIPAL
   ================================================================== */

export default function DefinicionDeContexto(props) {
  const p = props || {};
  const [values, setValues] = useState({});
  const [counts, setCounts] = useState(DEFAULT_COUNTS);
  const [links, setLinks] = useState({ ctcx: [], kr: [], chp: [] });
  const [assets, setAssets] = useState({});
  const [unit, setUnit] = useState("ctcx");
  const [fmt, setFmt] = useState("largo");
  const [piece, setPiece] = useState(1);
  const [open, setOpen] = useState({ producto: true });
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [briefOpen, setBriefOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [help, setHelp] = useState(null);
  const [bulk, setBulk] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const fileRef = useRef(null);

  const adapter = useMemo(
    () => p.adapter || (typeof window !== "undefined" && window.CTC_ADAPTER) || defaultAdapter(),
    [p.adapter]
  );

  const U = UNITS.find((u) => u.id === unit);
  const F = FORMATS.find((f) => f.id === fmt);
  const nPieces = Math.max(1, counts[unit][fmt]);
  const fkey = pieceKey(fmt, Math.min(piece, nPieces));

  useEffect(() => { setPiece(1); }, [unit, fmt]);

  /* ---------- carga ---------- */
  useEffect(() => {
    let dead = false;
    (async () => {
      let rec = p.initialData || null;
      let ast = null;
      if (!rec) {
        try { rec = await adapter.load("record"); } catch (e) { rec = null; }
      }
      try { ast = await adapter.load("assets"); } catch (e) { ast = null; }
      if (dead) return;
      if (rec) {
        if (rec.values) setValues(rec.values);
        if (rec.counts) setCounts({ ...DEFAULT_COUNTS, ...rec.counts });
        if (rec.links) setLinks({ ctcx: [], kr: [], chp: [], ...rec.links });
        if (rec.assets) setAssets(rec.assets);
      }
      if (ast) setAssets((a) => ({ ...a, ...ast }));
      setLoaded(true);
    })();
    return () => { dead = true; };
  }, [adapter]);

  /* ---------- entrada por postMessage (sistema CTC) ---------- */
  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data;
      if (!d || d.type !== "ctc:context-load" || !d.payload) return;
      const r = d.payload;
      if (r.values) setValues(r.values);
      if (r.counts) setCounts({ ...DEFAULT_COUNTS, ...r.counts });
      if (r.links) setLinks({ ctcx: [], kr: [], chp: [], ...r.links });
      if (r.assets) setAssets(r.assets);
      setToast("Ficha cargada desde el sistema");
      setTimeout(() => setToast(null), 2600);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const record = useMemo(
    () => ({ version: CTC_SCHEMA_VERSION, updatedAt: new Date().toISOString(), values, counts, links }),
    [values, counts, links]
  );

  /* ---------- guardado + notificación al sistema ---------- */
  useEffect(() => {
    if (!loaded) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await adapter.save("record", record);
        setSaveState("saved");
      } catch (e) { setSaveState("error"); }
      const payload = { ...record, assetsCount: Object.keys(assets).length };
      try {
        const cb = p.onChange || (typeof window !== "undefined" && window.CTC_ON_CHANGE);
        if (cb) cb(payload);
        if (window.parent && window.parent !== window) window.parent.postMessage({ type: "ctc:context-change", payload }, "*");
        window.dispatchEvent(new CustomEvent("ctc:context-change", { detail: payload }));
      } catch (e) { /* el host no escucha */ }
    }, 700);
    return () => clearTimeout(t);
  }, [record, loaded, adapter]);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => { adapter.save("assets", assets).catch(() => {}); }, 900);
    return () => clearTimeout(t);
  }, [assets, loaded, adapter]);

  const notify = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };
  const setVal = useCallback((k, v) => setValues((prev) => ({ ...prev, [k]: v })), []);

  /* ---------- progreso ---------- */
  const progressOf = useCallback((section) => {
    const keys = sectionKeys(section, unit, fkey);
    const done = keys.filter((k) => filled(values[k])).length;
    return { done, total: keys.length, ratio: keys.length ? done / keys.length : 0 };
  }, [values, unit, fkey]);

  const unitProgress = useMemo(() => {
    let done = 0, total = 0;
    const add = (keys) => keys.forEach((k) => { total++; if (filled(values[k])) done++; });
    SECTIONS.forEach((s) => {
      if (s.scope === "unidad") add(sectionKeys(s, unit, null));
      else FORMATS.forEach((f) => {
        for (let i = 1; i <= Math.max(1, counts[unit][f.id]); i++) add(sectionKeys(s, unit, pieceKey(f.id, i)));
      });
    });
    return { done, total, ratio: total ? done / total : 0 };
  }, [values, unit, counts]);

  /* ---------- contexto para la IA ---------- */
  const briefText = () => {
    const b = [
      values["general|objetivo"] && `Objetivo de la realineación: ${values["general|objetivo"]}`,
      values["general|tono"] && `Tono y restricciones: ${values["general|tono"]}`,
      values["general|momento"] && `Momento del negocio: ${values["general|momento"]}`,
    ].filter(Boolean);
    return b.length ? b.join("\n") : "(sin brief general escrito)";
  };

  const pieceSummary = useCallback((k, exclude) => {
    const out = [];
    SECTIONS.forEach((s) => s.groups.forEach((g) => g.fields.forEach((f) => {
      const kk = keyFor(s, unit, k, f.id);
      const v = (values[kk] || "").trim();
      if (v && kk !== exclude) out.push(`- ${f.label}: ${v.slice(0, 240)}`);
    })));
    const pal = values[`${unit}|${k}|contexto|palancas`];
    if (pal) out.push(`- Palancas: ${pal}`);
    return out.length ? out.join("\n") : "(sin contenido)";
  }, [values, unit]);

  const derivBlock = useCallback(() => {
    if (fmt === "largo") return "";
    const base = values[`${unit}|${fkey}|deriv|base`] || "largo";
    const st = derivStats(unit, fkey, values);
    const marks = DERIVABLES.map((d) => {
      const s = values[`${unit}|${fkey}|deriv|${d.id}`];
      const lbl = (DERIV_STATES.find((x) => x.id === s) || {}).label;
      return lbl ? `${d.label}: ${lbl}` : null;
    }).filter(Boolean).join(" · ");
    const regla = fmt === "plus"
      ? "Regla: como máximo el 40% de esta pieza puede venir del video largo; el resto es material nuevo."
      : "Regla: como mínimo el 60% de esta pieza debe venir del video largo; es un corte directo de la pieza madre.";
    return `
<pieza_madre>
Esta pieza se deriva de "${base}". ${regla}
Derivación actual calculada: ${Math.round(st.ratio * 100)}%.
Decisiones sobre los elementos del largo: ${marks || "sin marcar"}
Elementos nuevos previstos: ${st.lista.length ? st.lista.join(" · ") : "ninguno"}
Contenido del video largo base:
${pieceSummary(base)}
</pieza_madre>`;
  }, [unit, fkey, fmt, values, pieceSummary]);

  const getMemory = async () => {
    const m = p.memory || (typeof window !== "undefined" && window.CTC_MEMORY);
    if (!m) return "";
    try {
      const txt = typeof m === "function" ? await m({ unit, fmt, piece }) : m;
      return txt ? `\n<memoria_del_sistema>\n${txt}\n</memoria_del_sistema>\n` : "";
    } catch (e) { return ""; }
  };

  const complete = async (prompt) => {
    const custom = p.aiComplete || (typeof window !== "undefined" && window.CTC_AI_COMPLETE);
    let text;
    if (custom) {
      text = await custom(prompt, { unit, format: fmt, piece });
    } else {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      if (!r.ok) throw new Error("fallo");
      const data = await r.json();
      text = data.content.map((i) => (i.type === "text" ? i.text : "")).join("\n");
    }
    return JSON.parse(String(text).replace(/```json|```/g, "").trim());
  };

  const headBlock = async () => `Eres el estratega de contenido y copy de Colombian Trading Company. Escribes en español de Colombia.

<contexto_compania>
${CTC_CONTEXT}
</contexto_compania>
${await getMemory()}
<brief_general>
${briefText()}
</brief_general>

<pieza>
Unidad de negocio: ${U.code} — ${U.name} (${U.role}). Audiencia: ${U.who}.
Formato: ${F.name} — ${F.hint}. Pieza ${Math.min(piece, nPieces)} de ${nPieces}.
</pieza>
${derivBlock()}`;

  /* ---------- Dame una mano · campo ---------- */
  const handField = async (section, field, k) => {
    setHelp({ key: k, loading: true, error: null, items: [] });
    try {
      const prompt = `${await headBlock()}
<campo>
Bloque: ${section.title}
Campo: "${field.label}" — ${field.help}
</campo>

<borrador_del_usuario>
${(values[k] || "").trim() || "(vacío)"}
</borrador_del_usuario>

<resto_de_la_ficha>
${pieceSummary(fkey, k)}
</resto_de_la_ficha>

Tarea: propón 3 redacciones alternativas para ese campo, con ángulos distintos entre sí. Si hay borrador, respétalo como intención y mejóralo. Concretas, en la voz de la marca, sin superlativos vacíos. De 1 a 3 frases.

Responde ÚNICAMENTE con un array JSON, sin markdown:
[{"titulo":"ángulo en 2-4 palabras","texto":"la redacción propuesta"}]`;
      const items = await complete(prompt);
      setHelp({ key: k, loading: false, error: null, items: Array.isArray(items) ? items : [] });
    } catch (e) {
      setHelp({ key: k, loading: false, error: "No se pudo generar la sugerencia. Intente de nuevo.", items: [] });
    }
  };

  /* ---------- Dame una mano · bloque ---------- */
  const handSection = async (section) => {
    setBulk({ sectionId: section.id, loading: true, error: null, map: {} });
    try {
      const fields = section.groups.flatMap((g) => g.fields.map((f) => ({ ...f, key: keyFor(section, unit, fkey, f.id) })));
      const detalle = fields.map((f) => `- id "${f.id}" · ${f.label} (${f.help}) · borrador: ${(values[f.key] || "").trim() || "vacío"}`).join("\n");
      const prompt = `${await headBlock()}
<bloque>
${section.title} — ${section.kicker}
${detalle}
</bloque>

<resto_de_la_ficha>
${pieceSummary(fkey)}
</resto_de_la_ficha>

Tarea: propón una redacción para cada campo del bloque. Respeta los borradores como intención y mejóralos. Que los campos conversen entre sí: un solo hilo narrativo para esta pieza. De 1 a 3 frases por campo.

Responde ÚNICAMENTE con un objeto JSON, sin markdown:
{"campos":{"id_del_campo":"redacción propuesta"}}`;
      const res = await complete(prompt);
      setBulk({ sectionId: section.id, loading: false, error: null, map: (res && res.campos) || {} });
    } catch (e) {
      setBulk({ sectionId: section.id, loading: false, error: "No se pudo generar el bloque. Intente de nuevo.", map: {} });
    }
  };

  /* ---------- Dame una mano · plan de derivación ---------- */
  const handDeriv = async () => {
    setBulk({ sectionId: "deriv", loading: true, error: null, map: {} });
    try {
      const base = values[`${unit}|${fkey}|deriv|base`] || "largo";
      const prompt = `${await headBlock()}
<tarea_de_derivacion>
Elementos disponibles del video largo "${base}":
${DERIVABLES.map((d) => `- id "${d.id}" · ${d.label}: ${(values[keyFor(SEC[d.sec], unit, base, d.field)] || "").trim() || "(vacío en el largo)"}`).join("\n")}
</tarea_de_derivacion>

Tarea: propón el plan de derivación de esta pieza corta. Para cada elemento decide "reuse" (se usa igual del largo), "adapt" (se reaprovecha pero se reencuadra o reedita) o "skip" (no aparece). Respeta la regla del formato: en corto plus el peso derivado no debe pasar del 40%, en corto fast debe llegar al menos al 60%. Cuenta: reuse=1, adapt=0.5, y cada elemento nuevo suma al denominador con 0. Propón también los elementos nuevos que hay que rodar o crear.

Responde ÚNICAMENTE con un objeto JSON, sin markdown:
{"elementos":{"id":"reuse|adapt|skip"},"nuevos":["elemento nuevo 1","elemento nuevo 2"],"nota":"una frase sobre el criterio"}`;
      const res = await complete(prompt);
      const el = (res && res.elementos) || {};
      Object.keys(el).forEach((id) => {
        if (DERIVABLES.some((d) => d.id === id) && DERIV_STATES.some((s) => s.id === el[id])) {
          setVal(`${unit}|${fkey}|deriv|${id}`, el[id]);
        }
      });
      if (Array.isArray(res.nuevos)) setVal(`${unit}|${fkey}|deriv|nuevos`, JSON.stringify(res.nuevos.slice(0, 12)));
      setBulk(null);
      notify(res && res.nota ? res.nota : "Plan de derivación propuesto");
    } catch (e) {
      setBulk({ sectionId: "deriv", loading: false, error: "No se pudo proponer el plan. Intente de nuevo.", map: {} });
    }
  };

  /* ---------- heredar contenido del largo ---------- */
  const inherit = () => {
    const base = values[`${unit}|${fkey}|deriv|base`] || "largo";
    let n = 0;
    const next = { ...values };
    DERIVABLES.forEach((d) => {
      const st = values[`${unit}|${fkey}|deriv|${d.id}`];
      if (st !== "reuse" && st !== "adapt") return;
      const src = values[keyFor(SEC[d.sec], unit, base, d.field)];
      const dstKey = keyFor(SEC[d.sec], unit, fkey, d.field);
      if (src && !(next[dstKey] || "").trim()) { next[dstKey] = src; n++; }
    });
    setValues(next);
    notify(n ? `${n} campo${n > 1 ? "s" : ""} heredado${n > 1 ? "s" : ""} del largo` : "No había campos vacíos por heredar");
  };

  /* ---------- PDF por módulo ---------- */
  const exportPDF = async (unitId) => {
    setPdfBusy(true);
    try {
      const jsPDF = await ensureJsPDF();
      const doc = buildUnitPDF(jsPDF, unitId, { values, counts, links, assets });
      doc.save(`CTC-contexto-${UNITS.find((u) => u.id === unitId).code}-${new Date().toISOString().slice(0, 10)}.pdf`);
      notify("PDF generado");
    } catch (e) {
      download(
        `CTC-contexto-${UNITS.find((u) => u.id === unitId).code}.html`,
        buildUnitHTML(unitId, { values, counts, links, assets }),
        "text/html"
      );
      notify("Sin conexión al generador de PDF: se descargó una versión imprimible en HTML");
    } finally { setPdfBusy(false); }
  };

  const importJSON = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(String(rd.result));
        if (d.values) setValues(d.values);
        if (d.counts) setCounts({ ...DEFAULT_COUNTS, ...d.counts });
        if (d.links) setLinks({ ctcx: [], kr: [], chp: [], ...d.links });
        if (d.assets) setAssets(d.assets);
        notify("Ficha importada");
      } catch (err) { notify("Ese archivo no se pudo leer"); }
    };
    rd.readAsText(f);
    e.target.value = "";
  };

  const resetAll = () => {
    if (!window.confirm("Se borra toda la ficha guardada. ¿Continuar?")) return;
    setValues({}); setCounts(DEFAULT_COUNTS); setLinks({ ctcx: [], kr: [], chp: [] }); setAssets({});
    notify("Ficha en blanco");
  };

  const rip = ripeness(unitProgress.ratio);
  const dstats = derivStats(unit, fkey, values);
  const verdict = ruleVerdict(fmt, dstats.ratio, dstats.denom);

  return (
    <div className="dc-root" data-ctc-module="definicion-de-contexto" data-ctc-version={CTC_SCHEMA_VERSION}>
      <style>{CSS}</style>

      <header className="dc-head">
        <div className="dc-head-l">
          <img src={LOGOS.ctcx} alt="Colombian Trading Company" className="dc-head-logo" />
          <div>
            <h1>Definición de contexto</h1>
            <p className="dc-sub">Realineación de GTM y comunicación · CTCX · Kaffetal Regal · Cherry Picked</p>
          </div>
        </div>
        <div className="dc-head-r">
          <span className={`dc-save dc-save-${saveState}`}>
            {saveState === "saving" ? "Guardando…" : saveState === "error" ? "Sin guardar" : "Guardado"}
          </span>
          <button className="dc-btn" onClick={() => download("ctc-contexto-respaldo.json", JSON.stringify({ ...record, assets }, null, 2), "application/json")} title="Respaldo completo en JSON">
            <Download size={14} /> Respaldo
          </button>
          <button className="dc-btn" onClick={() => fileRef.current && fileRef.current.click()} title="Cargar un respaldo">
            <Upload size={14} />
          </button>
          <button className="dc-btn" onClick={resetAll} title="Vaciar la ficha">
            <RotateCcw size={14} />
          </button>
          <input ref={fileRef} type="file" accept="application/json" onChange={importJSON} style={{ display: "none" }} />
        </div>
      </header>

      {/* CONTEXTO GENERAL */}
      <section className="dc-brief">
        <button className="dc-brief-t" onClick={() => setBriefOpen((v) => !v)}>
          <ChevronDown size={15} className={briefOpen ? "rot" : ""} />
          <strong>Contexto general</strong>
          <span className="dc-brief-hint">El norte común de las tres unidades · lo lee el asistente en cada sugerencia</span>
        </button>
        {briefOpen && (
          <div className="dc-brief-body">
            {[
              { k: "general|objetivo", l: "Objetivo de la realineación", ph: "Que el productor entienda que la Arena es gratis y que el tostador entienda que la fracción es real" },
              { k: "general|tono", l: "Tono y restricciones", ph: "Nada de promesas de precio. De usted al productor, de tú al tostador." },
              { k: "general|momento", l: "Momento del negocio", ph: "Temporada S1 en últimas semanas, contenedor de mitaca en tránsito" },
            ].map((f) => (
              <label key={f.k} className="dc-brief-f">
                <span>{f.l}</span>
                <textarea rows={2} value={values[f.k] || ""} placeholder={f.ph} onChange={(e) => setVal(f.k, e.target.value)} />
              </label>
            ))}
          </div>
        )}
      </section>

      {/* PESTAÑAS */}
      <nav className="dc-tabs">
        {UNITS.map((u) => {
          const on = u.id === unit;
          return (
            <button key={u.id} className={`dc-tab ${on ? "on" : ""}`}
              onClick={() => { setUnit(u.id); setHelp(null); setBulk(null); }}
              style={on ? { borderTopColor: u.color, background: u.tint } : {}}>
              <img src={LOGOS[u.id]} alt="" className="dc-tab-logo" />
              <span className="dc-tab-txt">
                <span className="dc-tab-code" style={{ color: on ? u.color : undefined }}>{u.code}</span>
                <span className="dc-tab-name">{u.name}</span>
                <span className="dc-tab-role">{u.role}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* BARRA DE UNIDAD */}
      <div className="dc-unitbar" style={{ borderLeftColor: U.color }}>
        <div className="dc-unitbar-l">
          <p className="dc-unitbar-brief">{U.brief}</p>
          <a className="dc-unitbar-link" href={U.site} target="_blank" rel="noreferrer">
            {U.site.replace("https://", "")} <ExternalLink size={11} />
          </a>
        </div>
        <div className="dc-unitbar-r">
          <div className="dc-ripe" title={`${unitProgress.done} de ${unitProgress.total} campos`}>
            <div className="dc-ripe-bar">
              <div className="dc-ripe-fill" style={{ width: `${Math.round(unitProgress.ratio * 100)}%`, background: rip.color }} />
            </div>
            <span style={{ color: rip.color }}>{rip.label}</span>
            <em>{unitProgress.done}/{unitProgress.total}</em>
          </div>
          <button className="dc-pdf" style={{ background: U.color }} onClick={() => exportPDF(unit)} disabled={pdfBusy}>
            {pdfBusy ? <Loader2 size={14} className="spin" /> : <FileText size={14} />} PDF de {U.code}
          </button>
        </div>
      </div>

      {/* FORMATOS */}
      <div className="dc-formats">
        {FORMATS.map((f) => {
          const on = f.id === fmt;
          return (
            <div key={f.id} className={`dc-fmt ${on ? "on" : ""}`} style={on ? { borderColor: U.color } : {}}>
              <button className="dc-fmt-main" onClick={() => { setFmt(f.id); setHelp(null); setBulk(null); }}>
                <span className="dc-fmt-name">{f.name}</span>
                <span className="dc-fmt-hint">{f.hint}</span>
              </button>
              <div className="dc-stepper">
                <button onClick={() => setCounts((prev) => ({ ...prev, [unit]: { ...prev[unit], [f.id]: Math.max(1, prev[unit][f.id] - 1) } }))}>–</button>
                <span>{counts[unit][f.id]}</span>
                <button onClick={() => setCounts((prev) => ({ ...prev, [unit]: { ...prev[unit], [f.id]: Math.min(12, prev[unit][f.id] + 1) } }))}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      {nPieces > 1 && (
        <div className="dc-pieces">
          <span className="dc-pieces-l">Pieza</span>
          {Array.from({ length: nPieces }, (_, i) => i + 1).map((i) => (
            <button key={i} className={`dc-piece ${i === Math.min(piece, nPieces) ? "on" : ""}`}
              style={i === Math.min(piece, nPieces) ? { background: U.color, borderColor: U.color } : {}}
              onClick={() => { setPiece(i); setHelp(null); setBulk(null); }}>{i}</button>
          ))}
          <span className="dc-pieces-h">Cada pieza de este formato tiene su propia ficha.</span>
        </div>
      )}

      {/* DERIVACIÓN */}
      {fmt !== "largo" && (
        <Derivacion
          unit={unit} fkey={fkey} fmt={fmt} color={U.color} counts={counts}
          values={values} setVal={setVal} stats={dstats} verdict={verdict}
          onInherit={inherit} onAsk={handDeriv}
          busy={bulk && bulk.sectionId === "deriv" && bulk.loading}
          error={bulk && bulk.sectionId === "deriv" ? bulk.error : null}
        />
      )}

      {/* ACORDEONES */}
      <main className="dc-acc">
        {SECTIONS.map((section) => {
          const isOpen = !!open[section.id];
          const pr = progressOf(section);
          const r = ripeness(pr.ratio);
          return (
            <section key={section.id} className={`dc-block ${isOpen ? "on" : ""}`}>
              <button className="dc-block-t" onClick={() => setOpen((o) => ({ ...o, [section.id]: !o[section.id] }))}>
                <ChevronDown size={16} className={isOpen ? "rot" : ""} />
                <span className="dc-block-title">{section.title}</span>
                <span className="dc-block-kicker">{section.kicker}</span>
                <span className="dc-scope">{section.scope === "unidad" ? `por unidad · ${U.code}` : `por pieza · ${F.short}${nPieces > 1 ? " " + Math.min(piece, nPieces) : ""}`}</span>
                <span className="dc-block-p" style={{ color: r.color }}>{pr.done}/{pr.total}</span>
              </button>

              {isOpen && (
                <div className="dc-block-body">
                  <div className="dc-block-act">
                    <button className="dc-hand dc-hand-lg" style={{ background: U.color }}
                      onClick={() => handSection(section)}
                      disabled={bulk && bulk.loading && bulk.sectionId === section.id}>
                      {bulk && bulk.loading && bulk.sectionId === section.id
                        ? <><Loader2 size={14} className="spin" /> Pensando…</>
                        : <><Sparkles size={14} /> Dame una mano con todo el bloque</>}
                    </button>
                    <span className="dc-block-act-h">
                      {section.scope === "unidad"
                        ? "Estos campos son los mismos para todas las piezas de esta unidad."
                        : `Estos campos pertenecen a esta pieza: ${F.name}${nPieces > 1 ? ` · pieza ${Math.min(piece, nPieces)}` : ""}.`}
                    </span>
                  </div>

                  {bulk && bulk.sectionId === section.id && bulk.error && <p className="dc-err">{bulk.error}</p>}

                  {section.groups.map((g) => (
                    <div key={g.id} className="dc-group">
                      {g.label && <h3 className="dc-group-t">{g.label}</h3>}
                      {g.fields.map((f) => {
                        const k = keyFor(section, unit, fkey, f.id);
                        const proposal = bulk && bulk.sectionId === section.id ? bulk.map[f.id] : null;
                        const clearProp = () => setBulk((b) => ({ ...b, map: { ...b.map, [f.id]: null } }));
                        return (
                          <div key={f.id} className="dc-field">
                            <div className="dc-field-h">
                              <label htmlFor={k}>{f.label}</label>
                              <button className="dc-hand" onClick={() => handField(section, f, k)} disabled={help && help.loading && help.key === k}>
                                {help && help.loading && help.key === k ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} Dame una mano
                              </button>
                            </div>
                            <p className="dc-field-help">{f.help}</p>
                            <AutoText id={k} value={values[k] || ""} placeholder={f.ph} onChange={(v) => setVal(k, v)} />

                            {f.moodboard && (
                              <Moodboard akey={`${unit}|${fkey}|moodboard`} assets={assets} setAssets={setAssets} color={U.color} />
                            )}

                            {proposal && (
                              <div className="dc-prop">
                                <span className="dc-prop-tag">Propuesta</span>
                                <p>{proposal}</p>
                                <div className="dc-prop-act">
                                  <button onClick={() => { setVal(k, proposal); clearProp(); }}><Check size={12} /> Usar</button>
                                  <button onClick={() => { setVal(k, (values[k] || "") + (values[k] ? "\n" : "") + proposal); clearProp(); }}><CornerDownLeft size={12} /> Añadir</button>
                                  <button onClick={clearProp}><X size={12} /> Descartar</button>
                                </div>
                              </div>
                            )}

                            {help && help.key === k && !help.loading && (
                              <div className="dc-sug">
                                {help.error && <p className="dc-err">{help.error}</p>}
                                {help.items.map((it, i) => (
                                  <div key={i} className="dc-sug-c">
                                    <span className="dc-sug-t">{it.titulo}</span>
                                    <p>{it.texto}</p>
                                    <div className="dc-prop-act">
                                      <button onClick={() => { setVal(k, it.texto); setHelp(null); }}><Check size={12} /> Usar</button>
                                      <button onClick={() => { setVal(k, (values[k] || "") + (values[k] ? "\n" : "") + it.texto); setHelp(null); }}><CornerDownLeft size={12} /> Añadir</button>
                                    </div>
                                  </div>
                                ))}
                                <button className="dc-sug-close" onClick={() => setHelp(null)}><X size={12} /> Cerrar sugerencias</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {section.palancas && <Palancas unit={unit} fkey={fkey} color={U.color} values={values} setVal={setVal} />}
                  {section.links && <Recursos unitId={unit} color={U.color} links={links} setLinks={setLinks} />}
                </div>
              )}
            </section>
          );
        })}
      </main>

      <footer className="dc-foot">
        Esquema {CTC_SCHEMA_VERSION} · ficha viva · un PDF por módulo · lista para el sistema de manejo de CTC
      </footer>

      {toast && <div className="dc-toast">{toast}</div>}
    </div>
  );
}

/* ==================================================================
   SUBCOMPONENTES
   ================================================================== */

function AutoText({ id, value, placeholder, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(58, el.scrollHeight + 2) + "px";
  }, [value]);
  return <textarea id={id} ref={ref} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="dc-ta" rows={2} />;
}

function Derivacion({ unit, fkey, fmt, color, counts, values, setVal, stats, verdict, onInherit, onAsk, busy, error }) {
  const nLargos = Math.max(1, counts[unit].largo);
  const base = values[`${unit}|${fkey}|deriv|base`] || "largo";
  const [nuevo, setNuevo] = useState("");
  const lista = stats.lista;
  const setLista = (arr) => setVal(`${unit}|${fkey}|deriv|nuevos`, JSON.stringify(arr));
  const pct = Math.round(stats.ratio * 100);
  const rule = FORMATS.find((f) => f.id === fmt).rule;

  return (
    <section className="dc-deriv" style={{ borderLeftColor: color }}>
      <div className="dc-deriv-h">
        <Scissors size={15} />
        <h2>Derivación del video largo</h2>
        <span className="dc-deriv-rule">
          {fmt === "plus"
            ? "Máximo 40% del largo · el 60% restante es material nuevo"
            : "Mínimo 60% del largo · corte directo de la pieza madre"}
        </span>
      </div>

      <div className="dc-deriv-base">
        <span className="dc-mini">Pieza madre</span>
        {Array.from({ length: nLargos }, (_, i) => pieceKey("largo", i + 1)).map((bk, i) => (
          <button key={bk} className={`dc-piece ${bk === base ? "on" : ""}`}
            style={bk === base ? { background: color, borderColor: color } : {}}
            onClick={() => setVal(`${unit}|${fkey}|deriv|base`, bk)}>
            Largo {i + 1}
          </button>
        ))}
        <button className="dc-hand" onClick={onAsk} disabled={busy}>
          {busy ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} Dame una mano con el plan
        </button>
        <button className="dc-hand" onClick={onInherit}><CornerDownLeft size={12} /> Heredar contenido marcado</button>
      </div>

      {error && <p className="dc-err">{error}</p>}

      <div className="dc-deriv-grid">
        {DERIVABLES.map((d) => {
          const cur = values[`${unit}|${fkey}|deriv|${d.id}`] || "";
          const src = (values[keyFor(SEC[d.sec], unit, base, d.field)] || "").trim();
          return (
            <div key={d.id} className={`dc-derow ${cur ? "set" : ""}`}>
              <div className="dc-derow-l">
                <strong>{d.label}</strong>
                <span>{src ? (src.length > 96 ? src.slice(0, 96) + "…" : src) : "sin definir en el largo"}</span>
              </div>
              <div className="dc-derow-r">
                {DERIV_STATES.map((s) => (
                  <button key={s.id} className={`dc-dst ${cur === s.id ? "on" : ""}`}
                    style={cur === s.id ? { background: s.tone, borderColor: s.tone } : {}}
                    onClick={() => setVal(`${unit}|${fkey}|deriv|${d.id}`, cur === s.id ? "" : s.id)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="dc-nuevos">
        <h3 className="dc-group-t">Elementos nuevos de esta pieza</h3>
        <p className="dc-field-help">Lo que no existe en el largo y hay que rodar o crear. Cada uno baja el porcentaje derivado.</p>
        <div className="dc-nuevos-list">
          {lista.length === 0 && <span className="dc-empty">Todavía no hay elementos nuevos.</span>}
          {lista.map((n, i) => (
            <span key={i} className="dc-nuevo">
              {n}<button onClick={() => setLista(lista.filter((_, j) => j !== i))}><X size={11} /></button>
            </span>
          ))}
        </div>
        <div className="dc-addlink">
          <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Plano nuevo de la papeleta HIC en la bolsa"
            onKeyDown={(e) => { if (e.key === "Enter" && nuevo.trim()) { setLista([...lista, nuevo.trim()]); setNuevo(""); } }} />
          <button style={{ background: color }} onClick={() => { if (nuevo.trim()) { setLista([...lista, nuevo.trim()]); setNuevo(""); } }}>
            <Plus size={13} /> Agregar
          </button>
        </div>
      </div>

      <div className="dc-meter">
        <div className="dc-meter-bar">
          <div className="dc-meter-fill" style={{ width: `${pct}%`, background: verdict && verdict.ok === false ? "#8C2130" : color }} />
          <div className="dc-meter-mark" style={{ left: `${rule.value * 100}%` }} title={`${rule.kind === "max" ? "máximo" : "mínimo"} ${rule.value * 100}%`} />
        </div>
        <div className="dc-meter-txt">
          <strong style={{ color: verdict && verdict.ok === false ? "#8C2130" : color }}>{pct}%</strong>
          <span>{verdict ? verdict.text : ""}</span>
          <em>{stats.usados} del largo · {stats.nuevos} nuevos</em>
        </div>
      </div>
    </section>
  );
}

function Moodboard({ akey, assets, setAssets, color }) {
  const list = assets[akey] || [];
  const inp = useRef(null);
  const [busy, setBusy] = useState(false);

  const process = (file) => new Promise((res) => {
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1100;
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        res({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name, nota: "", dataUrl: c.toDataURL("image/jpeg", 0.72) });
      };
      img.onerror = () => res(null);
      img.src = String(rd.result);
    };
    rd.readAsDataURL(file);
  });

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 8);
    if (!files.length) return;
    setBusy(true);
    const out = [];
    for (const f of files) { const r = await process(f); if (r) out.push(r); }
    setAssets((a) => ({ ...a, [akey]: [...(a[akey] || []), ...out].slice(0, 12) }));
    setBusy(false);
    e.target.value = "";
  };

  const update = (id, nota) => setAssets((a) => ({ ...a, [akey]: (a[akey] || []).map((x) => (x.id === id ? { ...x, nota } : x)) }));
  const remove = (id) => setAssets((a) => ({ ...a, [akey]: (a[akey] || []).filter((x) => x.id !== id) }));

  return (
    <div className="dc-mood">
      <div className="dc-mood-h">
        <span className="dc-mini">Referencias visuales</span>
        <button className="dc-hand" onClick={() => inp.current && inp.current.click()} disabled={busy}>
          {busy ? <Loader2 size={12} className="spin" /> : <ImagePlus size={12} />} Subir imágenes
        </button>
        <input ref={inp} type="file" accept="image/*" multiple onChange={onFiles} style={{ display: "none" }} />
      </div>
      {list.length === 0 ? (
        <p className="dc-empty">Sin referencias todavía. Suba fotogramas, paletas, encuadres o fotos de finca.</p>
      ) : (
        <div className="dc-mood-grid">
          {list.map((im) => (
            <figure key={im.id} className="dc-mood-c">
              <img src={im.dataUrl} alt={im.name} />
              <button className="dc-mood-x" onClick={() => remove(im.id)} title="Quitar"><X size={11} /></button>
              <input value={im.nota} placeholder="Qué mirar aquí" onChange={(e) => update(im.id, e.target.value)}
                style={{ borderBottomColor: color }} />
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

function Palancas({ unit, fkey, color, values, setVal }) {
  const k = `${unit}|${fkey}|contexto|palancas`;
  const kn = `${unit}|${fkey}|contexto|palancasNota`;
  const sel = (values[k] || "").split(",").map((s) => s.trim()).filter(Boolean);
  const toggle = (p) => setVal(k, (sel.includes(p) ? sel.filter((x) => x !== p) : [...sel, p]).join(", "));
  return (
    <div className="dc-group">
      <h3 className="dc-group-t">Palancas emocionales</h3>
      <p className="dc-field-help">Qué resorte mueve la pieza. Marque las que estén realmente en el guion, no las que suenen bien.</p>
      <div className="dc-chips">
        {PALANCAS.map((p) => {
          const on = sel.includes(p);
          return (
            <button key={p} className={`dc-chip ${on ? "on" : ""}`} onClick={() => toggle(p)}
              style={on ? { background: color, borderColor: color } : {}}>
              {on && <Check size={11} />} {p}
            </button>
          );
        })}
      </div>
      <div className="dc-field" style={{ marginTop: 14 }}>
        <div className="dc-field-h"><label>Cómo se activan</label></div>
        <p className="dc-field-help">La escena concreta donde esa palanca se ve. Sin ella, la palanca es solo una etiqueta.</p>
        <AutoText id={kn} value={values[kn] || ""} onChange={(v) => setVal(kn, v)}
          placeholder="Dinero: el productor mira el contrato en el celular y lee la prima sobre base 100" />
      </div>
    </div>
  );
}

function Recursos({ unitId, color, links, setLinks }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const list = links[unitId] || [];
  const add = () => {
    if (!url.trim()) return;
    setLinks((p) => ({ ...p, [unitId]: [...(p[unitId] || []), { label: label.trim() || url.trim(), url: url.trim() }] }));
    setLabel(""); setUrl("");
  };
  return (
    <div className="dc-group">
      <h3 className="dc-group-t">Enlaces del sistema</h3>
      <div className="dc-links">
        {SYSTEM_LINKS.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="dc-link"><Link2 size={11} /> {l.label}</a>
        ))}
      </div>
      <h3 className="dc-group-t" style={{ marginTop: 20 }}>Enlaces de esta unidad</h3>
      <div className="dc-links">
        {list.length === 0 && <span className="dc-empty">Sin enlaces todavía. Agregue el primero abajo.</span>}
        {list.map((l, i) => (
          <span key={i} className="dc-link dc-link-own">
            <a href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
            <button onClick={() => setLinks((p) => ({ ...p, [unitId]: p[unitId].filter((_, j) => j !== i) }))}><X size={11} /></button>
          </span>
        ))}
      </div>
      <div className="dc-addlink">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nombre" style={{ width: 150 }} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" style={{ flex: 1, minWidth: 180 }}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <button style={{ background: color }} onClick={add}><Plus size={13} /> Agregar</button>
      </div>
    </div>
  );
}

/* ==================================================================
   PDF
   ================================================================== */

function ensureJsPDF() {
  return new Promise((res, rej) => {
    if (window.jspdf && window.jspdf.jsPDF) return res(window.jspdf.jsPDF);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => (window.jspdf && window.jspdf.jsPDF ? res(window.jspdf.jsPDF) : rej(new Error("jspdf"))); 
    s.onerror = () => rej(new Error("jspdf"));
    document.head.appendChild(s);
  });
}

function buildUnitPDF(jsPDF, unitId, store) {
  const { values, counts, links, assets } = store;
  const U = UNITS.find((u) => u.id === unitId);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 16, W = 210, H = 297, CW = W - 2 * M;
  let y = M;

  const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const C = rgb(U.color);
  const brk = (h) => { if (y + h > H - 14) { doc.addPage(); y = M; } };

  const h1 = (t) => {
    brk(16); y += 4;
    doc.setFillColor(C[0], C[1], C[2]); doc.rect(M, y - 3.6, 2, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(20, 18, 16);
    doc.text(t, M + 5, y + 1.4); y += 8;
  };
  const h2 = (t) => {
    brk(12); y += 2;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(C[0], C[1], C[2]);
    doc.text(t.toUpperCase(), M, y); y += 2;
    doc.setDrawColor(215, 213, 205); doc.line(M, y, W - M, y); y += 5;
  };
  const kv = (label, val) => {
    const v = (val || "").trim() || "—";
    const lines = doc.splitTextToSize(v, CW - 42);
    brk(lines.length * 4.6 + 3);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.6); doc.setTextColor(95, 88, 82);
    doc.text(doc.splitTextToSize(label, 38), M, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.6); doc.setTextColor(24, 22, 20);
    doc.text(lines, M + 42, y);
    y += Math.max(lines.length * 4.6, 5.4) + 2.4;
  };
  const note = (t) => {
    const lines = doc.splitTextToSize(t, CW);
    brk(lines.length * 4.2 + 3);
    doc.setFont("helvetica", "italic"); doc.setFontSize(8.8); doc.setTextColor(110, 103, 97);
    doc.text(lines, M, y); y += lines.length * 4.2 + 3;
  };

  /* portada / encabezado */
  try { doc.addImage(LOGOS[unitId], "PNG", M, y, 20, 20); } catch (e) { /* sin logo */ }
  doc.setFont("helvetica", "bold"); doc.setFontSize(19); doc.setTextColor(20, 18, 16);
  doc.text(U.name, M + 25, y + 8);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.4); doc.setTextColor(105, 98, 92);
  doc.text(`${U.code} · ${U.role}`, M + 25, y + 13.4);
  doc.text(`Definición de contexto · ${new Date().toLocaleDateString("es-CO")}`, M + 25, y + 18.2);
  y += 25;
  doc.setDrawColor(C[0], C[1], C[2]); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); doc.setLineWidth(0.2);
  y += 7;
  note(U.brief);

  const gen = [
    values["general|objetivo"] && `Objetivo de la realineación: ${values["general|objetivo"]}`,
    values["general|tono"] && `Tono y restricciones: ${values["general|tono"]}`,
    values["general|momento"] && `Momento del negocio: ${values["general|momento"]}`,
  ].filter(Boolean);
  if (gen.length) { h2("Contexto general"); gen.forEach((g) => note(g)); }

  /* secciones por unidad */
  SECTIONS.filter((s) => s.scope === "unidad").forEach((s) => {
    h1(s.title);
    s.groups.forEach((g) => g.fields.forEach((f) => kv(f.label, values[keyFor(s, unitId, null, f.id)])));
    if (s.links) {
      const ls = links[unitId] || [];
      if (ls.length) kv("Enlaces", ls.map((l) => `${l.label}: ${l.url}`).join("\n"));
    }
  });

  /* piezas */
  FORMATS.forEach((fmt) => {
    const n = Math.max(1, counts[unitId][fmt.id]);
    for (let i = 1; i <= n; i++) {
      const fkey = pieceKey(fmt.id, i);
      doc.addPage(); y = M;
      doc.setFillColor(C[0], C[1], C[2]); doc.rect(M, y, CW, 12, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor(255, 255, 255);
      doc.text(`${fmt.name}${n > 1 ? ` · pieza ${i} de ${n}` : ""}`, M + 4, y + 8);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.4);
      doc.text(fmt.hint, W - M - 4, y + 8, { align: "right" });
      y += 18;

      if (fmt.rule) {
        const st = derivStats(unitId, fkey, values);
        const vd = ruleVerdict(fmt.id, st.ratio, st.denom);
        h2("Derivación del video largo");
        kv("Pieza madre", `Video largo ${pieceOf(values[`${unitId}|${fkey}|deriv|base`] || "largo").n}`);
        kv("Derivación", vd ? vd.text : "—");
        const mk = DERIVABLES.map((d) => {
          const s = values[`${unitId}|${fkey}|deriv|${d.id}`];
          const lb = (DERIV_STATES.find((x) => x.id === s) || {}).label;
          return lb ? `${d.label}: ${lb}` : null;
        }).filter(Boolean);
        kv("Elementos del largo", mk.length ? mk.join("\n") : "—");
        kv("Elementos nuevos", st.lista.length ? st.lista.map((x) => `· ${x}`).join("\n") : "—");
      }

      SECTIONS.filter((s) => s.scope === "formato").forEach((s) => {
        h1(s.title);
        s.groups.forEach((g) => {
          if (g.label) h2(g.label);
          g.fields.forEach((f) => kv(f.label, values[keyFor(s, unitId, fkey, f.id)]));
        });
        if (s.palancas) {
          h2("Palancas emocionales");
          kv("Activas", values[`${unitId}|${fkey}|contexto|palancas`]);
          kv("Cómo se activan", values[`${unitId}|${fkey}|contexto|palancasNota`]);
        }
      });

      const ims = (assets[`${unitId}|${fkey}|moodboard`] || []).slice(0, 6);
      if (ims.length) {
        h2("Referencias visuales");
        const iw = (CW - 3 * 4) / 4, ih = iw * 0.72;
        let x = M;
        ims.forEach((im, idx) => {
          if (idx % 4 === 0 && idx > 0) { y += ih + 7; x = M; }
          brk(ih + 8);
          try { doc.addImage(im.dataUrl, "JPEG", x, y, iw, ih); } catch (e) { /* imagen inválida */ }
          if (im.nota) {
            doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(110, 103, 97);
            doc.text(doc.splitTextToSize(im.nota, iw), x, y + ih + 3);
          }
          x += iw + 4;
        });
        y += ih + 9;
      }
    }
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.4); doc.setTextColor(140, 134, 128);
    doc.text(`Colombian Trading Company · Definición de contexto · ${U.code}`, M, H - 8);
    doc.text(`${i} / ${pages}`, W - M, H - 8, { align: "right" });
  }
  return doc;
}

/* respaldo imprimible si no hay red para cargar el generador de PDF */
function buildUnitHTML(unitId, store) {
  const { values, counts, links, assets } = store;
  const U = UNITS.find((u) => u.id === unitId);
  const esc = (s) => String(s || "—").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const row = (l, v) => `<tr><th>${esc(l)}</th><td>${esc(v).replace(/\n/g, "<br>")}</td></tr>`;
  let h = `<h1>${esc(U.name)}</h1><p class="r">${esc(U.code)} · ${esc(U.role)}</p>`;
  SECTIONS.filter((s) => s.scope === "unidad").forEach((s) => {
    h += `<h2>${esc(s.title)}</h2><table>`;
    s.groups.forEach((g) => g.fields.forEach((f) => { h += row(f.label, values[keyFor(s, unitId, null, f.id)]); }));
    if (s.links) h += row("Enlaces", (links[unitId] || []).map((l) => `${l.label}: ${l.url}`).join("\n"));
    h += `</table>`;
  });
  FORMATS.forEach((fmt) => {
    const n = Math.max(1, counts[unitId][fmt.id]);
    for (let i = 1; i <= n; i++) {
      const fk = pieceKey(fmt.id, i);
      h += `<h2 class="pb">${esc(fmt.name)}${n > 1 ? ` · pieza ${i}` : ""}</h2><p class="r">${esc(fmt.hint)}</p><table>`;
      if (fmt.rule) {
        const st = derivStats(unitId, fk, values);
        const vd = ruleVerdict(fmt.id, st.ratio, st.denom);
        h += row("Derivación", vd ? vd.text : "—");
        h += row("Elementos nuevos", st.lista.join("\n"));
      }
      SECTIONS.filter((s) => s.scope === "formato").forEach((s) => {
        s.groups.forEach((g) => g.fields.forEach((f) => { h += row(f.label, values[keyFor(s, unitId, fk, f.id)]); }));
        if (s.palancas) h += row("Palancas", values[`${unitId}|${fk}|contexto|palancas`]);
      });
      h += `</table>`;
      (assets[`${unitId}|${fk}|moodboard`] || []).forEach((im) => { h += `<img src="${im.dataUrl}" style="width:120px;margin:4px">`; });
    }
  });
  return `<!doctype html><meta charset="utf-8"><title>${esc(U.name)} · Definición de contexto</title>
<style>body{font:13px/1.5 system-ui;max-width:800px;margin:32px auto;padding:0 20px;color:#1B1614}
h1{margin:0}h2{border-bottom:2px solid ${U.color};padding-bottom:4px;margin-top:26px}
.r{color:#666;margin:2px 0 10px}table{width:100%;border-collapse:collapse;margin-bottom:14px}
th{text-align:left;width:180px;vertical-align:top;padding:5px 8px 5px 0;color:#555;font-weight:600}
td{padding:5px 0;border-bottom:1px solid #eee}@media print{.pb{page-break-before:always}}</style>${h}`;
}

/* ==================================================================
   ESTILOS
   ================================================================== */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=Archivo:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

.dc-root{
  --paper:#EFF0EA; --paper-2:#F7F8F3; --ink:#1B1614; --ink-2:#5B534E;
  --line:#D9DACF; --line-2:#C6C8BA;
  font-family:'Archivo',system-ui,sans-serif; color:var(--ink);
  background:var(--paper); min-height:100%; padding:22px 20px 60px;
  max-width:1120px; margin:0 auto; box-sizing:border-box;
}
.dc-root *{box-sizing:border-box}
.dc-root h1,.dc-root h2,.dc-root h3{font-family:'Fraunces',Georgia,serif;margin:0}
.dc-root .spin{animation:dcspin 1s linear infinite}
@keyframes dcspin{to{transform:rotate(360deg)}}
.dc-root .rot{transform:rotate(180deg)}
.dc-root svg{flex:none}
.dc-mini{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}

.dc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap;
  padding-bottom:16px;border-bottom:2px solid var(--ink)}
.dc-head-l{display:flex;gap:14px;align-items:center}
.dc-head-logo{height:46px;width:auto;display:block}
.dc-head h1{font-size:27px;font-weight:800;letter-spacing:-.02em;line-height:1}
.dc-sub{margin:5px 0 0;font-size:12.5px;color:var(--ink-2)}
.dc-head-r{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
.dc-btn{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:12px;background:transparent;
  border:1px solid var(--line-2);border-radius:2px;padding:6px 10px;cursor:pointer;color:var(--ink)}
.dc-btn:hover{background:#fff;border-color:var(--ink)}
.dc-save{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
.dc-save-error{color:#8C2130}

.dc-brief{margin-top:16px;border:1px solid var(--line);background:var(--paper-2)}
.dc-brief-t{display:flex;align-items:center;gap:9px;width:100%;background:none;border:0;padding:11px 13px;
  cursor:pointer;font:inherit;font-size:13.5px;text-align:left;color:var(--ink)}
.dc-brief-hint{color:var(--ink-2);font-size:12px}
.dc-brief-body{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:0 13px 15px}
.dc-brief-f span{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;
  text-transform:uppercase;color:var(--ink-2);margin-bottom:5px}
.dc-brief-f textarea{width:100%;font:inherit;font-size:13px;padding:8px 9px;border:1px solid var(--line-2);
  background:#fff;resize:vertical;border-radius:2px;color:var(--ink)}

.dc-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-top:22px}
.dc-tab{display:flex;gap:11px;align-items:center;text-align:left;background:var(--paper-2);border:1px solid var(--line);
  border-top:3px solid var(--line-2);padding:11px 13px;cursor:pointer;font:inherit;transition:background .18s,border-color .18s}
.dc-tab:hover{background:#fff}
.dc-tab.on{border-bottom-color:transparent}
.dc-tab-logo{height:42px;width:auto;max-width:52px;object-fit:contain;filter:saturate(.15) opacity(.55);transition:filter .2s}
.dc-tab.on .dc-tab-logo{filter:none}
.dc-tab-txt{min-width:0}
.dc-tab-code{display:block;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:600;letter-spacing:.1em;color:var(--ink-2)}
.dc-tab-name{display:block;font-family:'Fraunces',serif;font-size:17px;font-weight:600;margin-top:1px;letter-spacing:-.01em}
.dc-tab-role{display:block;font-size:11px;color:var(--ink-2);margin-top:1px}

.dc-unitbar{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;
  background:#fff;border:1px solid var(--line);border-left:4px solid;padding:12px 15px;margin-top:2px}
.dc-unitbar-brief{margin:0;font-size:13.5px;max-width:60ch}
.dc-unitbar-link{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--ink-2);text-decoration:none;
  display:inline-flex;align-items:center;gap:4px;margin-top:5px}
.dc-unitbar-link:hover{color:var(--ink);text-decoration:underline}
.dc-unitbar-r{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.dc-ripe{display:flex;align-items:center;gap:9px;font-family:'JetBrains Mono',monospace;font-size:11px}
.dc-ripe-bar{width:104px;height:5px;background:var(--line);border-radius:3px;overflow:hidden}
.dc-ripe-fill{height:100%;transition:width .35s ease,background .35s ease}
.dc-ripe em{font-style:normal;color:var(--ink-2)}
.dc-pdf{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12.5px;color:#fff;border:0;
  border-radius:2px;padding:8px 13px;cursor:pointer}
.dc-pdf:hover{filter:brightness(1.1)}
.dc-pdf:disabled{opacity:.6;cursor:wait}

.dc-formats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.dc-fmt{display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--paper-2);
  border:1px solid var(--line);padding:9px 10px 9px 12px;transition:border-color .18s,background .18s}
.dc-fmt.on{background:#fff;border-width:2px;padding:8px 9px 8px 11px}
.dc-fmt-main{text-align:left;background:none;border:0;padding:0;cursor:pointer;font:inherit;flex:1;color:var(--ink)}
.dc-fmt-name{display:block;font-size:13.5px;font-weight:600}
.dc-fmt-hint{display:block;font-size:11px;color:var(--ink-2);margin-top:1px}
.dc-stepper{display:flex;align-items:center;gap:2px;border:1px solid var(--line-2);border-radius:2px;background:#fff}
.dc-stepper button{width:22px;height:24px;border:0;background:none;cursor:pointer;font-size:14px;line-height:1;color:var(--ink-2)}
.dc-stepper button:hover{color:var(--ink)}
.dc-stepper span{min-width:20px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600}

.dc-pieces{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:11px}
.dc-pieces-l{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
.dc-pieces-h{font-size:11.5px;color:var(--ink-2);margin-left:4px}
.dc-piece{min-width:28px;font:inherit;font-size:12px;padding:4px 9px;border:1px solid var(--line-2);
  background:#fff;color:var(--ink);cursor:pointer;border-radius:2px}
.dc-piece.on{color:#fff}
.dc-piece:hover{border-color:var(--ink)}

/* derivación */
.dc-deriv{margin-top:16px;background:#fff;border:1px solid var(--line);border-left:4px solid;padding:15px 16px 17px}
.dc-deriv-h{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.dc-deriv-h h2{font-size:17px;font-weight:600}
.dc-deriv-rule{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.04em;color:var(--ink-2);
  border:1px solid var(--line-2);padding:3px 7px;border-radius:2px}
.dc-deriv-base{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:12px 0 4px}
.dc-deriv-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;margin-top:10px}
.dc-derow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)}
.dc-derow-l{min-width:0}
.dc-derow-l strong{display:block;font-size:12.5px;font-weight:600}
.dc-derow-l span{display:block;font-size:11px;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-derow-r{display:flex;gap:3px}
.dc-dst{font:inherit;font-size:10px;padding:3px 6px;border:1px solid var(--line-2);background:var(--paper-2);
  color:var(--ink-2);cursor:pointer;border-radius:2px;white-space:nowrap}
.dc-dst:hover{border-color:var(--ink);color:var(--ink)}
.dc-dst.on{color:#fff}
.dc-nuevos{margin-top:16px}
.dc-nuevos-list{display:flex;flex-wrap:wrap;gap:6px}
.dc-nuevo{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;background:var(--paper-2);
  border:1px solid var(--line-2);border-radius:2px;padding:4px 6px 4px 9px}
.dc-nuevo button{background:none;border:0;cursor:pointer;color:var(--ink-2);display:flex;padding:0}
.dc-meter{margin-top:18px;padding-top:14px;border-top:1px dashed var(--line)}
.dc-meter-bar{position:relative;height:8px;background:var(--line);border-radius:4px;overflow:visible}
.dc-meter-fill{height:100%;border-radius:4px;transition:width .3s ease}
.dc-meter-mark{position:absolute;top:-4px;width:2px;height:16px;background:var(--ink)}
.dc-meter-txt{display:flex;align-items:baseline;gap:10px;margin-top:9px;flex-wrap:wrap}
.dc-meter-txt strong{font-family:'JetBrains Mono',monospace;font-size:17px}
.dc-meter-txt span{font-size:12.5px}
.dc-meter-txt em{font-style:normal;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--ink-2);margin-left:auto}

.dc-acc{margin-top:22px;display:flex;flex-direction:column;gap:9px}
.dc-block{border:1px solid var(--line);background:var(--paper-2)}
.dc-block.on{background:#fff;border-color:var(--line-2)}
.dc-block-t{display:flex;align-items:center;gap:11px;width:100%;background:none;border:0;padding:14px 16px;
  cursor:pointer;font:inherit;text-align:left;color:var(--ink)}
.dc-block-title{font-family:'Fraunces',serif;font-size:18px;font-weight:600;letter-spacing:-.01em}
.dc-block-kicker{font-size:12px;color:var(--ink-2);flex:1}
.dc-scope{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--ink-2);border:1px solid var(--line-2);padding:2px 6px;border-radius:2px}
.dc-block-p{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;min-width:34px;text-align:right}
.dc-block-body{padding:0 16px 20px}
.dc-block-act{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:0 0 16px;
  border-bottom:1px dashed var(--line);margin-bottom:18px}
.dc-block-act-h{font-size:11.5px;color:var(--ink-2);flex:1;min-width:200px}

.dc-hand{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:11px;background:transparent;
  border:1px solid var(--line-2);border-radius:2px;padding:4px 8px;cursor:pointer;color:var(--ink-2)}
.dc-hand:hover{color:var(--ink);border-color:var(--ink);background:#fff}
.dc-hand:disabled{opacity:.55;cursor:wait}
.dc-hand-lg{font-size:12.5px;padding:8px 13px;color:#fff;border:0}
.dc-hand-lg:hover{color:#fff;filter:brightness(1.08)}

.dc-group{margin-bottom:8px}
.dc-group-t{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink-2);margin:18px 0 12px;padding-bottom:5px;border-bottom:1px solid var(--line)}
.dc-field{margin-bottom:18px}
.dc-field-h{display:flex;align-items:center;justify-content:space-between;gap:10px}
.dc-field-h label{font-size:14px;font-weight:600}
.dc-field-help{margin:2px 0 7px;font-size:11.5px;color:var(--ink-2);max-width:70ch}
.dc-ta{width:100%;font:inherit;font-size:14px;line-height:1.5;padding:10px 11px;border:1px solid var(--line-2);
  background:var(--paper-2);border-radius:2px;resize:none;overflow:hidden;color:var(--ink);transition:border-color .15s,background .15s}
.dc-ta:focus{outline:none;border-color:var(--ink);background:#fff}
.dc-ta::placeholder{color:#A9A79C}

.dc-mood{margin-top:10px;border:1px dashed var(--line-2);background:var(--paper-2);padding:10px 11px}
.dc-mood-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.dc-mood-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:9px}
.dc-mood-c{position:relative;margin:0;background:#fff;border:1px solid var(--line-2);padding:5px}
.dc-mood-c img{width:100%;height:82px;object-fit:cover;display:block}
.dc-mood-c input{width:100%;font:inherit;font-size:10.5px;border:0;border-bottom:1px solid var(--line);
  padding:5px 1px 3px;background:none;color:var(--ink)}
.dc-mood-c input:focus{outline:none;border-bottom-width:2px}
.dc-mood-x{position:absolute;top:7px;right:7px;background:rgba(27,22,20,.72);border:0;color:#fff;
  width:18px;height:18px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center}

.dc-prop,.dc-sug{margin-top:9px}
.dc-prop{border:1px solid var(--line-2);border-left:3px solid var(--ink);background:var(--paper-2);padding:10px 12px}
.dc-prop-tag,.dc-sug-t{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:9.5px;
  letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);margin-bottom:5px}
.dc-prop p,.dc-sug-c p{margin:0 0 9px;font-size:13.5px;line-height:1.5}
.dc-prop-act{display:flex;gap:6px;flex-wrap:wrap}
.dc-prop-act button{display:inline-flex;align-items:center;gap:4px;font:inherit;font-size:11px;background:#fff;
  border:1px solid var(--line-2);border-radius:2px;padding:3px 8px;cursor:pointer;color:var(--ink-2)}
.dc-prop-act button:hover{border-color:var(--ink);color:var(--ink)}
.dc-sug{display:flex;flex-direction:column;gap:8px}
.dc-sug-c{border:1px solid var(--line-2);background:var(--paper-2);padding:10px 12px}
.dc-sug-close{align-self:flex-start;display:inline-flex;align-items:center;gap:4px;font:inherit;font-size:11px;
  background:none;border:0;cursor:pointer;color:var(--ink-2);padding:2px 0}
.dc-err{font-size:12px;color:#8C2130;margin:0 0 10px}

.dc-chips{display:flex;flex-wrap:wrap;gap:7px}
.dc-chip{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:12.5px;padding:5px 11px;
  border:1px solid var(--line-2);border-radius:20px;background:#fff;cursor:pointer;color:var(--ink);transition:all .15s}
.dc-chip:hover{border-color:var(--ink)}
.dc-chip.on{color:#fff}

.dc-links{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
.dc-link{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;text-decoration:none;color:var(--ink-2);
  border:1px solid var(--line-2);border-radius:2px;padding:4px 9px;background:var(--paper-2)}
.dc-link:hover{color:var(--ink);border-color:var(--ink)}
.dc-link-own a{color:inherit;text-decoration:none}
.dc-link-own button{background:none;border:0;cursor:pointer;color:var(--ink-2);padding:0 0 0 3px;display:flex}
.dc-empty{font-size:12px;color:var(--ink-2);font-style:italic}
.dc-addlink{display:flex;gap:7px;margin-top:11px;flex-wrap:wrap}
.dc-addlink input{font:inherit;font-size:12.5px;padding:6px 9px;border:1px solid var(--line-2);background:#fff;
  border-radius:2px;color:var(--ink);flex:1;min-width:180px}
.dc-addlink button{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:12px;color:#fff;
  border:0;border-radius:2px;padding:6px 12px;cursor:pointer}

.dc-foot{margin-top:30px;padding-top:14px;border-top:1px solid var(--line);font-family:'JetBrains Mono',monospace;
  font-size:10px;letter-spacing:.04em;color:var(--ink-2);text-align:center}
.dc-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;
  font-size:12.5px;padding:9px 16px;border-radius:2px;z-index:50;max-width:80vw;text-align:center}

.dc-root button:focus-visible,.dc-root textarea:focus-visible,.dc-root input:focus-visible,.dc-root a:focus-visible{
  outline:2px solid var(--ink);outline-offset:2px}

@media (max-width:900px){ .dc-deriv-grid{grid-template-columns:1fr} }
@media (max-width:860px){
  .dc-brief-body,.dc-tabs,.dc-formats{grid-template-columns:1fr}
  .dc-tab-role{display:none}
  .dc-block-kicker,.dc-scope{display:none}
  .dc-head-r{width:100%}
  .dc-derow{flex-wrap:wrap}
}
@media (prefers-reduced-motion:reduce){ .dc-root *{transition:none!important;animation-duration:.01ms!important} }
`;
