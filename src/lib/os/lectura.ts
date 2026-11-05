import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarTareas } from "@/lib/panel/tareasCarga";
import { cargarCircuitoDelStock, pendientesDelCircuito } from "@/lib/stock/circuito";
import { edicionProxima, edicionVigente, hoyEnColombia } from "@/lib/pvc/servicio";
import { estadoDelAgente } from "@/lib/pvc/agente";
import { CRONS } from "@/lib/integraciones/registroCrons";
import { ESTADO_DE_CONTRATO, ETAPA_DEL_LOTE } from "@/lib/ocp/etapas";
import type { DatosDeLaFranja } from "@/lib/stock/franja";
import type { Dominio } from "@/lib/integraciones/dominios";
import { leerHechos } from "./hechos";
import { resumirTurno } from "./hechosCatalogo";
import type { CodigoDeLectura, Lectura, PiezaId } from "./fuentes";
import {
  automatizacionesPorHub,
  colaPorHub,
  saludDeLosCrons,
  tareasPorHub,
  type ConteoDeTareas,
  type EstadoDelPvc,
  type FilaDeAutomatizacion,
  type SaludDelSistema,
  type Tratos,
  type UltimoLatidoFinal,
} from "./tablero";

// ── CTCx OS · los lectores (V6.19, F2) · SOLO SERVIDOR, SOLO LECTURA ─────────
// Cada lector trae UNA parte del tablero y devuelve `Lectura<T>`: o su valor, o el código
// de lo que falló y las piezas que se quedan en «Sin datos». Nunca lanza, nunca escribe.
//
// Lo que se cumple aquí (PLAN §2; crítica de F2):
//   · Se REUSAN las funciones de la plataforma (las tareas, la franja del stock, el PVC, los
//     hechos) en vez de reescribir sus reglas. Cuando una de ellas convierte una lectura
//     fallida en cero, la pieza lo dice (`cuentaCeroSiFalla` en FUENTES).
//   · Los vencidos son los de `pendientesDelCircuito().sacosVencidos` (crítica 6): llegan
//     contados desde las tareas (cada uno es una tarea `despacho:vencido:<id>`), así que no se
//     carga el stock una vez más. Solo si las tareas fallan se pregunta a la función directamente.
//   · Las cuentas no se cortan en silencio en las 1000 filas de la API (crítica 9): se cuentan
//     con `count: "exact", head: true`, o se traen filas con `count: "exact"` y, si el total
//     pasa de lo que llegó, la lectura sale con `truncado`.
//   · Los selects de aquí no piden nombres, correos, teléfonos, notas, errores, destinos ni
//     payloads. Las funciones reusadas leen más de lo que el OS enseña —las tareas leen nombres;
//     el estado del agente del PVC lee su `pvc_cop`, sus insumos y sus salidas (crítica 8)—:
//     el OS lo LEE en el servidor y NUNCA lo pinta: de aquí solo salen conteos y códigos.
//   · No llama a las Server Actions de `integraciones/actions.ts`: su compuerta del ECP dejaría
//     sin datos a quien tiene la OS y no el ECP. Copia su consulta de latidos, sin compuerta.

/** Lo que la API entrega como mucho en una lectura (el `max-rows` por defecto del proyecto). */
const TOPE_DE_FILAS = 1000;

/** Las piezas que deja en «Sin datos» cada lector cuando falla (salen en el aviso). */
export const PIEZAS_DEL_LECTOR = {
  tareas: ["tareas_abiertas", "tareas_vencidas"],
  tratos: ["contratos_por_estado", "ventanas_vigentes", "despachos_pendientes", "despachos_despachados", "despachos_vencidos", "despachos_kg_por_recibir"],
  stock: ["franja_por_recibir", "franja_en_stock", "franja_por_declarar", "franja_en_catalogo", "franja_vendido"],
  pvc: ["pvc_vigente", "pvc_proxima", "pvc_correcciones", "pvc_borrador"],
  salud: ["salud_crons", "cola_pendientes", "cola_fallidos", "automatizaciones_por_etapa"],
  hechos: ["hechos_por_hub"],
  lotes: ["lotes_por_etapa"],
} as const satisfies Record<string, readonly PiezaId[]>;

const bien = <T>(valor: T, fuentes: readonly PiezaId[], truncado = false): Lectura<T> =>
  truncado ? { ok: true, valor, fuentes, truncado: true } : { ok: true, valor, fuentes };
const mal = <T>(error: CodigoDeLectura, fuentes: readonly PiezaId[]): Lectura<T> => ({ ok: false, error, fuentes });

/** Un conteo `head` de PostgREST: el número, o null si la lectura falló. */
type Conteo = PromiseLike<{ count: number | null; error: unknown }>;
async function contar(q: Conteo): Promise<number | null> {
  const { count, error } = await q;
  return error || count === null ? null : count;
}

// ── Las tareas de la casa ────────────────────────────────────────────────────

/**
 * Las tareas del Tablero de Ejecución (`cargarTareas`), reducidas a CONTEOS por hub en el servidor: de cada
 * tarea solo se mira su clave y su casilla (ni su texto, ni su enlace por registro: crítica 13). Devuelve
 * además cuántas son `despacho:vencido:*` (marcadas o no): son exactamente `pendientesDelCircuito().sacosVencidos`.
 */
export async function leerTareasDeLaCasa(service: SupabaseClient): Promise<Lectura<{ conteo: ConteoDeTareas; sacosVencidos: number }>> {
  const fuentes = PIEZAS_DEL_LECTOR.tareas;
  try {
    const { tareas } = await cargarTareas(service);
    const claves = tareas.map((t) => ({ key: t.key, state: t.state }));
    const sacosVencidos = claves.filter((t) => t.key.startsWith("despacho:vencido:")).length;
    return bien({ conteo: tareasPorHub(claves), sacosVencidos }, fuentes);
  } catch {
    return mal("lectura_tareas", fuentes);
  }
}

// ── Los tratos: contratos y despachos ────────────────────────────────────────

/**
 * Contratos por estado (un conteo exacto por estado de `ESTADO_DE_CONTRATO`, y «otro» si la base tiene uno que la
 * etiqueta no conoce), ventanas vigentes, y los despachos de los contratos activos con la MISMA lectura que
 * Adquisición (`cargarAdquisicion`: pendiente o despachado, contrato activo, todos los tipos).
 * `sacosVencidos` llega de las tareas; sin él, se pregunta a `pendientesDelCircuito` (que cuenta cero si falla).
 */
export async function leerTratos(service: SupabaseClient, op: { sacosVencidos?: number } = {}): Promise<Lectura<Tratos>> {
  const fuentes = PIEZAS_DEL_LECTOR.tratos;
  try {
    const estados = Object.keys(ESTADO_DE_CONTRATO);
    const [porEstado, total, ventanas, despachosR, vencidos] = await Promise.all([
      Promise.all(estados.map((e) => contar(service.from("purchase_contracts").select("id", { count: "exact", head: true }).eq("status", e)))),
      contar(service.from("purchase_contracts").select("id", { count: "exact", head: true })),
      contar(service.from("purchase_contracts").select("id", { count: "exact", head: true }).eq("status", "active").not("ventana_tipo", "is", null)),
      service
        .from("contract_despachos")
        .select("kg, estado, purchase_contracts!inner(status)", { count: "exact" })
        .in("estado", ["pendiente", "despachado"])
        .eq("purchase_contracts.status", "active"),
      op.sacosVencidos !== undefined
        ? Promise.resolve(op.sacosVencidos)
        : pendientesDelCircuito(service, hoyEnColombia()).then((p) => p.sacosVencidos.length),
    ]);
    if (total === null || ventanas === null || porEstado.some((n) => n === null) || despachosR.error) return mal("lectura_tratos", fuentes);

    const contratosPorEstado: Partial<Record<string, number>> = {};
    estados.forEach((e, i) => {
      if (porEstado[i]) contratosPorEstado[e] = porEstado[i] as number;
    });
    const conocidos = porEstado.reduce<number>((a, n) => a + (n ?? 0), 0);
    if (total > conocidos) contratosPorEstado.otro = total - conocidos;

    const filas = (despachosR.data as { kg: number | string | null; estado: string }[] | null) ?? [];
    const truncado = (despachosR.count ?? 0) > filas.length;
    const despachos = {
      pendientes: filas.filter((d) => d.estado === "pendiente").length,
      despachados: filas.filter((d) => d.estado === "despachado").length,
      vencidos,
      kgPorRecibir: Math.round(filas.reduce((a, d) => a + Number(d.kg ?? 0), 0) * 10) / 10,
    };
    return bien({ contratosPorEstado, ventanasVigentes: ventanas, despachos }, fuentes, truncado);
  } catch {
    return mal("lectura_tratos", fuentes);
  }
}

// ── La franja del circuito del stock ─────────────────────────────────────────

/**
 * La franja tal cual la calculan Adquisición, Stock y el Triage (`cargarCircuitoDelStock`; cuenta cero si una de sus
 * lecturas falla: lo dice la pieza). `cargarStock` pide 5000 filas, pero la API entrega como mucho TOPE_DE_FILAS:
 * si las partidas pasan de ahí, la franja sale con `truncado` (sus cifras son un mínimo), nunca cortada en silencio.
 */
export async function leerStockDelCircuito(service: SupabaseClient): Promise<Lectura<DatosDeLaFranja>> {
  const fuentes = PIEZAS_DEL_LECTOR.stock;
  try {
    const [franja, partidas] = await Promise.all([
      cargarCircuitoDelStock(service),
      contar(service.from("stock_partidas").select("id", { count: "exact", head: true })),
    ]);
    return bien(franja, fuentes, partidas === null || partidas > TOPE_DE_FILAS);
  } catch {
    return mal("lectura_stock", fuentes);
  }
}

// ── El Modelo Económico ──────────────────────────────────────────────────────

/**
 * El código de la edición vigente y de la próxima, las correcciones propuestas y si hay un borrador del agente por
 * publicar (la MISMA condición que la tarea del Tablero, `tareasCarga.ts`). Las funciones reusadas leen el PVC, los
 * insumos y las salidas de la edición: el OS los lee y NUNCA los pinta (crítica 8) —de aquí solo salen códigos y
 * conteos— y nunca calcula un precio. `edicionVigente`/`edicionProxima` devuelven null también si su lectura falla:
 * la pieza lo dice (`nuloSiFalla`).
 */
export async function leerPvc(service: SupabaseClient): Promise<Lectura<EstadoDelPvc>> {
  const fuentes = PIEZAS_DEL_LECTOR.pvc;
  try {
    const [vigente, proxima, correcciones, agente] = await Promise.all([
      edicionVigente(),
      edicionProxima(),
      contar(service.from("pvc_correcciones").select("id", { count: "exact", head: true }).eq("estado", "propuesta")),
      estadoDelAgente(service),
    ]);
    if (correcciones === null) return mal("lectura_pvc", fuentes);
    return bien(
      {
        vigente: vigente ? { codigo: vigente.code } : null,
        proxima: proxima ? { codigo: proxima.code } : null,
        correccionesPropuestas: correcciones,
        borradorPorPublicar: agente.ok && !!agente.borrador && !agente.publicada,
      },
      fuentes
    );
  } catch {
    return mal("lectura_pvc", fuentes);
  }
}

// ── La salud del sistema ─────────────────────────────────────────────────────

/**
 * La salud de los crons (la regla del tablero de Automatizaciones, `saludDeLosCrons`), las automatizaciones por hub y
 * etapa (el registro TAL CUAL, sin conciliar con Make: la vista lo dice, crítica 25) y la cola de la espina por hub.
 * Nunca lee `proposito`, `notas`, `ultimo_error`, `destino` ni `payload`.
 */
export async function leerSalud(service: SupabaseClient, ahora: Date = new Date()): Promise<Lectura<SaludDelSistema>> {
  const fuentes = PIEZAS_DEL_LECTOR.salud;
  try {
    const [autoR, latidosR, colaR] = await Promise.all([
      service.from("automations").select("clave, dominio, etapa, disparador, created_at", { count: "exact" }),
      Promise.all(
        CRONS.map((c) =>
          service
            .from("latidos")
            .select("clave, inicio, fin, estado")
            .eq("clave", c.clave)
            .neq("estado", "en_curso")
            .order("inicio", { ascending: false })
            .limit(1)
            .maybeSingle()
        )
      ),
      service.from("integration_events").select("dominio, estado", { count: "exact" }).in("estado", ["pendiente", "fallido"]),
    ]);
    if (autoR.error || colaR.error || latidosR.some((l) => l.error)) return mal("lectura_salud", fuentes);

    const filas = (autoR.data as FilaDeAutomatizacion[] | null) ?? [];
    // El código de error del latido no hace falta para la salud: no se lee.
    const latidos: UltimoLatidoFinal[] = [];
    for (const l of latidosR) {
      const f = l.data as Omit<UltimoLatidoFinal, "codigo_error"> | null;
      if (f) latidos.push({ ...f, codigo_error: null });
    }
    const eventos = (colaR.data as { dominio: string; estado: string }[] | null) ?? [];
    const truncado = (autoR.count ?? 0) > filas.length || (colaR.count ?? 0) > eventos.length;
    return bien(
      { crons: saludDeLosCrons(filas, latidos, ahora), automatizaciones: automatizacionesPorHub(filas), cola: colaPorHub(eventos) },
      fuentes,
      truncado
    );
  } catch {
    return mal("lectura_salud", fuentes);
  }
}

// ── Los hechos del turno ─────────────────────────────────────────────────────

/** Los hechos de las últimas 24 horas por hub (`leerHechos` + `resumirTurno`); `truncado` si una bitácora llegó al tope. */
export async function leerHechosPorHub(): Promise<Lectura<Partial<Record<Dominio, number>>>> {
  const fuentes = PIEZAS_DEL_LECTOR.hechos;
  try {
    const r = await leerHechos({ fuentes: ["audit_log", "integration_events", "latidos"], limite: TOPE_DE_FILAS });
    if (!r.ok) return mal("lectura_hechos", fuentes);
    return bien(resumirTurno(r.hechos).porDominio, fuentes, r.truncado.length > 0);
  } catch {
    return mal("lectura_hechos", fuentes);
  }
}

// ── Los lotes por etapa ──────────────────────────────────────────────────────

/** Un conteo exacto por etapa de `ETAPA_DEL_LOTE` (la etiqueta de la casa), y «otra» si la base tiene una etapa que la etiqueta no conoce. */
export async function leerLotesPorEtapa(service: SupabaseClient): Promise<Lectura<Partial<Record<string, number>>>> {
  const fuentes = PIEZAS_DEL_LECTOR.lotes;
  try {
    const etapas = Object.keys(ETAPA_DEL_LOTE);
    const [porEtapa, total] = await Promise.all([
      Promise.all(etapas.map((e) => contar(service.from("lots").select("id", { count: "exact", head: true }).eq("stage", e)))),
      contar(service.from("lots").select("id", { count: "exact", head: true })),
    ]);
    if (total === null || porEtapa.some((n) => n === null)) return mal("lectura_lotes", fuentes);
    const out: Partial<Record<string, number>> = {};
    // Cada etapa conocida sale con su cuenta, también el cero (el Almacén pinta la tira entera: un paso vacío es un dato).
    etapas.forEach((e, i) => {
      out[e] = porEtapa[i] as number;
    });
    const conocidas = porEtapa.reduce<number>((a, n) => a + (n ?? 0), 0);
    if (total > conocidas) out.otra = total - conocidas;
    return bien(out, fuentes);
  } catch {
    return mal("lectura_lotes", fuentes);
  }
}
