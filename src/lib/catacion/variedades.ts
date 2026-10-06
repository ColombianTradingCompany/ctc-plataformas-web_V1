// ── Las variedades del lote, leídas en el Mapa de Variedades (V5.167, owner 2026-10-06) ──────────────────────────────────
// El productor escribe la variedad a mano en su Ficha («castillo», «Gesha», «Maragogipe», «Castillo (General)»…). Esto la
// empareja con la ficha de la herramienta (`variedadesDatos.ts`, generado de `public/tools/mapa-variedades/`) para que el
// dossier pueda decir de dónde viene, a qué grupo genético pertenece, a qué altura se da y qué notas suele dar en taza.
// Si no hay ficha para un nombre, se devuelve null: el dossier dice solo lo que el productor declaró. PURO.

import { VARIEDADES_DATOS, type FichaDeVariedad } from "./variedadesDatos";

export type { FichaDeVariedad };

const llano = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Los nombres con que se siembra o se escribe en Colombia una variedad que la herramienta tiene con otro nombre. */
const ALIAS: Record<string, string> = {
  gesha: "Geisha",
  geisha: "Geisha",
  maragogipe: "Maragogype",
  "castillo general": "Castillo",
  "variedad castillo": "Castillo",
  "variedad colombia": "Colombia",
  catuai: "Catuai",
  "bourbon rosado": "Pink Bourbon",
  "bourbon rojo": "Bourbon",
  "bourbon amarillo": "Bourbon",
  tipica: "Typica",
  "typica tradicional": "Typica",
  "cenicafe uno": "Cenicafe 1",
  "cenicafe 1": "Cenicafe 1",
  "castillo 2": "Castillo 2.0",
  ombligon: "Ombligon",
  "bourbon aji": "Bourbon Aji",
  "aji": "Bourbon Aji",
};

const POR_NOMBRE = new Map<string, FichaDeVariedad>();
for (const v of VARIEDADES_DATOS) {
  POR_NOMBRE.set(llano(v.id), v);
  POR_NOMBRE.set(llano(v.nombre), v);
}

/** La ficha de la variedad que el productor escribió, o null si la herramienta no la tiene. */
export function fichaDeVariedad(nombre: string | null | undefined): FichaDeVariedad | null {
  const k = llano(String(nombre ?? ""));
  if (!k) return null;
  const alias = ALIAS[k];
  if (alias) return VARIEDADES_DATOS.find((v) => v.id === alias) ?? null;
  return POR_NOMBRE.get(k) ?? null;
}

/** Las bandas de altitud de la herramienta, en metros. */
export const BANDAS_DE_ALTITUD: [number, number][] = [
  [0, 1000],
  [1000, 1400],
  [1400, 1800],
  [1800, 2000],
  [2000, 2600],
];

/** El rango de altitud recomendado (de la banda más baja a la más alta), o null. */
export function rangoDeAltitud(f: FichaDeVariedad): [number, number] | null {
  if (!f.altitud.length) return null;
  const min = Math.min(...f.altitud);
  const max = Math.max(...f.altitud);
  return [BANDAS_DE_ALTITUD[min][0], BANDAS_DE_ALTITUD[max][1]];
}

export const GRANO_LABEL: Record<"es" | "en", string[]> = {
  es: ["pequeño", "medio", "grande"],
  en: ["small", "medium", "large"],
};
