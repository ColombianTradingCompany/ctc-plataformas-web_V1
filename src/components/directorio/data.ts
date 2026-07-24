// ── Directorio de Especialistas del Café · Santander ────────────────────────
// Catálogos y datos de la maqueta, portados 1:1 del prototipo
// `reference_directorio-expertos/directorio-cafe-santander_V2.html`.
//
// TODO lo que hay aquí abajo de los catálogos (las 44 fichas, los hilos de
// mensajes, las publicaciones del muro, la usuaria de la sesión) es
// SIMULADO — ninguna persona, teléfono o certificación corresponde a alguien
// real. La interfaz lo dice en voz alta (bandas "datos simulados", etiqueta
// "Simulado" en cada tarjeta) y así debe seguir hasta que el directorio tenga
// respaldo en Supabase. Los catálogos de arriba (municipios, especialidades,
// banco de certificaciones) sí son reales y son los que sobrevivirán a esa
// migración.

import { DANE_ENTRIES } from "@/lib/daneCodes.data";

export type Plataforma = "Kaffetal Regal" | "Cherry Picked" | "Ambas";

export const MUNICIPIOS = [
  "Bucaramanga", "Floridablanca", "Piedecuesta", "Girón", "San Gil", "Socorro",
  "Barichara", "Curití", "Charalá", "Mogotes", "Zapatoca", "Los Santos", "Rionegro", "Lebrija",
  "Vélez", "Oiba", "Suaita", "San Vicente de Chucurí", "Landázuri", "Málaga", "Guaca",
];

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

export const ESPECIALIDADES = [
  "Barismo", "Tueste", "Catación", "Caficultura", "Beneficio y fermentación",
  "Preparación de bebidas", "Genética y viveros", "Calidad e inocuidad", "Comercio exterior",
  "Logística", "Marca y contenido", "Formación",
];

/** Nombres cortos, los que usan las fichas simuladas. */
const CERTIFICACIONES = [
  "SCA Coffee Skills", "Q Grader (CQI)", "SENA", "BPA (ICA)", "HACCP",
  "ISO 9001", "Cédula Cafetera", "Autodidacta",
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

/** Qué busca cada perfil en el directorio, según su oficio principal. */
const BUSCA_POR_ESP: Record<string, string> = {
  "Barismo": "Barra fija o eventos de cafetería",
  "Tueste": "Microlotes para tostar y clientes de tueste por encargo",
  "Catación": "Panelistas y lotes por caracterizar",
  "Caficultura": "Compradores directos para su cosecha",
  "Beneficio y fermentación": "Asesorías de beneficio y fincas aliadas",
  "Preparación de bebidas": "Cafeterías para montar carta",
  "Genética y viveros": "Caficultores que quieran renovar variedad",
  "Calidad e inocuidad": "Plantas y trilladoras por certificar",
  "Comercio exterior": "Productores listos para exportar",
  "Logística": "Acopio y consolidación de carga",
  "Marca y contenido": "Fincas y marcas que quieran contar su origen",
  "Formación": "Grupos para cursos y talleres",
};

export const PLATAFORMAS: Plataforma[] = ["Kaffetal Regal", "Cherry Picked", "Ambas"];

/** Color del avatar según la especialidad principal. */
const COLOR_ESP = [
  "#C8102E", "#7A3E12", "#12408C", "#1B3A2C", "#3E6B4F", "#8A4B9E",
  "#2F6F6B", "#4A1E8C", "#B07800", "#4C5A6A", "#A02A6B", "#2A0A55",
];

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

export type Ficha = {
  id: string;
  nombre: string;
  municipio: string;
  esp: string[];
  cert: string[];
  anios: number;
  plataforma: Plataforma;
  verificado: boolean;
  bio: string;
  busca: string;
  color: string;
  iniciales: string;
};

/* ---------- 44 fichas simuladas ----------
   [nombre, municipio, [especialidades], [certificaciones], años, plataforma, verificado, presentación] */
type FilaCruda = [string, number, number[], number[], number, number, number, string];

const CRUDO: FilaCruda[] = [
  ["Andrés Felipe Ortiz", 2, [3, 4], [3, 2], 14, 0, 1, "Caficultor en la vereda La Esperanza. Fermentaciones controladas y secado en marquesina."],
  ["Luz Dary Sanmiguel", 4, [0, 5], [0, 2], 7, 1, 1, "Barista de barra y competencia. Diseño de cartas de filtrados para cafeterías del casco antiguo."],
  ["Jhon Fredy Carreño", 6, [1, 2], [0, 1], 11, 2, 1, "Tostador de perfil y catador. Trabajo microlotes de la provincia de Guanentá."],
  ["Diana Carolina Pabón", 0, [2, 7], [1, 4], 9, 1, 1, "Q Grader. Panel sensorial y control de calidad física para exportación."],
  ["Óscar Julián Amaya", 17, [3, 4], [3, 6], 22, 0, 1, "Finca familiar a 1.680 msnm. Castillo y Colombia, beneficio lavado tradicional."],
  ["Sandra Milena Quintero", 1, [0, 11], [0, 2], 6, 1, 0, "Formadora de baristas. Cursos de extracción y latte art para equipos de cafeterías."],
  ["Wilson Duarte Rangel", 8, [3, 6], [3, 7], 18, 0, 1, "Vivero propio de variedades registradas. Chapolas de Geisha, Pink Bourbon y Tabi."],
  ["Katherine Ávila Solano", 0, [8, 9], [5, 2], 8, 1, 1, "Comercio exterior. Documentación de exportación, Incoterms y coordinación de embarques."],
  ["Nelson Eduardo Prada", 5, [4, 3], [3, 2], 16, 0, 0, "Maestro de beneficio. Instrumentación de pH y °Brix en fermentación anaeróbica."],
  ["Yuranny Serrano Gómez", 7, [2, 0], [0, 7], 5, 2, 0, "Catadora en formación y barista. Apoyo en mesas de catación de la provincia."],
  ["Camilo Andrés Villamizar", 2, [1, 10], [0, 7], 10, 1, 1, "Tostador y creador de contenido. Video de origen y fichas técnicas para tostadurías."],
  ["Martha Lucía Bohórquez", 14, [3, 4], [3, 6], 25, 0, 1, "Caficultora de Vélez. Tres generaciones en la misma finca, secado solar y control de humedad."],
  ["Freddy Alonso Chacón", 3, [9, 8], [5, 2], 12, 1, 0, "Logística nacional y última milla. Consolidación de carga hacia puerto."],
  ["Paola Andrea Meneses", 0, [7, 2], [4, 0], 9, 2, 1, "Ingeniera de alimentos. Sistemas HACCP y aseguramiento de inocuidad en trilla y empaque."],
  ["Hugo Ernesto Silva", 10, [3, 4], [3, 7], 20, 0, 1, "Zapatoca, 1.750 msnm. Lotes pequeños de Bourbon rosado con fermentación láctica."],
  ["Claudia Patricia Arenas", 1, [0, 5], [0, 2], 11, 1, 1, "Preparación de bebidas y consultoría de barra. Estandarización de recetas."],
  ["Jairo Alberto Delgado", 13, [3, 9], [3, 2], 17, 0, 0, "Caficultor y transportador. Acopio de pergamino en la ruta Lebrija–Girón."],
  ["Angélica Ríos Barajas", 4, [2, 11], [1, 0], 13, 2, 1, "Q Grader y formadora. Preparación para el examen CQI y calibración de paneles."],
  ["Rubén Darío Peñaloza", 9, [3, 6], [3, 6], 19, 0, 1, "Semillero certificado y asesoría de siembra por altura y perfil objetivo."],
  ["Erika Johana Mantilla", 0, [10, 11], [7, 2], 6, 1, 0, "Marca y narrativa de origen. Fotografía de finca y páginas públicas de lote."],
  ["Gustavo Adolfo Beltrán", 2, [1, 7], [0, 4], 15, 2, 1, "Tueste industrial y control de proceso. Curvas replicables y trazabilidad de lote."],
  ["Laura Ximena Cadena", 6, [0, 10], [2, 7], 4, 1, 0, "Barista y anfitriona de catas abiertas para turistas en Barichara."],
  ["Alexánder Gómez Uribe", 11, [3, 4], [3, 2], 21, 0, 1, "Los Santos. Recolección selectiva y honey de secado lento."],
  ["Yeimy Rocío Estupiñán", 15, [3, 7], [3, 4], 10, 0, 0, "Caficultora y auditora interna de buenas prácticas agrícolas."],
  ["Fabián Mauricio Lizarazo", 0, [8, 10], [5, 0], 14, 1, 1, "Desarrollo de mercado en Europa. Relación con tostadurías y ferias del sector."],
  ["Nubia Esperanza Ardila", 16, [3, 4], [3, 6], 23, 0, 1, "Suaita. Café de sombrío, beneficio lavado y patio de secado tradicional."],
  ["Édgar Iván Contreras", 5, [4, 2], [0, 3], 12, 2, 1, "Beneficio y catación. Acompañamiento técnico a asociaciones de la provincia Comunera."],
  ["Tatiana Suárez Rueda", 1, [0, 2], [0, 1], 8, 2, 1, "Q Grader y barista. Cierro el círculo entre la mesa de catación y la barra."],
  ["José Gregorio Plata", 18, [3, 9], [3, 7], 26, 0, 0, "Landázuri. Finca en zona de ladera, cosecha principal y mitaca."],
  ["Mónica Alejandra Vera", 0, [7, 8], [4, 5], 11, 1, 1, "Calidad e inocuidad para exportación. Auditorías y documentación de despacho."],
  ["Álvaro Hernán Torres", 19, [3, 6], [3, 6], 24, 0, 1, "Málaga, García Rovira. Variedades resistentes adaptadas a más de 2.000 msnm."],
  ["Leidy Johana Parra", 2, [1, 0], [0, 2], 7, 1, 0, "Tostadora de microlotes y barra propia. Tuesto para filtrado y espresso."],
  ["Sergio Iván Rojas", 0, [9, 8], [5, 2], 13, 1, 1, "Coordinación logística y gestión de inventarios de café verde en bodega."],
  ["Carmen Elisa Navarro", 8, [3, 4], [3, 7], 18, 0, 1, "Charalá. Fermentación en tanque cerrado con control de temperatura."],
  ["Duván Steven Acevedo", 3, [0, 5], [2, 7], 3, 1, 0, "Barista joven. Compito en filtrado y aprendo catación con el panel regional."],
  ["Rosalba Jaimes Cala", 12, [3, 4], [3, 6], 27, 0, 1, "Rionegro. Café de altura con secado en marquesina y control mensual de humedad."],
  ["Iván Camilo Mendoza", 0, [2, 7], [1, 0], 10, 2, 1, "Q Grader. Evaluación de muestras y reportes sensoriales para compradores."],
  ["Adriana Marcela Pinzón", 4, [10, 11], [7, 2], 9, 1, 0, "Contenido y formación. Documentales cortos de finca y talleres de storytelling."],
  ["Néstor Julio Vargas", 7, [3, 4], [3, 2], 20, 0, 1, "Curití. Beneficio con lavado mecánico y clasificación por densidad."],
  ["Sonia Patricia Herrera", 1, [7, 11], [4, 5], 15, 2, 1, "Inocuidad y formación. Implantación de HACCP en plantas de trilla y tueste."],
  ["Brayan Stiven Moreno", 0, [1, 10], [0, 7], 5, 1, 0, "Tostador y diseñador. Empaque, etiqueta y códigos QR de trazabilidad."],
  ["Gloria Inés Ballesteros", 20, [3, 6], [3, 6], 22, 0, 1, "Guaca. Vivero y multiplicación de variedades registradas para la provincia."],
  ["Mauricio Andrés Reyes", 2, [8, 9], [5, 0], 16, 1, 1, "Exportación de café verde. Nacionalización, aduanas y seguimiento de contenedor."],
  ["Deisy Yulieth Ramírez", 6, [0, 2], [0, 2], 6, 2, 0, "Barista y catadora. Cafetería de especialidad con carta rotativa de microlotes."],
];

/** Iniciales: primera letra del primer nombre y del último apellido. */
export const iniciales = (n: string) =>
  n.split(" ").filter((_, k, a) => k === 0 || k === a.length - 1).map((w) => w[0] ?? "").join("").toUpperCase();

export const FICHAS: Ficha[] = CRUDO.map((f, i) => ({
  id: "SDR-" + String(i + 101).padStart(4, "0"),
  nombre: f[0],
  municipio: MUNICIPIOS[f[1]],
  esp: f[2].map((x) => ESPECIALIDADES[x]),
  cert: f[3].map((x) => CERTIFICACIONES[x]),
  anios: f[4],
  plataforma: PLATAFORMAS[f[5]],
  verificado: !!f[6],
  bio: f[7],
  busca: BUSCA_POR_ESP[ESPECIALIDADES[f[2][0]]],
  color: COLOR_ESP[f[2][0]],
  iniciales: iniciales(f[0]),
}));

/* ---------- usuaria de la sesión (demo) ---------- */

export type Usuario = {
  id: string;
  nombre: string;
  municipio: string;
  tel: string;
  mail: string;
  anios: number;
  esp: string[];
  cert: string[];
  plataforma: Plataforma;
  bio: string;
  motivo: string;
  motivoTxt: string;
  color: string;
  verificado: boolean;
};

export const USUARIO_INICIAL: Usuario = {
  id: "SDR-0007",
  nombre: "Marcela Rueda",
  municipio: "Barichara",
  tel: "+57 317 402 8813",
  mail: "marcela.rueda@kaffetal.co",
  anios: 9,
  esp: ["Catación", "Tueste"],
  cert: ["Q Grader (CQI)", "SCA Sensory Skills"],
  plataforma: "Kaffetal Regal",
  bio: "Panel sensorial y desarrollo de perfil para microlotes. 9 años entre la mesa de catación y el tostador.",
  motivo: "Busco proveedores de café",
  motivoTxt: "Busco microlotes de Guanentá para caracterizar antes de la Arena.",
  color: "#1B3A2C",
  verificado: true,
};

/* ---------- mensajería (demo) ---------- */

export type Mensaje = { yo: boolean; texto: string; hora: string };
export type Hilo = {
  id: string;
  nombre: string;
  color: string;
  iniciales: string;
  sub: string;
  noLeido: boolean;
  mensajes: Mensaje[];
};

export const HILOS_INICIALES: Hilo[] = [
  {
    id: "SDR-0104", nombre: "Diana Carolina Pabón", color: "#12408C", iniciales: "DP",
    sub: "Bucaramanga · Catación", noLeido: true, mensajes: [
      { yo: false, texto: "Marcela, buenos días. Vi tu ficha en el directorio. ¿Tienes disponibilidad para calibrar el panel antes de la Arena de agosto?", hora: "08:12" },
      { yo: true, texto: "Buenos días Diana. Sí, tengo la primera semana libre. ¿Cuántas muestras van a correr?", hora: "08:40" },
      { yo: false, texto: "Serían 22 muestras de la mitaca, en dos sesiones. Te paso la agenda hoy mismo.", hora: "08:44" },
    ],
  },
  {
    id: "SDR-0111", nombre: "Camilo Andrés Villamizar", color: "#7A3E12", iniciales: "CV",
    sub: "Piedecuesta · Tueste", noLeido: true, mensajes: [
      { yo: false, texto: "Hola. Estoy grabando los videos de origen de tres fincas en Charalá y necesito una voz técnica para la parte de catación. ¿Te interesa?", hora: "Ayer" },
      { yo: true, texto: "Me interesa. Mándame el guion y las fechas de rodaje.", hora: "Ayer" },
    ],
  },
  {
    id: "SDR-0125", nombre: "Fabián Mauricio Lizarazo", color: "#B07800", iniciales: "FL",
    sub: "Bucaramanga · Comercio exterior", noLeido: true, mensajes: [
      { yo: false, texto: "Una tostaduría de Utrecht pregunta por lotes lavados de Guanentá entre 86 y 88 puntos. ¿Tienes fichas de la cosecha pasada que pueda compartir?", hora: "Mar" },
    ],
  },
];

export const ASUNTOS_MENSAJE = [
  "Propuesta de trabajo",
  "Consulta técnica",
  "Compra de café",
  "Invitación a evento o seminario",
  "Solo quiero conectar",
];

/* ---------- muro (demo) ---------- */

export const ETIQUETAS = ["Todo", "Anuncio", "Oferta laboral", "Pregunta técnica", "Evento", "Seminario", "Lotes y muestras"];

/** Las que puede elegir quien publica: el muro completo menos el filtro "Todo". */
export const ETIQUETAS_PUBLICAR = ETIQUETAS.slice(1);

export type Post = {
  fijo?: boolean;
  autor: string;
  sub: string;
  ini: string;
  color: string;
  etiqueta: string;
  cuando: string;
  plataforma: Plataforma;
  megusta: number;
  comentarios: number;
  texto: string;
  miGusta?: boolean;
};

export const POSTS_INICIALES: Post[] = [
  {
    fijo: true, autor: "Colombian Trading Company", sub: "CTC · Piedecuesta", ini: "CT", color: "#2A0A55",
    etiqueta: "Anuncio", cuando: "Fijado", plataforma: "Ambas", megusta: 38, comentarios: 12,
    texto: "Abrimos la convocatoria de la Cupping Arena de mitaca. Recibimos muestras de 2 kg de pergamino hasta el 15 de agosto en el laboratorio de Piedecuesta.\n\nLa catación es a ciegas ante Q-Graders invitados y la certificación CTC es gratuita para todos los participantes, ganen o no. Marca el paquete con tu código de lote.",
  },
  {
    autor: "Angélica Ríos Barajas", sub: "San Gil · Catación · Formación", ini: "AB", color: "#12408C",
    etiqueta: "Seminario", cuando: "hace 2 h", plataforma: "Ambas", megusta: 21, comentarios: 7,
    texto: "Abro grupo de preparación para el examen Q Grader (CQI). Nos reunimos martes y jueves de 6 a 8 pm en San Gil, arrancando en agosto.\n\nGratis para miembros del directorio, cupo para 12 personas. Escríbanme por mensaje directo.",
  },
  {
    autor: "Fabián Mauricio Lizarazo", sub: "Bucaramanga · Comercio exterior", ini: "FL", color: "#B07800",
    etiqueta: "Oferta laboral", cuando: "hace 5 h", plataforma: "Cherry Picked", megusta: 16, comentarios: 9,
    texto: "Buscamos analista de calidad física y sensorial para la temporada S2. Medio tiempo, base en Bucaramanga, con viajes a fincas de Guanentá.\n\nRequisito: SCA Green Coffee o experiencia comprobable en trilla. Se valora licencia Q.",
  },
  {
    autor: "Óscar Julián Amaya", sub: "San Vicente de Chucurí · Caficultura", ini: "OA", color: "#1B3A2C",
    etiqueta: "Pregunta técnica", cuando: "hace 8 h", plataforma: "Kaffetal Regal", megusta: 11, comentarios: 23,
    texto: "Pregunta para los maestros de beneficio: en fermentación anaeróbica de 72 horas a 1.680 msnm, ¿a qué °Brix están cortando ustedes?\n\nVengo cortando en 8 y la taza me sale limpia pero corta de dulzor. Agradezco experiencias.",
  },
  {
    autor: "Sandra Milena Quintero", sub: "Floridablanca · Barismo · Formación", ini: "SQ", color: "#C8102E",
    etiqueta: "Evento", cuando: "ayer", plataforma: "Cherry Picked", megusta: 29, comentarios: 5,
    texto: "Taller de tueste de perfil el sábado 8 de agosto en Floridablanca, de 9 am a 1 pm. Tostadora de muestra, tres curvas y catación del resultado.\n\n50% de descuento presentando el código de tu ficha del directorio.",
  },
  {
    autor: "Rosalba Jaimes Cala", sub: "Rionegro · Caficultura", ini: "RC", color: "#1B3A2C",
    etiqueta: "Lotes y muestras", cuando: "ayer", plataforma: "Kaffetal Regal", megusta: 14, comentarios: 6,
    texto: "Tengo 180 kg de pergamino seco de Castillo, secado en marquesina, humedad estable en 10,8%. Busco catador que me ayude a caracterizarlo antes de mandarlo a la Arena.\n\nEstoy en la vereda El Carmen, Rionegro.",
  },
  {
    autor: "Paola Andrea Meneses", sub: "Bucaramanga · Calidad e inocuidad", ini: "PM", color: "#4A1E8C",
    etiqueta: "Pregunta técnica", cuando: "hace 2 días", plataforma: "Ambas", megusta: 19, comentarios: 8,
    texto: "Recordatorio para quienes van a exportar: la declaración de debida diligencia EUDR necesita la geolocalización del predio, y el polígono completo si la finca pasa de 4 hectáreas.\n\nSi la registran bien desde el principio, CTC hace el resto del papeleo.",
  },
  {
    autor: "Wilson Duarte Rangel", sub: "Charalá · Genética y viveros", ini: "WR", color: "#3E6B4F",
    etiqueta: "Anuncio", cuando: "hace 3 días", plataforma: "Kaffetal Regal", megusta: 24, comentarios: 15,
    texto: "Salió el lote de chapolas de Pink Bourbon y Tabi para trasplante de septiembre. Genética registrada, mínimo 100 unidades.\n\nAsesoro la selección según altura y perfil de taza objetivo. Escríbanme.",
  },
];

/* ---------- documentos del perfil (demo) ---------- */

export const TIPOS_DOC = ["Certificado", "Diploma", "Hoja de vida", "Registro o licencia", "Otro"];

export type Documento = { nombre: string; tam: number; tipo: string; fecha: string };

export const DOCUMENTOS_INICIALES: Documento[] = [
  { nombre: "Licencia-Q-Grader-CQI-2024.pdf", tam: 412_000, tipo: "Certificado", fecha: "12 mar 2026" },
];

/* ---------- utilidades ---------- */

export const sinTildes = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Clase de la etiqueta de plataforma: verde Kaffetal, rojo Cherry Picked, azul ambas. */
export const claseP = (p: Plataforma) =>
  p === "Kaffetal Regal" ? "tag--kr" : p === "Cherry Picked" ? "tag--cp" : "tag--amb";

export const pesoLegible = (b: number) =>
  b < 1024 * 1024 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1) + " MB";

export const extension = (n: string) => {
  const e = (n.split(".").pop() ?? "").toUpperCase();
  return e.length > 4 ? "DOC" : e;
};

export const horaAhora = () =>
  new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
