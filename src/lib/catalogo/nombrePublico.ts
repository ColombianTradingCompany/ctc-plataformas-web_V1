// ── V5.202 (owner, 2026-10-10) · el NOMBRE PÚBLICO de un lote, sin texto libre del productor ───────────────────────────────
// El owner: lo público debe «omitir info que haga fácil circumventar a CTCx para llegar al Productor». El nombre que escribió el
// productor (`lots.name`, `datasheet.product_name`) solía llevar la finca o el municipio, así que lo público lleva un nombre
// GENERADO: variedades + proceso · región + año («Castillo Lavado · Santander 2026»). Pero las variedades TAMBIÉN las escribe
// el productor (B1 es un campo con sugerencias, no una lista cerrada: en la base hay «castillo», «Costa rica 95»…), y la
// revisión del nodo final (2026-10-10) pidió que tampoco por ahí se cuele nada: una variedad sale SOLO si está en la lista
// canónica, con su nombre canónico; el proceso, solo si es uno de su enum (Lavado · Honey · Natural); lo desconocido se OMITE.
//
// UNA REGLA, DOS LUGARES. La vista pública (`public_lot_vitrina`, `public_lot_catalog`) genera el nombre en SQL
// (`public.nombre_publico_lote`, `public.variedad_publica`, `public.proceso_publico`: `docs/migraciones/2026-10-10_vitrina_sin_finca.sql`);
// lo que no lee esas vistas (la subasta Tyrian, que no está en la vitrina; el Dossier público, que normaliza sus variedades) usa
// este módulo. `qa-sneak-peek-check` exige que la lista VALUES de la función SQL sea EXACTAMENTE `VARIEDADES_PUBLICAS` y que
// la tabla de tildes y el enum de procesos coincidan: si alguien añade una variedad a la Ficha o al Mapa de Variedades, el
// guardián falla hasta que la migración (o una nueva) lleve la lista al día.
// PURO: solo datos (la Ficha y el Mapa de Variedades, módulos sin imports de valor) y funciones.

import { PROCESOS_BASE, VARIETIES } from "@/components/kaffetal-regal/ficha/fichaData";
import { VARIEDADES_DATOS } from "@/lib/catacion/variedadesDatos";
import { fichaDeVariedad } from "@/lib/catacion/variedades";

/** Las letras con tilde que la clave aplana (la misma tabla va en el `translate()` de SQL; el guardián las compara). */
export const TILDES_DE = "ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãéèëêíìïîóòöôõúùüûñç";
export const TILDES_A = "AAAAAEEEEIIIIOOOOOUUUUNCaaaaaeeeeiiiiooooouuuunc";

/** La clave con que se busca una variedad: NFC, sin tildes, en minúscula, sin paréntesis, solo `a-z 0-9 . espacio`. Es la misma
 *  expresión que `public.clave_de_variedad` en SQL, paso a paso (por eso no usa NFD ni `\p{…}`: SQL no los tiene igual). */
export function claveDeVariedad(nombre: string | null | undefined): string {
  let plano = "";
  for (const ch of String(nombre ?? "").normalize("NFC")) {
    const i = TILDES_DE.indexOf(ch);
    plano += i >= 0 ? TILDES_A[i] : ch;
  }
  return plano
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** «Castillo (General)» → «Castillo», «Moka (Mocha)» → «Moka»: el nombre de la Ficha sin su paréntesis. */
const sinParentesis = (v: string) => v.replace(/\s*\(.*\)\s*$/, "").trim();

/** Cómo se escribe en Colombia una variedad que la Ficha nombra de otro modo (además de lo que ya empareja el Mapa). */
const ALIAS_PUBLICOS: Record<string, string> = {
  tipica: "Typica",
  "typica tradicional": "Typica",
  borbon: "Bourbon",
  "bourbon rojo": "Bourbon",
  "bourbon amarillo": "Bourbon",
  "bourbon rosado": "Borbón Rosado",
  "castillo general": "Castillo",
  "variedad castillo": "Castillo",
  colombia: "Variedad Colombia",
  "cenicafe uno": "Cenicafé 1",
};

/** La lista CANÓNICA, `[clave, nombre]` ordenada por clave: las variedades de la Ficha (B1) con su nombre de la Ficha, las del Mapa
 *  de Variedades (si la Ficha tiene esa variedad, con el nombre de la Ficha: «Geisha» → «Gesha») y unos pocos alias. La primera
 *  fuente que da una clave gana. */
export const VARIEDADES_PUBLICAS: readonly (readonly [string, string])[] = (() => {
  const m = new Map<string, string>();
  const pon = (clave: string, nombre: string) => {
    if (clave && nombre && !m.has(clave)) m.set(clave, nombre);
  };
  for (const v of VARIETIES) pon(claveDeVariedad(v.v), sinParentesis(v.v));
  const deLaFicha = new Map<string, string>();
  for (const v of VARIETIES) {
    const f = fichaDeVariedad(v.v);
    if (f && !deLaFicha.has(f.id)) deLaFicha.set(f.id, sinParentesis(v.v));
  }
  for (const f of VARIEDADES_DATOS) {
    const nombre = deLaFicha.get(f.id) ?? f.nombre;
    pon(claveDeVariedad(f.id), nombre);
    pon(claveDeVariedad(f.nombre), nombre);
  }
  for (const [alias, nombre] of Object.entries(ALIAS_PUBLICOS)) pon(claveDeVariedad(alias), nombre);
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
})();

const POR_CLAVE = new Map(VARIEDADES_PUBLICAS);

/** El nombre canónico de una variedad que escribió el productor, o null si no está en la lista (entonces NO sale en público). */
export function variedadPublica(nombre: string | null | undefined): string | null {
  return POR_CLAVE.get(claveDeVariedad(nombre)) ?? null;
}

export type ProcesoPublico = (typeof PROCESOS_BASE)[number];

/** El proceso BASE del lote, solo si es uno de su enum (Lavado · Honey · Natural); cualquier otra cosa, null. */
export function procesoPublico(p: string | null | undefined): ProcesoPublico | null {
  const k = String(p ?? "").trim().toLowerCase();
  return PROCESOS_BASE.find((x) => x.toLowerCase() === k) ?? null;
}

/** Las variedades del lote en público: las canónicas, sin repetir, en el orden de la Ficha; si no hay, la que manda (`ficha_variedad`). */
export function variedadesPublicas(varieties: unknown, fichaVariedad: string | null | undefined): string[] {
  const lista = Array.isArray(varieties) ? varieties : [];
  const nombres: string[] = [];
  for (const v of lista) {
    const n = variedadPublica(v && typeof v === "object" ? String((v as { name?: unknown }).name ?? "") : null);
    if (n && !nombres.includes(n)) nombres.push(n);
  }
  if (nombres.length) return nombres;
  const una = variedadPublica(fichaVariedad);
  return una ? [una] : [];
}

/** La referencia pública de un lote (`CTC-L-` + los 8 primeros hexadecimales del id), sin importar `data.ts`. */
const referenciaDe = (lotId: string) => `CTC-L-${lotId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

const anioDe = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : String(d.getUTCFullYear());
};

/** El nombre PÚBLICO de un lote: variedades + proceso · región + año. El espejo en TS de `public.nombre_publico_lote` (SQL), para
 *  lo que no lee las vistas públicas (la subasta Tyrian). Nunca usa `lots.name`, `product_name` ni la finca. */
export function nombrePublicoDelLote(o: {
  lotId: string;
  varieties: unknown;
  fichaVariedad: string | null | undefined;
  fichaProceso: string | null | undefined;
  departamento: string | null | undefined;
  pais: string | null | undefined;
  harvestTo?: string | null;
  harvestFrom?: string | null;
  creado?: string | null;
}): string {
  const cafe = [variedadesPublicas(o.varieties, o.fichaVariedad).join(" + "), procesoPublico(o.fichaProceso)].filter(Boolean).join(" ");
  const region = (o.departamento ?? "").trim() || (o.pais ?? "").trim() || "Colombia";
  const anio = anioDe(o.harvestTo) ?? anioDe(o.harvestFrom) ?? anioDe(o.creado);
  const nombre = [cafe, [region, anio].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
  return nombre || referenciaDe(o.lotId);
}
