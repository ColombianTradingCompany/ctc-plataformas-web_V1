// ── La tríada de UN lote, derivada de su Ficha Técnica ──────────────────────────────────────────────────────────────
// V5.158 (owner, 2026-10-06): «debe salir la escala A B C para cada parámetro de la tríada en la que cae». La escala
// (`escala.ts`) define los tres niveles de cada atributo; aquí se lee la Ficha del lote y se dice en cuál cae y por qué:
//   · Variedad: la DOMINANTE del lote contra el catálogo semilla (`VARIEDADES_SEMILLA`); fuera del catálogo, C hasta que el
//     comité la clasifique (así lo manda `escala.ts`).
//   · Proceso: el de la variedad dominante — Lavado C; Honey · Natural · infusiones B; experimental · fermentaciones ·
//     co-fermentaciones A.
//   · Reconocimiento: cuántos premios/rankings declaró el productor en A3 — ninguno C; 1 a 3 B; 4 o más A.
// PURO: lo importan la pantalla del OCP y `qa-centro-calidad`. La escala sigue sin gobernar el grado (`escala.ts`, cabecera).

import { VARIEDADES_SEMILLA, type Nivel, type Triada } from "./escala";

export type RazonDeNivel = { nivel: Nivel; por: string };
export type TriadaDelLote = { triada: Triada; variedad: RazonDeNivel; proceso: RazonDeNivel; reconocimiento: RazonDeNivel };

export type FichaParaTriada = {
  varieties?: { name?: string | null; pct?: string | number | null; base?: string | null; special?: string | null }[] | null;
  base_processing?: string | null;
  special_processing?: string | null;
  awards?: string | null;
};

const llano = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Sinónimos que la Ficha usa y el catálogo semilla escribe de otra forma. */
const SINONIMOS: Record<string, string> = {
  gesha: "geisha",
  maragogipe: "maragogype",
  "bourbon rosado": "bourbon rosado",
  "pink bourbon": "bourbon rosado",
  "sl28": "sl28",
  "sl34": "sl28",
  "bourbon pointu": "laurina",
  "bourbon rojo": "bourbon",
  "bourbon amarillo": "bourbon",
  "castillo general": "castillo",
};

const num = (v: unknown): number => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** El nivel de una variedad por su nombre: A/B/C del catálogo semilla, o null si no está. */
export function nivelDeVariedad(nombre: string): Nivel | null {
  const n0 = llano(nombre);
  if (!n0) return null;
  const n = SINONIMOS[n0] ?? n0;
  const primera = n.split(" ")[0];
  for (const nivel of ["A", "B", "C"] as Nivel[]) {
    for (const v of VARIEDADES_SEMILLA[nivel]) {
      const c = llano(v);
      const cPrimera = c.split(" ")[0];
      if (c === n || c.includes(n) || n.includes(c) || (primera.length > 3 && cPrimera === primera)) return nivel;
    }
  }
  return null;
}

/** El nivel del proceso: por el texto del proceso especial y del base. */
export function nivelDeProceso(base: string | null | undefined, especial: string | null | undefined): RazonDeNivel {
  const e = llano(especial ?? "");
  const b = llano(base ?? "");
  const todo = `${b} ${e}`.trim();
  const rotulo = `${base ?? ""}${especial ? ` + ${especial}` : ""}`.trim();
  // Las palabras se buscan en el base Y en el especial: un productor escribe «Doble Fermentado» o «Lavado + fermentación» donde le cabe.
  if (/(ferment|experiment|anaerob|carbonic|maceracion|lactic|termic|yeast|levadura|koji)/.test(todo)) return { nivel: "A", por: `${rotulo}: experimental / fermentaciones` };
  if (/(infusi|inocul)/.test(todo)) return { nivel: "B", por: `${rotulo}: infusiones` };
  if (/(honey|natural|miel)/.test(todo)) return { nivel: "B", por: rotulo };
  if (/lavado|washed/.test(todo)) return { nivel: "C", por: rotulo };
  return { nivel: "C", por: rotulo || "sin proceso declarado (C)" };
}

/** Cuántos reconocimientos declaró el productor en A3: una línea o un ítem separado por «;» o «|» por premio («·» NO separa:
 *  «Cup of Excellence 2024 · Top 10» es UN premio, como lo escribe el ejemplo de la Ficha). */
export function cuentaReconocimientos(awards: string | null | undefined): number {
  return String(awards ?? "")
    .split(/\r?\n|;|\|/)
    .map((x) => x.trim())
    .filter(Boolean).length;
}

export function nivelDeReconocimiento(awards: string | null | undefined): RazonDeNivel {
  const n = cuentaReconocimientos(awards);
  if (n >= 4) return { nivel: "A", por: `${n} reconocimientos declarados` };
  if (n >= 1) return { nivel: "B", por: `${n} reconocimiento${n > 1 ? "s" : ""} declarado${n > 1 ? "s" : ""}` };
  return { nivel: "C", por: "ninguno declarado" };
}

export function triadaDeLaFicha(ds: FichaParaTriada | null | undefined): TriadaDelLote {
  const variedades = (ds?.varieties ?? []).filter((v) => String(v.name ?? "").trim());
  const dominante = variedades.length ? variedades.reduce((m, v) => (num(v.pct) > num(m.pct) ? v : m), variedades[0]) : null;
  let variedad: RazonDeNivel;
  if (!dominante) variedad = { nivel: "C", por: "sin variedad declarada (C)" };
  else {
    const nivel = nivelDeVariedad(String(dominante.name));
    variedad = nivel
      ? { nivel, por: `${String(dominante.name).trim()}${variedades.length > 1 ? " (dominante)" : ""} · catálogo semilla` }
      : { nivel: "C", por: `${String(dominante.name).trim()} no está en el catálogo semilla: C hasta que el comité la clasifique` };
  }
  const proceso = nivelDeProceso(dominante?.base || ds?.base_processing, dominante?.special || ds?.special_processing);
  const reconocimiento = nivelDeReconocimiento(ds?.awards);
  return { triada: { variedad: variedad.nivel, proceso: proceso.nivel, reconocimiento: reconocimiento.nivel }, variedad, proceso, reconocimiento };
}
