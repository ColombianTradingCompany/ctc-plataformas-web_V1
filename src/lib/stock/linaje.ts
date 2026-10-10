// ── Stock CTCx · el linaje de las partidas (V5.195) — PURO ─────────────────────────────────────────────────────────────────────
// El owner, 2026-10-09: el café que físicamente llega a CTCx «debe poder moverse de estado "Pergamino", "Verde", "Tostado" y
// "Empacado", de tal manera que pueda saber qué viene de dónde de manera visual […] las cantidades deben sumar al final lo mismo en
// equivalente del estado más primordial entre mermas de humedad, residuos y pérdidas». Plan `docs/PLAN_TRIAGE_CATALOGO.md` §2.1.
//
// Las reglas viven en la base (`docs/migraciones/2026-10-09_stock_ctcx.sql`: `stock_transformar`, `stock_disponible`, las
// compuertas); aquí están las MISMAS para la pantalla —validar antes de enviar, previsualizar el costo y la equivalencia de las
// hijas— y lo que solo la pantalla necesita: las familias, su cuadre y el acomodo del tablero de cuatro columnas. Sin red.

/** Dónde vive el Stock CTCx en el OCP (Manejo de Stock Físico). Los Sample Kits son su segunda pestaña: `${STOCK_PATH}/sample-kits`. */
export const STOCK_PATH = "/ocp/stock";

export type EstadoDePartida = "pergamino" | "verde" | "tostado" | "empacado";
export type ContenidoDePartida = Exclude<EstadoDePartida, "empacado">;
export type TipoDeTransformacion = "trilla" | "tostion" | "empaque";
export type TipoDeSalida = "kit" | "venta" | "consumo" | "ajuste";
export type OrigenDePartida = "despacho" | "compra" | "manual" | "transformacion";

export const ESTADOS: readonly EstadoDePartida[] = ["pergamino", "verde", "tostado", "empacado"];

/** Los colores del dibujo del owner: pergamino amarillo, verde verde, tostado granate, empacado azul. */
export const ESTADO_INFO: Record<EstadoDePartida, { nombre: string; color: string; suave: string }> = {
  pergamino: { nombre: "Pergamino", color: "#c99a06", suave: "#fbf3d0" },
  verde: { nombre: "Verde", color: "#2f7d32", suave: "#e3f2e1" },
  tostado: { nombre: "Tostado", color: "#7b1e2c", suave: "#f6e1e4" },
  empacado: { nombre: "Empacado", color: "#1f5fa8", suave: "#e1ecf8" },
};

export const TRANSFORMACIONES: Record<TipoDeTransformacion, { nombre: string; verbo: string; desde: readonly EstadoDePartida[]; hacia: EstadoDePartida }> = {
  trilla: { nombre: "Trilla", verbo: "Trillar", desde: ["pergamino"], hacia: "verde" },
  tostion: { nombre: "Tostión", verbo: "Tostar", desde: ["verde"], hacia: "tostado" },
  empaque: { nombre: "Empaque", verbo: "Empacar", desde: ["pergamino", "verde", "tostado"], hacia: "empacado" },
};

export const SALIDA_LABEL: Record<TipoDeSalida, string> = { kit: "Sample Kit", venta: "Venta", consumo: "Consumo interno", ajuste: "Ajuste de inventario" };
/** Las que se registran a mano: la de un kit la escribe sola el envío del kit. */
export const SALIDAS_A_MANO: readonly Exclude<TipoDeSalida, "kit">[] = ["venta", "consumo", "ajuste"];

export const ORIGEN_LABEL: Record<OrigenDePartida, string> = { despacho: "Despacho recibido", compra: "Compra", manual: "Ingreso a mano", transformacion: "Transformación" };

/** El cuadre tolera lo mismo que la base: ± 0,01 kg. */
export const TOLERANCIA_KG = 0.01;

export const transformacionesDesde = (estado: EstadoDePartida): TipoDeTransformacion[] =>
  (Object.keys(TRANSFORMACIONES) as TipoDeTransformacion[]).filter((t) => TRANSFORMACIONES[t].desde.includes(estado));

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

// ── Los datos, como llegan de la base ────────────────────────────────────────────────────────────────────────────────────────
export type Partida = {
  id: string;
  codigo: string;
  lotId: string | null;
  origenTexto: string | null;
  estado: EstadoDePartida;
  contenido: ContenidoDePartida;
  kg: number;
  costoCopKg: number;
  equivalencia: number;
  raizId: string;
  madreTransformacionId: string | null;
  origen: OrigenDePartida;
  despachoId: string | null;
  compraId: string | null;
  comprometido: boolean;
  ubicacion: string | null;
  presentacion: string | null;
  nota: string | null;
  createdAt: string;
  anulada: boolean;
  anuladaMotivo: string | null;
};

export type Transformacion = {
  id: string;
  codigo: string;
  tipo: TipoDeTransformacion;
  madreId: string;
  kgEntrada: number;
  humedadKg: number;
  residuosKg: number;
  perdidasKg: number;
  costoOperacionCop: number;
  fecha: string;
  nota: string | null;
  anulada: boolean;
  anuladaMotivo: string | null;
};

export type Salida = { id: string; partidaId: string; tipo: TipoDeSalida; kg: number; kitId: string | null; motivo: string; fecha: string; anulada: boolean };
/** Un ítem de un kit ARMADO (aún en casa): reserva kilos de su partida. */
export type ReservaDeKit = { partidaId: string; kg: number; kitId: string; kitCodigo: string };
/** Lo asignado a mezclas no anuladas, por compra (las mezclas siguen sobre `compras`, plan §6.12): reserva kilos de la raíz de esa compra. */
export type ReservaDeMezcla = { compraId: string; kg: number };
/** V5.203 (owner, 2026-10-10 · hueco H1): lo DECLARADO vivo en el Triage (`catalogo_fuentes.kg_origen`, en el estado de la partida)
 *  sigue en la bodega pero ya no está libre — la base lo resta en `stock_disponible` desde la V5.196 y la pantalla no lo restaba. */
export type ReservaDeCatalogo = { partidaId: string; kg: number; codigo: string; fuenteId: string };

export type StockCrudo = {
  partidas: Partida[];
  transformaciones: Transformacion[];
  salidas: Salida[];
  reservasKit: ReservaDeKit[];
  reservasMezcla: ReservaDeMezcla[];
  /** Opcional para que un escenario escrito antes de la V5.203 (sin declaraciones) siga valiendo. */
  reservasCatalogo?: ReservaDeCatalogo[];
};

// ── Lo derivado de una partida ───────────────────────────────────────────────────────────────────────────────────────────────
export type Movimientos = {
  /** kg que entraron a transformaciones vivas. */
  transformadoKg: number;
  /** kg de salidas vivas (kits enviados incluidos). */
  salidoKg: number;
  reservadoKitKg: number;
  reservadoMezclaKg: number;
  /** V5.203: lo declarado vivo en el Catálogo Activo (Triage) desde esta partida. */
  declaradoKg: number;
  /** Lo que sigue físicamente en esta partida: kg − transformado − salido (las reservas siguen en la bodega). */
  restoKg: number;
  /** Lo que se puede usar: resto − kits − mezclas − lo declarado. La misma cuenta que `stock_disponible` en la base (V5.196). */
  disponibleKg: number;
};

export function movimientosDe(p: Partida, s: StockCrudo): Movimientos {
  if (p.anulada) return { transformadoKg: 0, salidoKg: 0, reservadoKitKg: 0, reservadoMezclaKg: 0, declaradoKg: 0, restoKg: 0, disponibleKg: 0 };
  const transformadoKg = s.transformaciones.filter((t) => t.madreId === p.id && !t.anulada).reduce((a, t) => a + t.kgEntrada, 0);
  const salidoKg = s.salidas.filter((x) => x.partidaId === p.id && !x.anulada).reduce((a, x) => a + x.kg, 0);
  const reservadoKitKg = s.reservasKit.filter((x) => x.partidaId === p.id).reduce((a, x) => a + x.kg, 0);
  const reservadoMezclaKg = p.compraId ? s.reservasMezcla.filter((x) => x.compraId === p.compraId).reduce((a, x) => a + x.kg, 0) : 0;
  const declaradoKg = (s.reservasCatalogo ?? []).filter((x) => x.partidaId === p.id).reduce((a, x) => a + x.kg, 0);
  const restoKg = r3(p.kg - transformadoKg - salidoKg);
  return {
    transformadoKg: r3(transformadoKg),
    salidoKg: r3(salidoKg),
    reservadoKitKg: r3(reservadoKitKg),
    reservadoMezclaKg: r3(reservadoMezclaKg),
    declaradoKg: r3(declaradoKg),
    restoKg,
    disponibleKg: Math.max(0, r3(restoKg - reservadoKitKg - reservadoMezclaKg - declaradoKg)),
  };
}

/** V5.203: las declaraciones vivas (CF-…) de una partida, para decir «En el Catálogo Activo: N kg (CF-…)». */
export const declaracionesDe = (partidaId: string, s: Pick<StockCrudo, "reservasCatalogo">) => (s.reservasCatalogo ?? []).filter((x) => x.partidaId === partidaId);

/** Cuántos kg del estado de la raíz son estos kg de la partida (la humedad y los residuos van cargados; las pérdidas, no). */
export const equivalenteEnRaiz = (p: Pick<Partida, "equivalencia">, kg: number) => r3(kg * p.equivalencia);

// ── Una transformación: validar y previsualizar (lo mismo que `stock_transformar`) ──────────────────────────────────────────────
export type HijaSolicitada = { kg: number; ubicacion?: string | null; presentacion?: string | null; nota?: string | null };
export type SolicitudDeTransformacion = {
  tipo: TipoDeTransformacion;
  kgEntrada: number;
  hijas: HijaSolicitada[];
  humedadKg: number;
  residuosKg: number;
  perdidasKg: number;
  costoOperacionCop: number;
};

export const sumaDeSalida = (s: Pick<SolicitudDeTransformacion, "hijas" | "humedadKg" | "residuosKg" | "perdidasKg">) =>
  r3(s.hijas.reduce((a, h) => a + (Number(h.kg) || 0), 0) + (Number(s.humedadKg) || 0) + (Number(s.residuosKg) || 0) + (Number(s.perdidasKg) || 0));

/** Lo que falta (+) o sobra (−) para que la transformación cuadre. */
export const faltaPorCuadrar = (s: SolicitudDeTransformacion) => r3((Number(s.kgEntrada) || 0) - sumaDeSalida(s));

export function erroresDeTransformacion(madre: Pick<Partida, "estado" | "anulada">, disponibleKg: number, s: SolicitudDeTransformacion): string[] {
  const e: string[] = [];
  if (madre.anulada) e.push("La partida está anulada.");
  const t = TRANSFORMACIONES[s.tipo];
  if (!t) e.push("Elija la transformación.");
  else if (!t.desde.includes(madre.estado)) e.push(`${t.nombre} no se hace desde ${ESTADO_INFO[madre.estado].nombre.toLowerCase()}.`);
  if (!(s.kgEntrada > 0)) e.push("Escriba los kg que entran.");
  else if (s.kgEntrada > disponibleKg + 0.0005) e.push(`De esta partida quedan ${disponibleKg} kg disponibles.`);
  if (!s.hijas.length) e.push("Una transformación deja al menos una partida.");
  if (s.hijas.some((h) => !(Number(h.kg) > 0))) e.push("Cada partida que sale lleva sus kg.");
  if ([s.humedadKg, s.residuosKg, s.perdidasKg, s.costoOperacionCop].some((v) => Number(v) < 0)) e.push("Las mermas, los residuos, las pérdidas y el costo no son negativos.");
  const falta = faltaPorCuadrar(s);
  if (Math.abs(falta) > TOLERANCIA_KG) e.push(falta > 0 ? `No cuadra: faltan ${falta} kg por repartir.` : `No cuadra: salen ${-falta} kg más de los que entran.`);
  return e;
}

/** El costo por kg y la equivalencia que tendrán las hijas (la base redondea igual: 4 y 6 decimales). */
export function previaDeTransformacion(madre: Pick<Partida, "costoCopKg" | "equivalencia" | "contenido">, s: SolicitudDeTransformacion) {
  const salen = s.hijas.reduce((a, h) => a + (Number(h.kg) || 0), 0);
  if (!(salen > 0)) return null;
  const hacia = TRANSFORMACIONES[s.tipo]?.hacia ?? "verde";
  return {
    hacia,
    contenido: (hacia === "empacado" ? madre.contenido : hacia) as ContenidoDePartida,
    costoCopKg: r4((s.kgEntrada * madre.costoCopKg + (Number(s.costoOperacionCop) || 0)) / salen),
    equivalencia: r6((madre.equivalencia * (s.kgEntrada - (Number(s.perdidasKg) || 0))) / salen),
    rendimientoPct: s.kgEntrada > 0 ? Math.round((salen / s.kgEntrada) * 1000) / 10 : 0,
  };
}

/** Un punto de partida para el formulario (se corrige con lo pesado): trilla ≈ 80 % de verde y 20 % de cascarilla; tostión ≈ 85 %
 *  de tostado y 15 % de merma; empaque, todo. No gobierna nada: solo evita escribir desde cero. */
export function propuestaDeTransformacion(tipo: TipoDeTransformacion, kgEntrada: number): Pick<SolicitudDeTransformacion, "hijas" | "humedadKg" | "residuosKg" | "perdidasKg"> {
  const kg = Math.max(0, kgEntrada);
  if (tipo === "trilla") {
    const verde = r3(kg * 0.8);
    return { hijas: [{ kg: verde }], humedadKg: 0, residuosKg: r3(kg - verde), perdidasKg: 0 };
  }
  if (tipo === "tostion") {
    const tostado = r3(kg * 0.85);
    return { hijas: [{ kg: tostado }], humedadKg: r3(kg - tostado), residuosKg: 0, perdidasKg: 0 };
  }
  return { hijas: [{ kg: r3(kg) }], humedadKg: 0, residuosKg: 0, perdidasKg: 0 };
}

// ── Las familias: una raíz y todo lo que salió de ella ───────────────────────────────────────────────────────────────────────
export type Arista = { transformacion: Transformacion; madreId: string; hijaId: string };
export type Celda = { partidaId: string; columna: number; filaDesde: number; filaHasta: number };

export type Cuadre = {
  raizKg: number;
  /** Lo que sigue en la bodega, por estado (reservado incluido). */
  enEstado: Record<EstadoDePartida, number>;
  salidas: Record<TipoDeSalida, number>;
  humedadKg: number;
  residuosKg: number;
  perdidasKg: number;
  /** La suma de todas las cubetas: tiene que dar los kg de la raíz. */
  sumaKg: number;
  /** Lo mismo en kg del estado de la raíz: lo que sigue y lo que salió a su equivalencia; las pérdidas a la de su madre. */
  equivalenteKg: number;
  cuadra: boolean;
};

export type Familia = {
  raiz: Partida;
  /** Las partidas vivas de la familia (las anuladas no se dibujan). */
  partidas: Partida[];
  aristas: Arista[];
  celdas: Celda[];
  filas: number;
  cuadre: Cuadre;
  /** kg disponibles de toda la familia, por estado. */
  disponiblePorEstado: Record<EstadoDePartida, number>;
  agotada: boolean;
};

const ceroPorEstado = (): Record<EstadoDePartida, number> => ({ pergamino: 0, verde: 0, tostado: 0, empacado: 0 });

export function cuadreDeFamilia(raiz: Partida, partidas: Partida[], s: StockCrudo): Cuadre {
  const vivas = partidas.filter((p) => !p.anulada);
  const ids = new Set(vivas.map((p) => p.id));
  const porId = new Map(vivas.map((p) => [p.id, p]));
  const enEstado = ceroPorEstado();
  const salidas: Record<TipoDeSalida, number> = { kit: 0, venta: 0, consumo: 0, ajuste: 0 };
  let equivalenteKg = 0;
  for (const p of vivas) {
    const m = movimientosDe(p, s);
    enEstado[p.estado] = r3(enEstado[p.estado] + m.restoKg);
    equivalenteKg += m.restoKg * p.equivalencia;
  }
  for (const x of s.salidas) {
    if (x.anulada || !ids.has(x.partidaId)) continue;
    salidas[x.tipo] = r3(salidas[x.tipo] + x.kg);
    equivalenteKg += x.kg * (porId.get(x.partidaId)?.equivalencia ?? 1);
  }
  let humedadKg = 0, residuosKg = 0, perdidasKg = 0;
  for (const t of s.transformaciones) {
    if (t.anulada || !ids.has(t.madreId)) continue;
    humedadKg += t.humedadKg;
    residuosKg += t.residuosKg;
    perdidasKg += t.perdidasKg;
    equivalenteKg += t.perdidasKg * (porId.get(t.madreId)?.equivalencia ?? 1);
  }
  const sumaKg = r3(ESTADOS.reduce((a, e) => a + enEstado[e], 0) + Object.values(salidas).reduce((a, v) => a + v, 0) + humedadKg + residuosKg + perdidasKg);
  const raizKg = raiz.anulada ? 0 : raiz.kg;
  return {
    raizKg,
    enEstado,
    salidas,
    humedadKg: r3(humedadKg),
    residuosKg: r3(residuosKg),
    perdidasKg: r3(perdidasKg),
    sumaKg,
    equivalenteKg: r3(equivalenteKg),
    cuadra: Math.abs(sumaKg - raizKg) <= TOLERANCIA_KG && Math.abs(r3(equivalenteKg) - raizKg) <= TOLERANCIA_KG * 10,
  };
}

/**
 * El acomodo del tablero: cuatro columnas fijas (los estados) y una fila por cada partida sin hijas vivas, en el orden de un
 * recorrido en profundidad; una madre ocupa las filas de sus descendientes y se centra en ellas. Como toda hija vive en una
 * columna POSTERIOR a la de su madre (no hay transformación hacia atrás), dos partidas de una misma columna nunca se pisan.
 */
export function acomodoDeFamilia(raiz: Partida, partidas: Partida[], transformaciones: Transformacion[]): { celdas: Celda[]; filas: number; aristas: Arista[] } {
  const vivas = new Map(partidas.filter((p) => !p.anulada).map((p) => [p.id, p]));
  const txViva = new Map(transformaciones.filter((t) => !t.anulada).map((t) => [t.id, t]));
  const hijasDe = new Map<string, Partida[]>();
  const aristas: Arista[] = [];
  for (const p of vivas.values()) {
    if (!p.madreTransformacionId) continue;
    const t = txViva.get(p.madreTransformacionId);
    if (!t || !vivas.has(t.madreId)) continue;
    hijasDe.set(t.madreId, [...(hijasDe.get(t.madreId) ?? []), p]);
    aristas.push({ transformacion: t, madreId: t.madreId, hijaId: p.id });
  }
  for (const lista of hijasDe.values()) lista.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.codigo.localeCompare(b.codigo));
  const celdas: Celda[] = [];
  let fila = 0;
  const visitar = (p: Partida): [number, number] => {
    const hijas = hijasDe.get(p.id) ?? [];
    let desde: number, hasta: number;
    if (!hijas.length) {
      desde = fila;
      hasta = fila;
      fila += 1;
    } else {
      const rangos = hijas.map(visitar);
      desde = rangos[0][0];
      hasta = rangos[rangos.length - 1][1];
    }
    celdas.push({ partidaId: p.id, columna: ESTADOS.indexOf(p.estado), filaDesde: desde, filaHasta: hasta });
    return [desde, hasta];
  };
  if (vivas.has(raiz.id)) visitar(raiz);
  return { celdas, filas: Math.max(1, fila), aristas };
}

/** Los ids de lo que está en el camino de una partida: de dónde viene (madres) y a dónde fue (descendientes). */
export function caminoDe(partidaId: string, aristas: Arista[]): Set<string> {
  const out = new Set<string>([partidaId]);
  const subir = (id: string) => {
    for (const a of aristas) if (a.hijaId === id && !out.has(a.madreId)) { out.add(a.madreId); subir(a.madreId); }
  };
  const bajar = (id: string) => {
    for (const a of aristas) if (a.madreId === id && !out.has(a.hijaId)) { out.add(a.hijaId); bajar(a.hijaId); }
  };
  subir(partidaId);
  bajar(partidaId);
  return out;
}

export function familias(s: StockCrudo): Familia[] {
  const porRaiz = new Map<string, Partida[]>();
  for (const p of s.partidas) porRaiz.set(p.raizId, [...(porRaiz.get(p.raizId) ?? []), p]);
  const out: Familia[] = [];
  for (const [raizId, lista] of porRaiz) {
    const raiz = lista.find((p) => p.id === raizId);
    if (!raiz || raiz.anulada) continue;
    const vivas = lista.filter((p) => !p.anulada);
    const { celdas, filas, aristas } = acomodoDeFamilia(raiz, vivas, s.transformaciones);
    const disponiblePorEstado = ceroPorEstado();
    for (const p of vivas) disponiblePorEstado[p.estado] = r3(disponiblePorEstado[p.estado] + movimientosDe(p, s).disponibleKg);
    const cuadre = cuadreDeFamilia(raiz, vivas, s);
    out.push({ raiz, partidas: vivas, aristas, celdas, filas, cuadre, disponiblePorEstado, agotada: ESTADOS.every((e) => cuadre.enEstado[e] <= 0.0005) });
  }
  return out.sort((a, b) => Number(a.agotada) - Number(b.agotada) || b.raiz.createdAt.localeCompare(a.raiz.createdAt));
}

/** Lo que una partida puede surtir a un kit: verde (o empacado de verde) para CP y Plus; pergamino (o empacado de pergamino) para Max.
 *  Lo comprometido (vendido a nombre del productor) y lo que no tiene lote, no. Lo mismo que `guard_sample_kit_stock`. */
export function surteKit(p: Pick<Partida, "contenido" | "comprometido" | "lotId" | "anulada">, contenidoDelKit: "verde" | "pergamino"): boolean {
  return !p.anulada && !p.comprometido && !!p.lotId && p.contenido === contenidoDelKit;
}

export const fmtKg = (n: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(n);
export const fmtCop = (n: number) => `$ ${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
