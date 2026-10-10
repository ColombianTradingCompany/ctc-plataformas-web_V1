// ── La franja del circuito del stock (V5.203, owner 2026-10-10) — PURO ───────────────────────────────────────────────────────────
// El owner, 2026-10-10, sobre Compras, el Triage y la Oferta de CTCx Selection: que se lean como UN circuito. Cinco tableros
// (Adquisición, Stock CTCx, Triage, CTCx Selection, Catálogo Activo) llevan arriba la misma franja con los mismos números:
//   Por recibir → En stock → Por declarar → En el Catálogo Activo → Vendido
// con el paso de la pantalla resaltado y el que tiene trabajo pendiente marcado. La carga vive en `circuito.ts` (servidor); aquí, sin
// red, cómo se dicen los números. `qa-stock-ctcx-check` lo ejercita.
// V5.203 · corrección (nodo final, 2026-10-10 · H5): «Por declarar» decía «15 kg» sumando pergamino y verde tal cual (y aparte los kg de
// CPS de los tratos), mientras el Triage, debajo, daba «≈ N kg de verde». Ahora la franja da lo MISMO que el Triage: kg de verde
// equivalentes, con la misma cuenta (`porDeclararEnVerde`: lo libre × la conversión del FR que rige, 1 para lo verde; los tratos por
// ventana con lo que aún pueden ofrecer × su conversión) y el mismo redondeo.

import { STOCK_PATH, fmtKg } from "./linaje";

export type PantallaDelCircuito = "compras" | "stock" | "triage" | "selection" | "catalogo";
export type ClaveDelPaso = "por_recibir" | "en_stock" | "por_declarar" | "en_catalogo" | "vendido";

export type DatosDeLaFranja = {
  /** Sacos y adelantos pendientes de los tratos por ventana (kg de CPS) + compras registradas que no han entrado al stock. */
  porRecibir: { despachosKg: number; despachos: number; comprasKg: number; compras: number };
  /** Lo disponible del Stock CTCx (ya descontado lo declarado, lo reservado y lo que salió), por contenido. */
  enStock: { pergaminoKg: number; verdeKg: number; otrosKg: number; partidas: number };
  /** Lo que el Triage aún puede declarar: partidas libres (pergamino o verde, con lote, no Tyrian) y tratos por ventana (kg de CPS), y
   *  TODO junto en kg de verde equivalentes (`verdeKg`, la cifra del Triage). */
  porDeclarar: { stockKg: number; stockPartidas: number; contratosKgCps: number; contratos: number; verdeKg: number };
  enCatalogo: { kgVerde: number; declaraciones: number; listados: number };
  /** null si no hay listados (no hay nada que decir de lo vendido). */
  vendido: { kgVerde: number } | null;
};

export type PasoDeLaFranja = { clave: ClaveDelPaso; titulo: string; valor: string; sub: string; href: string; pendiente: boolean; actual: boolean };

/** Qué paso resalta cada pantalla. */
export const PASO_DE_LA_PANTALLA: Record<PantallaDelCircuito, ClaveDelPaso> = {
  compras: "por_recibir",
  stock: "en_stock",
  triage: "por_declarar",
  selection: "por_declarar",
  catalogo: "en_catalogo",
};

export const ADQUISICION_PATH = "/ocp/compras";

/** H5: lo por declarar en kg de VERDE equivalentes — la cuenta del indicador «Por declarar» del Triage (`TriageBoard`) y de la franja.
 *  Cada entrada: sus kg de origen (lo libre de una partida, lo que un trato aún puede ofrecer) × su conversión (1 si ya es verde). */
export function porDeclararEnVerde(entradas: readonly { kg: number; conversion: number }[]): number {
  return Math.round(entradas.reduce((a, e) => a + (Number(e.kg) || 0) * (Number(e.conversion) || 0), 0));
}

const kg = (n: number) => `${fmtKg(Math.round(n * 10) / 10)} kg`;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function pasosDeLaFranja(d: DatosDeLaFranja, pantalla: PantallaDelCircuito): PasoDeLaFranja[] {
  const actual = PASO_DE_LA_PANTALLA[pantalla];
  const recibir = d.porRecibir.despachosKg + d.porRecibir.comprasKg;
  const enStock = d.enStock.pergaminoKg + d.enStock.verdeKg + d.enStock.otrosKg;
  const pasos: Omit<PasoDeLaFranja, "actual">[] = [
    {
      clave: "por_recibir",
      titulo: "Por recibir",
      valor: kg(recibir),
      sub: [d.porRecibir.despachos ? plural(d.porRecibir.despachos, "saco de trato", "sacos de trato") : null, d.porRecibir.compras ? plural(d.porRecibir.compras, "compra sin entrar", "compras sin entrar") : null].filter(Boolean).join(" · ") || "nada pendiente",
      href: `${ADQUISICION_PATH}?vista=por-recibir`,
      pendiente: recibir > 0,
    },
    {
      clave: "en_stock",
      titulo: "En stock",
      valor: kg(enStock),
      sub: enStock > 0 ? [d.enStock.pergaminoKg > 0 ? `${kg(d.enStock.pergaminoKg)} pergamino` : null, d.enStock.verdeKg > 0 ? `${kg(d.enStock.verdeKg)} verde` : null, d.enStock.otrosKg > 0 ? `${kg(d.enStock.otrosKg)} tostado o empacado` : null].filter(Boolean).join(" · ") : "libre en la bodega",
      href: STOCK_PATH,
      pendiente: false,
    },
    {
      clave: "por_declarar",
      titulo: "Por declarar",
      // H5: la misma cifra que el Triage («≈ N kg de verde, en contratos y stock»), ya redondeada por `porDeclararEnVerde`.
      valor: `≈ ${fmtKg(d.porDeclarar.verdeKg)} kg verde`,
      sub: [d.porDeclarar.stockPartidas ? plural(d.porDeclarar.stockPartidas, "partida", "partidas") : "sin partidas libres", d.porDeclarar.contratos ? plural(d.porDeclarar.contratos, "trato por ventana", "tratos por ventana") : null].filter(Boolean).join(" · "),
      href: "/ocp/contratos",
      pendiente: d.porDeclarar.stockKg > 0 || d.porDeclarar.contratosKgCps > 0,
    },
    {
      clave: "en_catalogo",
      titulo: "En el Catálogo Activo",
      valor: `${kg(d.enCatalogo.kgVerde)} verde`,
      sub: `${plural(d.enCatalogo.declaraciones, "declaración", "declaraciones")} · ${plural(d.enCatalogo.listados, "listado", "listados")}`,
      href: "/ocp/catalogo",
      pendiente: false,
    },
  ];
  if (d.vendido) pasos.push({ clave: "vendido", titulo: "Vendido", valor: `${kg(d.vendido.kgVerde)} verde`, sub: "en Cherry Picked", href: "/ocp/catalogo", pendiente: false });
  return pasos.map((p) => ({ ...p, actual: p.clave === actual }));
}
