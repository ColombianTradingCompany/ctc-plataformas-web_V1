import { CRONS } from "@/lib/integraciones/registroCrons";
import type { Dominio } from "@/lib/integraciones/dominios";
import type { PanelConsoleKey } from "@/lib/panel/consoles";
import { PVC_SOLO_OWNER, armarTablero, tareasPorHub, type LecturasDelTablero, type Tablero } from "../tablero";
import { PIEZAS, PIEZAS_DE_ACCIONES, PIEZAS_DE_ESTAFETA, type PiezaId } from "../fuentes";
import { armarAcciones, type Acciones, type TareasDeNotion } from "../acciones";
import { armarEstafeta, type Carta, type Estafeta } from "../estafeta";

// ── CTCx OS · los datos de la demostración (V6.19, F2) · PURO, TODO INVENTADO ─
// Lo que pinta `/os/demo` (solo en local, con OS_DEMO=1) para las capturas de revisión de identidad.
// NADA de aquí es de la red: cifras redondas inventadas, nombres con «Ejemplo», ninguna referencia de
// lote real, ningún correo, ninguna finca, ningún precio. Los crons son los del registro del código
// (`CRONS`, públicos en el repo), con una salud inventada.
// El tablero se arma con la MISMA función que el de verdad (`armarTablero`), así que la demostración
// enseña exactamente las piezas, los «Sin datos» y las notas que enseñaría la OS; después, cada cifra
// se marca `demo: true` y `Cifra` le pone la etiqueta «EJEMPLO».
// Es el ÚNICO archivo del OS con cifras de negocio escritas (qa-os-check B1 lo exceptúa por nombre).

const LEIDO = "2026-11-05T15:30:00.000Z";
const todas: readonly PiezaId[] = PIEZAS;

/** Tareas inventadas: solo la clave y la casilla, como las de verdad (el texto nunca viaja). */
const TAREAS_EJEMPLO = [
  ...Array.from({ length: 4 }, (_, i) => ({ key: `lead:ejemplo-${i}`, state: "tbd" as const })),
  ...Array.from({ length: 3 }, (_, i) => ({ key: `finca:ejemplo-${i}`, state: "tbd" as const })),
  ...Array.from({ length: 2 }, (_, i) => ({ key: `lot:ejemplo-${i}`, state: "tbd" as const })),
  ...Array.from({ length: 2 }, (_, i) => ({ key: `muestra:ejemplo-${i}:2026-11-01`, state: "tbd" as const })),
  ...Array.from({ length: 2 }, (_, i) => ({ key: `despacho:vencido:ejemplo-${i}`, state: "tbd" as const })),
  { key: "partida:declarar:ejemplo", state: "done" as const },
];

const SALUD_EJEMPLO = ["ok", "ok", "atrasada", "ok", "fallo", "ok", "sin_corrida", "ok"] as const;

export const LECTURAS_DEMO: LecturasDelTablero = {
  leidoAt: LEIDO,
  tareas: { ok: true, valor: tareasPorHub(TAREAS_EJEMPLO), fuentes: todas },
  tratos: {
    ok: true,
    valor: {
      contratosPorEstado: { pending_signature: 2, active: 6, completed: 4 },
      ventanasVigentes: 3,
      despachos: { pendientes: 5, despachados: 2, vencidos: 2, kgPorRecibir: 2500 },
    },
    fuentes: todas,
  },
  stock: {
    ok: true,
    valor: {
      porRecibir: { despachosKg: 2500, despachos: 7, comprasKg: 700, compras: 1 },
      enStock: { pergaminoKg: 1200, verdeKg: 800, otrosKg: 50, partidas: 6 },
      porDeclarar: { stockKg: 900, stockPartidas: 3, contratosKgCps: 1000, contratos: 2, verdeKg: 1500 },
      enCatalogo: { kgVerde: 1250, declaraciones: 4, listados: 3 },
      vendido: { kgVerde: 400 },
    },
    fuentes: todas,
  },
  // Quien mira la demostración NO es el owner (IDENTIDAD_DEMO): el Modelo Económico no se lee y sus piezas dicen «Solo el owner»,
  // igual que en la OS de verdad para quien no es el owner (qa-os-check H12).
  pvc: PVC_SOLO_OWNER,
  salud: {
    ok: true,
    valor: {
      crons: CRONS.slice(0, SALUD_EJEMPLO.length).map((c, i) => ({ clave: c.clave, dominio: c.dominio as Dominio, salud: SALUD_EJEMPLO[i] })),
      automatizaciones: { direccion: { activa: 6 }, comercial: { activa: 3, piloto: 1 }, plataformas_it: { activa: 4, propuesta: 2 }, marca_contenido: { pausada: 1 } },
      cola: { comercial: { pendientes: 3, fallidos: 0 }, plataformas_it: { pendientes: 1, fallidos: 1 } },
    },
    fuentes: todas,
  },
  hechos: { ok: true, valor: { origen: 12, operacion_logistica: 8, comercial: 5, plataformas_it: 20 }, fuentes: todas },
  lotes: {
    ok: true,
    valor: { borrador: 5, ficha_completa: 4, videos_ok: 0, muestra_transito: 0, apto: 6, no_apto: 1, fila_arena: 2, evaluado: 3, galardonado: 0 },
    fuentes: todas,
  },
};

/** Marca cada cifra y cada rótulo como de demostración (`demo: true` → «EJEMPLO» en pantalla). */
function marcar<T>(x: T): T {
  if (Array.isArray(x)) return x.map(marcar) as T;
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    const copia = Object.fromEntries(Object.entries(o).map(([k, v]) => [k, marcar(v)]));
    return ("pieza" in o && ("valor" in o || "texto" in o) ? { ...copia, demo: true } : copia) as T;
  }
  return x;
}

export const TABLERO_DEMO: Tablero = marcar(armarTablero(LECTURAS_DEMO));

// ── F3 · Acciones y Estafeta, con Notion «leído» (todo inventado) ─────────────
// La OS de verdad no lee Notion todavía (decisión CON-28): allí sus cifras dicen «Sin datos». La demostración
// enseña cómo se verán CON la lectura, armadas por las MISMAS funciones (`armarAcciones`, `armarEstafeta`).

/** Tareas de Notion inventadas: solo conteos por hub (el lector de verdad nunca trae títulos). */
const TAREAS_DE_NOTION_EJEMPLO: TareasDeNotion = {
  porHub: {
    direccion: { abiertas: 2, vencidas: 0, esperando: 1 },
    comercial: { abiertas: 3, vencidas: 1, esperando: 1 },
    marca_contenido: { abiertas: 2, vencidas: 0, esperando: 0 },
    plataformas_it: { abiertas: 4, vencidas: 1, esperando: 0 },
    ejecucion: { abiertas: 5, vencidas: 2, esperando: 2 },
  },
  sinHub: 1,
};

export const ACCIONES_DEMO: Acciones = marcar(armarAcciones(TABLERO_DEMO, { ok: true, valor: TAREAS_DE_NOTION_EJEMPLO, fuentes: PIEZAS_DE_ACCIONES }));

/** Una carta inventada con todas sus llaves; `cambios` quita las que falten. */
const carta = (fecha: string, canal: Carta["canal"], direccion: Carta["direccion"], estado: Carta["estado"], hub: Carta["hub"], cambios: Partial<Carta> = {}): Carta => ({
  fecha,
  canal,
  direccion,
  estado,
  hub,
  conPersona: true,
  conResponsable: true,
  conMotivo: true,
  conEvento: false,
  conMensaje: false,
  esperandoDesde: null,
  ...cambios,
});

/** El Libro inventado: una carta por cada caso que la Estafeta distingue (te toca, esperando, revisar, enviado con y sin prueba, cerrado). */
const CARTAS_EJEMPLO: readonly Carta[] = [
  carta("2026-11-05T14:10:00.000Z", "gmail", "entra", "te_toca", "comercial"),
  carta("2026-11-04T09:20:00.000Z", "gmail", "entra", "te_toca", "comercial"),
  carta("2026-11-05T11:00:00.000Z", "instagram", "entra", "te_toca", "marca_contenido"),
  carta("2026-11-03T16:45:00.000Z", "gmail", "sale", "esperando_respuesta", "origen", { esperandoDesde: "2026-11-03T16:45:00.000Z" }),
  carta("2026-11-05T08:30:00.000Z", "gmail", "entra", "revisar", null, { conPersona: false }),
  carta("2026-11-05T10:05:00.000Z", "whatsapp", "entra", "te_toca", "origen", { conMotivo: false }),
  carta("2026-11-04T18:00:00.000Z", "gmail", "sale", "enviado", "comercial", { conEvento: true, conMensaje: true }),
  carta("2026-11-04T17:30:00.000Z", "correo_plataforma", "sale", "enviado", "comercial", { conEvento: true }),
  carta("2026-11-02T12:00:00.000Z", "gmail", "accion", "cerrado", "direccion"),
];

export const ESTAFETA_DEMO: Estafeta = marcar(armarEstafeta({ ok: true, valor: CARTAS_EJEMPLO, fuentes: PIEZAS_DE_ESTAFETA }, LEIDO));

/** Quien «mira» la demostración: tiene las cinco consolas y NO es el owner (así se ve que «Abrir» al Modelo Económico se esconde). */
export const IDENTIDAD_DEMO: { nombre: string; consolas: readonly PanelConsoleKey[]; isOwner: boolean } = {
  nombre: "Persona Ejemplo",
  consolas: ["bcp", "ecp", "ocp", "lcp", "os"],
  isOwner: false,
};
