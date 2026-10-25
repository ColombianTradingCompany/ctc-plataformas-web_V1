// ── Integraciones · el registro de los crons y su salud (B6.0, P2 del plan de unificación) ──────────
// UNA fuente para dos cosas que no pueden desalinearse:
//
// 1. Las 14 filas que el registro de Automatizaciones (`automations`) tiene que llevar desde el P2: los 8
//    crons de `vercel.json` en `activa` (con su ruta como `clave`) y 6 trabajos todavía `propuesta` (el
//    briefing y tres escenarios de Make) con una clave estable que no es una ruta.
// 2. Cuándo debía correr cada cron y si está sano, a partir de su último latido (`latidos`).
//
// Es PURO (sin base, sin `server-only`): lo importan el tablero, `actions.ts` y el guardián
// `qa-registro-crons`, que exige que cada cron de `vercel.json` tenga aquí su fila con el MISMO horario.
// Los nombres son de rol, nunca de persona.

import type { Criticidad, Dominio, Sistema } from "./dominios";

export type FilaSemilla = {
  clave: string;
  nombre: string;
  proposito: string;
  dominio: Dominio;
  disparador: "cron" | "calendario";
  sistemas: Sistema[];
  criticidad: Criticidad;
  etapa: "activa" | "propuesta";
  /** Solo los crons: el MISMO texto que su entrada de vercel.json (UTC). */
  horario?: string;
};

export const CRONS: FilaSemilla[] = [
  {
    clave: "/api/cron/market-anchors", nombre: "Cron · Precio FNC del día",
    proposito: "Lee el precio de la carga que publica la FNC y lo anota como ancla del día; el resto del modelo económico parte de ahí.",
    dominio: "origen_suministro", disparador: "cron", sistemas: ["plataforma", "supabase", "otro"], criticidad: "importante",
    etapa: "activa", horario: "10 11 * * *",
  },
  {
    clave: "/api/cron/renovaciones", nombre: "Cron · Ventanas de Cherry Picked",
    proposito: "Recuerda la renovación que vence en 7 días, expira las invitaciones vencidas y cierra las ventanas cumplidas.",
    dominio: "ventas_marketing", disparador: "cron", sistemas: ["plataforma", "supabase"], criticidad: "importante",
    etapa: "activa", horario: "20 11 * * *",
  },
  {
    clave: "/api/cron/vigilancia-pvc", nombre: "Cron · Vigilancia del PVC",
    proposito: "Mide el ciclo en curso contra el PVC vigente, propone la corrección que se cumpla y avisa por correo.",
    dominio: "admin_estrategia", disparador: "cron", sistemas: ["plataforma", "supabase"], criticidad: "importante",
    etapa: "activa", horario: "25 11 * * *",
  },
  {
    clave: "/api/cron/agente-pvc", nombre: "Cron · Agente de la edición siguiente del PVC",
    proposito: "Desde la semana 1 del ciclo 2 deja el borrador de la edición siguiente del PVC y recuerda su plazo.",
    dominio: "admin_estrategia", disparador: "cron", sistemas: ["plataforma", "supabase"], criticidad: "util",
    etapa: "activa", horario: "40 11 * * *",
  },
  {
    clave: "/api/cron/integraciones", nombre: "Cron · Despachador de la espina",
    proposito: "Manda a Make lo que quedó pendiente en la espina de integración; una vez al día barre además los soportes vencidos del Directorio.",
    dominio: "it_plataforma", disparador: "cron", sistemas: ["plataforma", "supabase", "otro"], criticidad: "importante",
    etapa: "activa", horario: "*/10 * * * *",
  },
  {
    clave: "/api/cron/courier-combustible", nombre: "Cron · Recargo de combustible del courier",
    proposito: "Deriva cada jueves el recargo de combustible de la semana siguiente a partir del precio que publica la EIA.",
    dominio: "transito_importacion", disparador: "cron", sistemas: ["plataforma", "supabase", "otro"], criticidad: "util",
    etapa: "activa", horario: "30 13 * * 4",
  },
  {
    clave: "/api/cron/recordatorios", nombre: "Cron · Recordatorios semanales",
    proposito: "Recuerda las certificaciones con evidencia pedida, el pedido del trato en mora y las cuentas que se marchitan.",
    dominio: "origen_suministro", disparador: "cron", sistemas: ["plataforma", "supabase"], criticidad: "importante",
    etapa: "activa", horario: "0 12 * * 1",
  },
  {
    clave: "/api/cron/seguimientos-leads", nombre: "Cron · Seguimientos de la Interfaz de Leads",
    proposito: "Manda el seguimiento de los leads de feria cuyo plazo venció, solo en los formularios con el seguimiento encendido.",
    dominio: "ventas_marketing", disparador: "cron", sistemas: ["plataforma", "supabase"], criticidad: "util",
    etapa: "activa", horario: "5 * * * *",
  },
];

export const PROPUESTAS: FilaSemilla[] = [
  {
    clave: "briefing:apertura-owner", nombre: "Briefing · Apertura de la dirección",
    proposito: "Abre la jornada de la dirección con una página de Notion: correo, agenda, pendientes y salud de los sistemas.",
    dominio: "admin_estrategia", disparador: "calendario", sistemas: ["notion", "gmail", "calendar", "drive", "plataforma"],
    criticidad: "experimental", etapa: "propuesta",
  },
  {
    clave: "briefing:apertura-colombia", nombre: "Briefing · Apertura del equipo en Colombia",
    proposito: "Abre la jornada del equipo en Colombia con su página de Notion y lo que le toca hoy.",
    dominio: "admin_estrategia", disparador: "calendario", sistemas: ["notion", "gmail", "calendar", "plataforma"],
    criticidad: "experimental", etapa: "propuesta",
  },
  {
    clave: "briefing:cierre", nombre: "Briefing · Cierre del día",
    proposito: "Cierra la jornada: qué quedó hecho, qué espera respuesta y qué pasa a mañana.",
    dominio: "admin_estrategia", disparador: "calendario", sistemas: ["notion", "gmail", "calendar", "plataforma"],
    criticidad: "experimental", etapa: "propuesta",
  },
  {
    clave: "make:gmail-limpieza", nombre: "Gmail · Limpieza diaria",
    proposito: "Archiva cada noche las conversaciones hechas solo de códigos de acceso con más de un día.",
    dominio: "it_plataforma", disparador: "calendario", sistemas: ["gmail"], criticidad: "experimental", etapa: "propuesta",
  },
  {
    clave: "make:vigia", nombre: "CTC · Vigía",
    proposito: "Vigila de forma independiente que los trabajos corran y avisa si alguno se calla.",
    dominio: "it_plataforma", disparador: "calendario", sistemas: ["gmail", "plataforma"], criticidad: "experimental", etapa: "propuesta",
  },
  {
    clave: "make:seguimientos-respuesta", nombre: "Seguimientos · respuesta",
    proposito: "Comprueba cada hora en Gmail si un lead de feria ya respondió, antes de que salga su seguimiento.",
    dominio: "ventas_marketing", disparador: "calendario", sistemas: ["gmail", "plataforma"], criticidad: "experimental", etapa: "propuesta",
  },
];

export const SEMILLA: FilaSemilla[] = [...CRONS, ...PROPUESTAS];

/** La clave de un cron es su ruta; la de lo demás, una etiqueta estable con «:». */
export const CLAVE_CRON_RE = /^\/api\/cron\/[a-z0-9-]+$/;

// ── El horario ──────────────────────────────────────────────────────────────────────────────────────────
// El subconjunto de cron que se entiende: números, `*`, listas con comas y pasos `*/N`. Es lo que usa
// vercel.json hoy; el guardián rechaza cualquier otra cosa en vez de adivinar.

type Campo = (v: number) => boolean;

function campo(texto: string, min: number, max: number): Campo | null {
  if (texto === "*") return () => true;
  const paso = /^\*\/(\d+)$/.exec(texto);
  if (paso) {
    const n = Number(paso[1]);
    return n > 0 ? (v) => (v - min) % n === 0 : null;
  }
  const partes = texto.split(",");
  if (!partes.every((p) => /^\d+$/.test(p))) return null;
  const valores = new Set(partes.map(Number));
  if ([...valores].some((v) => v < min || v > max)) return null;
  return (v) => valores.has(v);
}

/** El horario como función «¿toca en este minuto (UTC)?», o null si no está en el subconjunto. */
export function leerHorario(horario: string): ((d: Date) => boolean) | null {
  const f = horario.trim().split(/\s+/);
  if (f.length !== 5) return null;
  const [mi, ho, dm, me, ds] = [campo(f[0], 0, 59), campo(f[1], 0, 23), campo(f[2], 1, 31), campo(f[3], 1, 12), campo(f[4], 0, 6)];
  if (!mi || !ho || !dm || !me || !ds) return null;
  return (d) => mi(d.getUTCMinutes()) && ho(d.getUTCHours()) && dm(d.getUTCDate()) && me(d.getUTCMonth() + 1) && ds(d.getUTCDay());
}

/** Minutos de gracia antes de llamar «Atrasada» a una corrida: 15 para lo que corre cada hora o más
 *  seguido, 30 para lo diario o semanal. */
export function margenMin(horario: string): number {
  const minuto = horario.trim().split(/\s+/)[0];
  const hora = horario.trim().split(/\s+/)[1];
  return hora === "*" || minuto.startsWith("*") ? 15 : 30;
}

/** La última vez (UTC, al minuto) que el horario tocaba en o antes de `hasta`; busca 8 días atrás. */
export function ultimaEsperada(horario: string, hasta: Date): Date | null {
  const toca = leerHorario(horario);
  if (!toca) return null;
  const t = new Date(hasta);
  t.setUTCSeconds(0, 0);
  for (let i = 0; i < 8 * 24 * 60; i++) {
    if (toca(t)) return new Date(t);
    t.setUTCMinutes(t.getUTCMinutes() - 1);
  }
  return null;
}

// ── La salud ────────────────────────────────────────────────────────────────────────────────────────────

export type EstadoLatido = "en_curso" | "ok" | "parcial" | "fallido";
export type LatidoFinal = { inicio: string; fin: string | null; estado: Exclude<EstadoLatido, "en_curso">; codigo_error: string | null };
export type Salud = "sin_corrida" | "atrasada" | "fallo" | "parcial" | "ok";

export const SALUD_LABEL: Record<Salud, string> = {
  sin_corrida: "Sin corrida aún",
  atrasada: "Atrasada",
  fallo: "Falló",
  parcial: "Parcial",
  ok: "Al día",
};

/** La regla del tablero (P2):
 *  - «Atrasada» si hay una corrida esperada E con E + margen ≤ ahora, E posterior a la fila del registro, y
 *    ningún latido final con inicio ≥ E − 2 min (también cubre la corrida que se quedó colgada en `en_curso`);
 *  - si no, «Falló» o «Parcial» según el último latido final;
 *  - «Sin corrida aún» si desde que se sembró la fila no ha pasado ninguna corrida esperada. */
export function saludDeCron(horario: string, filaCreada: Date, ultimoFinal: LatidoFinal | null, ahora: Date): Salud {
  const e = ultimaEsperada(horario, new Date(ahora.getTime() - margenMin(horario) * 60_000));
  const ultimoInicio = ultimoFinal ? new Date(ultimoFinal.inicio).getTime() : -Infinity;
  if (e && e.getTime() > filaCreada.getTime() && ultimoInicio < e.getTime() - 2 * 60_000) return "atrasada";
  if (!ultimoFinal) return "sin_corrida";
  if (ultimoFinal.estado === "fallido") return "fallo";
  if (ultimoFinal.estado === "parcial") return "parcial";
  return "ok";
}
