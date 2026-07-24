// ── Directorio del Café · Colombia ──────────────────────────────────────────
// Catálogos REALES y utilidades. Ya no hay datos simulados: las fichas, el muro
// y los mensajes viven en Supabase (tablas directorio_*), se leen/escriben con
// las server actions de src/lib/directorio/actions.ts, y los tipos de esos
// datos están en src/lib/directorio/types.ts. Este módulo solo tiene los
// catálogos que rellenan los formularios y unos cuantos helpers puros.

import { DANE_ENTRIES } from "@/lib/daneCodes.data";

export const ESPECIALIDADES = [
  "Barismo", "Tueste", "Catación", "Caficultura", "Beneficio y fermentación",
  "Preparación de bebidas", "Genética y viveros", "Calidad e inocuidad", "Comercio exterior",
  "Logística", "Marca y contenido", "Formación",
];

/** Qué incluye cada especialidad · se muestra al tocar la «i». */
export const ESP_INFO: Record<string, string> = {
  "Barismo": "Trabajo de barra: molienda, calibración del espresso, leche y latte art, y mantenimiento de la máquina.",
  "Tueste": "Perfiles y curvas de tueste, control de temperatura y desarrollo, y repetibilidad lote a lote.",
  "Catación": "Evaluación sensorial en mesa según protocolo: fragancia, sabor, acidez, cuerpo, puntaje y descriptores.",
  "Caficultura": "Manejo del cultivo en finca: siembra, nutrición, sanidad, sombrío, podas y recolección selectiva.",
  "Beneficio y fermentación": "Del recibo de cereza al pergamino seco: flotación, despulpado, fermentación, lavado y secado.",
  "Preparación de bebidas": "Métodos de filtrado, recetas y estandarización de la carta de bebidas de una cafetería.",
  "Genética y viveros": "Selección de semilla, germinación, chapolas, variedades registradas y asesoría de trasplante.",
  "Calidad e inocuidad": "Análisis físico, defectos, humedad y rendimiento, más sistemas HACCP y trazabilidad de proceso.",
  "Comercio exterior": "Exportación e importación: Incoterms, aduanas, documentación de despacho y cumplimiento EUDR.",
  "Logística": "Acopio, transporte, bodega, control de inventarios, consolidación de contenedor y última milla.",
  "Marca y contenido": "Narrativa de origen: fotografía, video, empaque, etiqueta y páginas públicas de lote con QR.",
  "Formación": "Cursos, talleres y acompañamiento para preparar exámenes y certificaciones del sector.",
};

/** Banco de certificaciones · seguirá creciendo. */
export const BANCO_CERT: { g: string; items: string[] }[] = [
  {
    g: "SCA · Specialty Coffee Association", items: [
      "SCA Introduction to Coffee", "SCA Coffee Skills", "SCA Barista Skills · Foundation",
      "SCA Barista Skills · Intermediate", "SCA Barista Skills · Professional", "SCA Brewing · Foundation",
      "SCA Brewing · Intermediate", "SCA Brewing · Professional", "SCA Sensory Skills", "SCA Green Coffee",
      "SCA Roasting Professional", "SCA Coffee Diploma",
    ],
  },
  {
    g: "CQI · Coffee Quality Institute", items: [
      "Q Grader (CQI)", "Q Grader Robusta (CQI)", "Q Processing · Nivel 1", "Q Processing · Nivel 2",
      "Q Processing Professional",
    ],
  },
  {
    g: "SENA y formación técnica", items: [
      "SENA", "SENA · Técnico en producción de café", "SENA · Barismo", "SENA · Catación",
      "Tecnólogo en gestión empresarial cafetera",
    ],
  },
  {
    g: "Finca y sostenibilidad", items: [
      "BPA (ICA)", "Registro de vivero ICA", "Rainforest Alliance", "Fairtrade", "Orgánico (UE / USDA)",
      "Cédula Cafetera", "Extensionista Fedecafé",
    ],
  },
  {
    g: "Inocuidad e industria", items: [
      "HACCP", "BPM · Buenas Prácticas de Manufactura", "ISO 9001", "ISO 22000", "Manipulación de alimentos",
    ],
  },
  {
    g: "Fermentación y beneficio", items: [
      "Fermentación controlada", "Fermentación anaeróbica", "Fermentación con levaduras seleccionadas",
      "Control de pH y °Brix en fermentación", "Beneficio lavado, honey y natural",
      "Termómetro y data logger de fermentación",
    ],
  },
  {
    g: "Cumplimiento y EUDR", items: [
      "Debida diligencia EUDR", "Geolocalización y polígono de predio (EUDR)",
      "Declaración de debida diligencia (DDS)", "Trazabilidad de cadena de custodia",
    ],
  },
  {
    g: "Auditoría y aseguramiento", items: [
      "Auditor interno BPA (ICA)", "Auditor interno BPM / HACCP", "Auditoría de inocuidad",
      "Auditoría de cadena de custodia", "ISO 19011 · auditoría de sistemas de gestión",
      "Auditor Rainforest / Fairtrade",
    ],
  },
  {
    g: "Comercio y logística", items: [
      "Agente de aduanas", "Incoterms y comercio internacional", "Gestión de inventarios (CSCP)",
    ],
  },
  {
    g: "CTC y experiencia", items: [
      "Certificación CTC · Arena", "Autodidacta", "Experiencia comprobable en finca",
      "Experiencia comprobable en barra",
    ],
  },
];

export const TODAS_CERT = BANCO_CERT.flatMap((g) => g.items);

export const MOTIVOS = [
  "Quiero que me encuentren para trabajar",
  "Busco clientes para mi café",
  "Busco proveedores de café",
  "Quiero formarme y aprender",
  "Quiero dictar cursos o seminarios",
  "Busco socios para un proyecto",
  "Solo quiero conectar con la red",
  "Otro",
];

/* ---------- muro ---------- */

export const ETIQUETAS = ["Todo", "Anuncio", "Oferta laboral", "Pregunta técnica", "Evento", "Seminario", "Lotes y muestras"];

/** Las que puede elegir quien publica: el muro completo menos el filtro "Todo". */
export const ETIQUETAS_PUBLICAR = ETIQUETAS.slice(1);

/* ---------- mensajería ---------- */

export const ASUNTOS_MENSAJE = [
  "Propuesta de trabajo",
  "Consulta técnica",
  "Compra de café",
  "Invitación a evento o seminario",
  "Solo quiero conectar",
];

/* ---------- documentos del perfil ---------- */

export const TIPOS_DOC = [
  "Certificado", "Diploma", "Hoja de vida", "Registro o licencia",
  "Página web", "Red social", "Portafolio en línea", "Video", "Otro",
];

// Enlaces a las otras superficies del ecosistema, para el panel "Mis plataformas".
// NODE_ENV es constante en compilación (cliente y servidor), así que no genera
// hydration mismatch — mismo patrón que FAMILY_LINKS en Cherry Picked.
export const PLATAFORMA_LINKS =
  process.env.NODE_ENV === "development"
    ? { kr: "/kaffetal-regal", cp: "/cherry-picked", panel: "/panel", home: "/" }
    : {
        kr: "https://kaffetal-regal.ctcexport.com",
        cp: "https://cherry-picked.ctcexport.com",
        panel: "https://ctcexport.com/panel",
        home: "https://ctcexport.com",
      };

// ── Geografía de Colombia (todo el país, no solo Santander) ──────────────────
// Construida sobre la tabla DANE ya presente en el repo (src/lib/daneCodes.data.ts),
// que EUDR usa para resolver códigos de predio. Los nombres del DANE vienen en
// MAYÚSCULAS y sin tildes; aquí se muestran con tilde/casing correcto en los 33
// departamentos (mapa fijo) y en título para los ~1.120 municipios.
const DEP_DISPLAY: Record<string, string> = {
  "AMAZONAS": "Amazonas", "ANTIOQUIA": "Antioquia", "ARAUCA": "Arauca",
  "ATLANTICO": "Atlántico", "BOGOTA": "Bogotá D.C.", "BOLIVAR": "Bolívar",
  "BOYACA": "Boyacá", "CALDAS": "Caldas", "CAQUETA": "Caquetá", "CASANARE": "Casanare",
  "CAUCA": "Cauca", "CESAR": "Cesar", "CHOCO": "Chocó", "CORDOBA": "Córdoba",
  "CUNDINAMARCA": "Cundinamarca", "GUAINIA": "Guainía", "GUAVIARE": "Guaviare",
  "HUILA": "Huila", "LA GUAJIRA": "La Guajira", "MAGDALENA": "Magdalena", "META": "Meta",
  "N. DE SANTANDER": "Norte de Santander", "NARIÑO": "Nariño", "PUTUMAYO": "Putumayo",
  "QUINDIO": "Quindío", "RISARALDA": "Risaralda", "SAN ANDRES": "San Andrés y Providencia",
  "SANTANDER": "Santander", "SUCRE": "Sucre", "TOLIMA": "Tolima",
  "VALLE DEL CAUCA": "Valle del Cauca", "VAUPES": "Vaupés", "VICHADA": "Vichada",
};

const CONECTORES = new Set(["de", "del", "la", "las", "los", "y", "e"]);
const tituloMun = (s: string) =>
  s.toLowerCase().split(/(\s+|-)/).map((w, i) => {
    if (/^\s+$/.test(w) || w === "-" || w === "") return w;
    if (i > 0 && CONECTORES.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join("");

const depDisplay = (raw: string) => DEP_DISPLAY[raw] ?? tituloMun(raw);

const MUN_POR_DEP = new Map<string, string[]>();
for (const e of DANE_ENTRIES) {
  const dep = depDisplay(e.dep);
  if (!MUN_POR_DEP.has(dep)) MUN_POR_DEP.set(dep, []);
  MUN_POR_DEP.get(dep)!.push(tituloMun(e.mun));
}
for (const list of MUN_POR_DEP.values()) list.sort((a, b) => a.localeCompare(b, "es"));

/** Los 33 departamentos de Colombia, con tilde, ordenados alfabéticamente. */
export const DEPARTAMENTOS: string[] = [...MUN_POR_DEP.keys()].sort((a, b) => a.localeCompare(b, "es"));

/** Municipios de un departamento (título, ordenados). Vacío si no se reconoce. */
export const municipiosDe = (dep: string): string[] => MUN_POR_DEP.get(dep) ?? [];

/* ---------- utilidades ---------- */

/** Paleta de avatares del directorio (misma que traía el prototipo). */
export const COLORES = [
  "#C8102E", "#7A3E12", "#12408C", "#1B3A2C", "#3E6B4F", "#8A4B9E",
  "#2F6F6B", "#4A1E8C", "#B07800", "#4C5A6A", "#A02A6B", "#2A0A55",
];

/** Color estable de avatar derivado de una semilla (el id del perfil). */
export const colorPara = (seed: string) =>
  COLORES[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES.length];

/** Código público de la ficha, derivado del id (como supplierCode en KR). */
export const codigoDirectorio = (id: string) =>
  "DC-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();

/** Iniciales: primera letra del primer nombre y del último apellido. */
export const iniciales = (n: string) =>
  (n || "")
    .trim()
    .split(/\s+/)
    .filter((_, k, a) => k === 0 || k === a.length - 1)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase() || "··";

export const sinTildes = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const pesoLegible = (b: number) =>
  b < 1024 * 1024 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1) + " MB";

export const extension = (n: string) => {
  const e = (n.split(".").pop() ?? "").toUpperCase();
  return e.length > 4 ? "DOC" : e;
};

export const horaAhora = () =>
  new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

/** "hace 5 min", "hace 3 h", "ayer", "12 mar" — tiempo relativo compacto. */
export const hace = (iso: string): string => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
};
