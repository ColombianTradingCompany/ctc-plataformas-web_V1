// ── Herramientas Internas · Cotizador Courier · el cálculo ───────────────────────────────────────────
// Cuánto le cobra el transportista a CTCx por un envío courier de café (verde o tostado, < 100 kg).
// Brief: docs/componentes/briefs/herramientas-internas-cotizador-courier.md.
//
// ⚠️ ESTE MÓDULO NO LLEVA NI UNA CIFRA DEL ACUERDO. El acuerdo con FedEx es CONFIDENCIAL (cláusula 6)
// y el repo es público: los porcentajes, los mínimos y los escalones viven en las tablas `courier_*`
// y llegan aquí como parámetro. Tampoco las tarifas de lista: también son dato, con fuente y fecha.
//
// Puro: sin base, sin red, sin fecha del sistema. La pantalla y el guardián le pasan las tablas.
//
// La regla, tal como la escribe el acuerdo (sección «Apéndice · Colombia»):
//   tarifa de lista de la guía vigente EL DÍA DEL ENVÍO
//   − descuento por zona y banda de peso − descuento adquirido (gracia o escalón) − bonificación por automatización
//   → no menos que el cargo mínimo
//   + recargo de combustible (semanal, sobre la tarifa NETA) · los demás recargos a lista y sin descuento.

export type Embalaje = "envelope" | "pak" | "paquete" | "box10" | "box25" | "carga";
export type ModoTarifa = "total" | "por_kg" | "por_kg_extra";

export type TarifaBase = {
  servicio: string; embalaje: Embalaje; zona: string;
  pesoDesde: number; pesoHasta: number | null; modo: ModoTarifa;
  usd: number; vigenteDesde: string; fuente: string;
};
export type Zona = { paisIso: string; pais: string; zona: string; vigenteDesde: string; fuente: string };
export type Descuento = {
  servicio: string; embalaje: Embalaje; zona: string;
  pesoDesde: number; pesoHasta: number | null; pct: number; cargoMinimoUsd: number;
};
export type Escalon = { desde: number; hasta: number | null; pct: number };
export type Adquirido = { grupo: string; servicios: string[]; pctGracia: number; escalones: Escalon[] };
export type Bonificacion = { concepto: string; servicio: string; pct: number };
export type Acuerdo = {
  referencia: string; vigenteDesde: string; finGracia: string | null;
  modoSuma: "aditivo" | "compuesto"; fuente: string;
  descuentos: Descuento[]; adquirido: Adquirido[]; bonificaciones: Bonificacion[];
};
export type Recargo = {
  concepto: string; tipo: "pct" | "fijo"; valor: number;
  vigenteDesde: string; vigenteHasta: string | null; fuente: string; automatico?: boolean;
};
export type Tablas = { tarifas: TarifaBase[]; zonas: Zona[]; acuerdo: Acuerdo | null; recargos: Recargo[] };

export type Pieza = { kg: number; largoCm?: number | null; anchoCm?: number | null; altoCm?: number | null };
export type Entrada = {
  destino: string;            // clave de `zonas`: ISO, o «US-MIA» para Miami
  piezas: Pieza[];
  fechaEnvio: string;         // YYYY-MM-DD
  gastoAnualUsd?: number | null; // gasto bruto anualizado, para el escalón del descuento adquirido tras la gracia
  divisorDim?: number;        // la guía 2026 dice 5.000 (cm³ → kg)
};

export type Linea = { concepto: string; usd: number; detalle: string; fuente: string };
export type Opcion = {
  servicio: string; embalaje: Embalaje; etiqueta: string;
  disponible: boolean; motivo?: string;
  pesoCobradoKg: number;
  baseUsd: number; pctZona: number; pctAdquirido: number; pctBonificacion: number; pctTotal: number;
  netoUsd: number; minimoAplicado: boolean; combustiblePct: number | null; combustibleUsd: number; totalUsd: number;
  lineas: Linea[]; avisos: string[];
};
export type Cotizacion = {
  zona: string | null; pais: string | null;
  pesoRealKg: number; pesoDimKg: number; pesoFacturableKg: number;
  opciones: Opcion[]; avisos: string[];
};

/** Los servicios que cotiza la primera tanda (exportación). El orden es el de la guía, del más rápido al más barato. */
export const SERVICIOS: Record<string, string> = {
  IPE: "International Priority Express",
  IP: "International Priority",
  IE: "International Economy",
  IPF: "International Priority Freight",
  IEF: "International Economy Freight",
};
export const EMBALAJES: Record<Embalaje, string> = {
  envelope: "Sobre", pak: "FedEx Pak", paquete: "Tu embalaje", box10: "FedEx 10 kg Box", box25: "FedEx 25 kg Box", carga: "Carga (puerta a puerta)",
};

/** Límite por pieza de los servicios de paquete, según la guía. Por encima, Freight. */
export const MAX_KG_PIEZA_PAQUETE = 68;

const r2 = (n: number) => Math.round(n * 100) / 100;
const subeA = (n: number, paso: number) => Math.ceil(n / paso - 1e-9) * paso;

/** Peso volumétrico de una pieza: L×A×H / divisor, redondeado al entero siguiente (así lo escribe la guía). */
export function pesoDimensional(p: Pieza, divisor = 5000): number {
  if (!p.largoCm || !p.anchoCm || !p.altoCm) return 0;
  return Math.ceil((p.largoCm * p.anchoCm * p.altoCm) / divisor - 1e-9);
}

/** El peso que se cobra: por pieza el mayor entre real y volumétrico; el total sube a la media libra de la
 *  tabla (0,5 kg) hasta 20,5 kg y al kilo entero desde ahí, que es donde la guía pasa a «por kg». */
export function pesoFacturable(piezas: Pieza[], divisor = 5000) {
  const real = piezas.reduce((s, p) => s + (p.kg || 0), 0);
  const dim = piezas.reduce((s, p) => s + pesoDimensional(p, divisor), 0);
  const mayor = piezas.reduce((s, p) => s + Math.max(p.kg || 0, pesoDimensional(p, divisor)), 0);
  const fact = mayor <= 20.5 ? Math.max(0.5, subeA(mayor, 0.5)) : subeA(mayor, 1);
  return { real: r2(real), dim, facturable: r2(fact) };
}

/** La versión de un dato vigente en una fecha: la de `vigenteDesde` más reciente que no la pase. */
function vigentes<T extends { vigenteDesde: string }>(filas: T[], fecha: string): T[] {
  const fechas = [...new Set(filas.map((f) => f.vigenteDesde))].filter((d) => d <= fecha).sort();
  const ultima = fechas.at(-1);
  return ultima ? filas.filter((f) => f.vigenteDesde === ultima) : [];
}

export function zonaDe(zonas: Zona[], destino: string, fecha: string): Zona | null {
  const v = vigentes(zonas, fecha);
  return v.find((z) => z.paisIso === destino) ?? v.find((z) => z.paisIso === "ZZ") ?? null;
}

const enRango = (peso: number, desde: number, hasta: number | null) => peso >= desde - 1e-9 && (hasta === null || peso <= hasta + 1e-9);

/** La tarifa de lista para un peso ya redondeado. `null` si la guía no la tiene. */
export function tarifaBase(
  tarifas: TarifaBase[], servicio: string, embalaje: Embalaje, zona: string, peso: number, fecha: string,
): { usd: number; detalle: string; fuente: string; vigenteDesde: string } | null {
  const filas = vigentes(tarifas.filter((t) => t.servicio === servicio && t.embalaje === embalaje && t.zona === zona), fecha);
  if (!filas.length) return null;
  const fuente = filas[0].fuente, vigenteDesde = filas[0].vigenteDesde;
  if (embalaje === "box10" || embalaje === "box25") {
    const fija = filas.find((f) => f.modo === "total"), extra = filas.find((f) => f.modo === "por_kg_extra");
    if (!fija || fija.pesoHasta === null) return null;
    if (peso <= fija.pesoHasta) return { usd: fija.usd, detalle: `tarifa fija de la caja hasta ${fija.pesoHasta} kg`, fuente, vigenteDesde };
    if (!extra) return null;
    const kgExtra = Math.ceil(peso - fija.pesoHasta - 1e-9);
    return { usd: r2(fija.usd + kgExtra * extra.usd), detalle: `${fija.usd} + ${kgExtra} kg × ${extra.usd} por kg adicional`, fuente, vigenteDesde };
  }
  const fila = filas.find((f) => enRango(peso, f.pesoDesde, f.pesoHasta) && (f.modo === "por_kg" || Math.abs(f.pesoDesde - peso) < 1e-9));
  if (!fila) return null;
  if (fila.modo === "por_kg") return { usd: r2(fila.usd * peso), detalle: `${peso} kg × ${fila.usd} por kg`, fuente, vigenteDesde };
  return { usd: fila.usd, detalle: `tarifa de ${peso} kg`, fuente, vigenteDesde };
}

/** El descuento adquirido: el de gracia hasta `finGracia`; después, el escalón del gasto anualizado. */
export function descuentoAdquirido(acuerdo: Acuerdo, servicio: string, embalaje: Embalaje, fecha: string, gastoAnualUsd?: number | null) {
  const g = acuerdo.adquirido.find((a) => a.servicios.includes(`${servicio}:${embalaje}`));
  if (!g) return { pct: 0, detalle: "el acuerdo no incluye este servicio en ningún grupo de descuento adquirido" };
  if (acuerdo.finGracia && fecha <= acuerdo.finGracia) return { pct: g.pctGracia, detalle: `periodo de gracia (hasta ${acuerdo.finGracia}) · ${g.grupo}` };
  if (gastoAnualUsd == null) return { pct: 0, detalle: `terminó la gracia y no se indicó el gasto anualizado · ${g.grupo}`, falta: true as const };
  const e = g.escalones.find((s) => enRango(gastoAnualUsd, s.desde, s.hasta));
  return e ? { pct: e.pct, detalle: `escalón US$ ${e.desde}${e.hasta === null ? " +" : `–${e.hasta}`} de gasto anualizado · ${g.grupo}` }
    : { pct: 0, detalle: `el gasto anualizado no alcanza el primer escalón · ${g.grupo}` };
}

function combustible(recargos: Recargo[], fecha: string): Recargo | null {
  const c = recargos
    .filter((r) => r.concepto === "combustible" && r.tipo === "pct" && r.vigenteDesde <= fecha && (!r.vigenteHasta || fecha <= r.vigenteHasta))
    .sort((a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde));
  return c.at(-1) ?? null;
}

const pctTotal = (modo: Acuerdo["modoSuma"], ps: number[]) =>
  modo === "compuesto" ? r2(100 * (1 - ps.reduce((m, p) => m * (1 - p / 100), 1))) : r2(ps.reduce((s, p) => s + p, 0));

/** Una opción (servicio × embalaje) para un peso y una zona. */
export function cotizarOpcion(t: Tablas, e: Entrada, zona: string, peso: number, servicio: string, embalaje: Embalaje): Opcion {
  const etiqueta = `${SERVICIOS[servicio] ?? servicio} · ${EMBALAJES[embalaje]}`;
  const vacia: Opcion = {
    servicio, embalaje, etiqueta, disponible: false, pesoCobradoKg: peso,
    baseUsd: 0, pctZona: 0, pctAdquirido: 0, pctBonificacion: 0, pctTotal: 0,
    netoUsd: 0, minimoAplicado: false, combustiblePct: null, combustibleUsd: 0, totalUsd: 0, lineas: [], avisos: [],
  };
  const base = tarifaBase(t.tarifas, servicio, embalaje, zona, peso, e.fechaEnvio);
  if (!base) return { ...vacia, motivo: `la guía vigente no trae tarifa de ${etiqueta} para ${peso} kg en zona ${zona}` };

  const avisos: string[] = [];
  const lineas: Linea[] = [{ concepto: "Tarifa de lista", usd: base.usd, detalle: base.detalle, fuente: base.fuente }];
  let pz = 0, pa = 0, pb = 0, minimo = 0;
  const a = t.acuerdo && t.acuerdo.vigenteDesde <= e.fechaEnvio ? t.acuerdo : null;
  if (!a) avisos.push("Sin acuerdo vigente para la fecha del envío: se cotiza a precio de lista.");
  else {
    const d = a.descuentos.find((x) => x.servicio === servicio && x.embalaje === embalaje && x.zona === zona && enRango(peso, x.pesoDesde, x.pesoHasta));
    if (d) { pz = d.pct; minimo = d.cargoMinimoUsd; }
    else avisos.push(`El acuerdo no nombra ${EMBALAJES[embalaje]} de ${SERVICIOS[servicio] ?? servicio}: sin descuento por zona. Confírmalo con FedEx.`);
    const adq = descuentoAdquirido(a, servicio, embalaje, e.fechaEnvio, e.gastoAnualUsd);
    pa = adq.pct;
    if ("falta" in adq) avisos.push("Terminó el periodo de gracia: indica el gasto anualizado para aplicar el escalón del descuento adquirido.");
    pb = a.bonificaciones.filter((b) => b.servicio === servicio).reduce((s, b) => s + b.pct, 0);
    lineas.push({ concepto: "Descuento por zona", usd: 0, detalle: d ? `${pz} % · zona ${zona}, ${d.pesoHasta === null ? `desde ${d.pesoDesde} kg` : `${d.pesoDesde}–${d.pesoHasta} kg`}` : "0 %", fuente: a.fuente });
    lineas.push({ concepto: "Descuento adquirido", usd: 0, detalle: `${pa} % · ${adq.detalle}`, fuente: a.fuente });
    lineas.push({ concepto: "Bonificación por automatización", usd: 0, detalle: `${pb} %`, fuente: a.fuente });
  }
  const pt = a ? pctTotal(a.modoSuma, [pz, pa, pb]) : 0;
  const descuentoUsd = r2(base.usd * pt / 100);
  let neto = r2(base.usd - descuentoUsd);
  const minimoAplicado = neto < minimo;
  if (minimoAplicado) neto = minimo;
  if (a) {
    lineas.push({ concepto: `Descuento total (${a.modoSuma === "aditivo" ? "suma" : "compuesto"})`, usd: -descuentoUsd, detalle: `${pt} % de ${base.usd}`, fuente: a.fuente });
    if (minimoAplicado) lineas.push({ concepto: "Cargo mínimo", usd: r2(neto - (base.usd - descuentoUsd)), detalle: `el neto no baja de ${minimo}`, fuente: a.fuente });
  }
  lineas.push({ concepto: "Tarifa neta", usd: neto, detalle: "lista − descuento (o el mínimo)", fuente: "cálculo" });

  const c = combustible(t.recargos, e.fechaEnvio);
  const cUsd = c ? r2(neto * c.valor / 100) : 0;
  if (c) lineas.push({ concepto: "Recargo de combustible", usd: cUsd, detalle: `${c.valor} % sobre la neta · semana desde ${c.vigenteDesde}`, fuente: c.fuente });
  else avisos.push("Falta el recargo de combustible de la semana del envío: el total está INCOMPLETO. Anótalo arriba.");

  return {
    servicio, embalaje, etiqueta, disponible: true, pesoCobradoKg: peso,
    baseUsd: base.usd, pctZona: pz, pctAdquirido: pa, pctBonificacion: pb, pctTotal: pt,
    netoUsd: neto, minimoAplicado, combustiblePct: c?.valor ?? null, combustibleUsd: cUsd, totalUsd: r2(neto + cUsd),
    lineas, avisos,
  };
}

/** Todas las opciones que aplican a un envío, de la más barata a la más cara. */
export function cotizar(t: Tablas, e: Entrada): Cotizacion {
  const divisor = e.divisorDim ?? 5000;
  const piezas = e.piezas.filter((p) => p.kg > 0);
  const { real, dim, facturable } = pesoFacturable(piezas, divisor);
  const z = zonaDe(t.zonas, e.destino, e.fechaEnvio);
  const avisos: string[] = [];
  const out: Cotizacion = { zona: z?.zona ?? null, pais: z?.pais ?? null, pesoRealKg: real, pesoDimKg: dim, pesoFacturableKg: facturable, opciones: [], avisos };
  if (!piezas.length) { avisos.push("Añade al menos una pieza con su peso."); return out; }
  if (!z) { avisos.push("No hay cuadro de zonas vigente para ese destino."); return out; }
  if (z.paisIso !== e.destino) avisos.push(`El destino no está en el cuadro de zonas: se usa «${z.pais}» (zona ${z.zona}). Confírmalo con FedEx.`);
  if (facturable >= 100) avisos.push("El envío pasa de 100 kg: esta herramienta está pensada para envíos menores.");

  const pesada = piezas.some((p) => Math.max(p.kg, pesoDimensional(p, divisor)) > MAX_KG_PIEZA_PAQUETE);
  const una = piezas.length === 1;
  const combos: [string, Embalaje][] = [];
  if (pesada) combos.push(["IPF", "carga"], ["IEF", "carga"]);
  else {
    combos.push(["IPE", "paquete"], ["IP", "paquete"], ["IE", "paquete"]);
    if (una && facturable <= 2.5) combos.push(["IP", "pak"]);
    if (una && facturable <= 12) combos.push(["IP", "box10"]);
    if (una && facturable > 10 && facturable <= 30) combos.push(["IP", "box25"]);
  }
  if (pesada) avisos.push(`Una pieza pasa de ${MAX_KG_PIEZA_PAQUETE} kg: solo aplica carga (Freight), con peso mínimo de ${MAX_KG_PIEZA_PAQUETE} kg.`);
  const pesoCarga = Math.max(facturable, MAX_KG_PIEZA_PAQUETE);
  out.opciones = combos
    .map(([s, emb]) => cotizarOpcion(t, e, z.zona, emb === "carga" ? pesoCarga : facturable, s, emb))
    .sort((a, b) => Number(b.disponible) - Number(a.disponible) || a.totalUsd - b.totalUsd);
  return out;
}
