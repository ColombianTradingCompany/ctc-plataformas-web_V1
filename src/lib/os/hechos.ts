import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  ES_UUID,
  PREFIJO_ENTRANTE,
  SELECT_AUDITORIA,
  SELECT_EVENTOS,
  SELECT_LATIDOS,
  LATIDO_SIN_CIERRE_MS,
  normalizarAuditoria,
  normalizarEvento,
  normalizarLatido,
  rolDeActor,
  type Actores,
  type FilaDeAuditoria,
  type FilaDeEvento,
  type FilaDeLatido,
  type FuenteDeHecho,
  type Hecho,
  type RolDelActor,
} from "./hechosCatalogo";

// ── CTCx OS · los HECHOS (lectura, server-only) ──────────────────────────────
// BORRADOR · decide el owner. Lee las bitácoras que YA existen —`audit_log`,
// `integration_events` y, si se pide, `latidos`— y devuelve UNA lista de hechos
// normalizados (`Hecho`, en `hechosCatalogo.ts`) para el turno, el mapa y las
// barras de victoria. Ni migración, ni tabla nueva, ni ruta que lo exponga: hasta
// que el owner decida dónde se pinta, solo lo importa código de servidor.
//
// Lo que este archivo promete:
//   · SOLO LECTURA, con el service role (las tres tablas son service-role-only:
//     RLS encendida sin políticas, el patrón de la casa). No escribe en ningún sitio.
//   · Lo que no se lee no se filtra: las columnas salen de las listas blancas del
//     catálogo (`SELECT_*`): de `audit_log` no se lee `notes` (texto libre); de
//     `integration_events` no se lee el `payload` entero, ni `ultimo_error`, ni el
//     destino: solo las llaves permitidas por ruta JSON. De los perfiles se leen ids,
//     roles y señales de actividad; nunca un nombre ni un correo.
//   · Nunca lanza: devuelve `{ ok: false, error }` con un CÓDIGO (la misma regla
//     que `ultimo_error` de la espina, S0): el mensaje de la base no sale de aquí.
//   · Cifras reales o ninguna: cada efecto dice en qué columna vive su número
//     (`medidas`); este lector no suma importes.
//   · El rango es semiabierto, [desde, hasta): dos ventanas contiguas no repiten filas.

export type OpcionesDeHechos = {
  /** ISO 8601. Por defecto, 24 h antes de `hasta`. */
  desde?: string;
  /** ISO 8601, excluido. Por defecto, ahora. */
  hasta?: string;
  /** Por defecto `audit_log` e `integration_events`; `latidos` es la salud de los crons. */
  fuentes?: readonly FuenteDeHecho[];
  /** Filas por fuente (1–1000, por defecto 300). */
  limite?: number;
};

export type ErrorDeHechos =
  | "rango_invalido" | "lectura_auditoria" | "lectura_eventos" | "lectura_latidos" | "lectura_actores" | "lectura_fallida";

export type ResultadoDeHechos =
  | { ok: true; hechos: Hecho[]; desde: string; hasta: string; truncado: FuenteDeHecho[] }
  | { ok: false; error: ErrorDeHechos };

const FUENTES_POR_DEFECTO: readonly FuenteDeHecho[] = ["audit_log", "integration_events"];
const UN_DIA_MS = 24 * 60 * 60 * 1000;

type Servicio = ReturnType<typeof createServiceRoleClient>;

function rango(op: OpcionesDeHechos): { desde: string; hasta: string } | null {
  const hasta = op.hasta ? new Date(op.hasta) : new Date();
  const desde = op.desde ? new Date(op.desde) : new Date(hasta.getTime() - UN_DIA_MS);
  if (Number.isNaN(hasta.getTime()) || Number.isNaN(desde.getTime()) || desde >= hasta) return null;
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

/** Rol y nodo de cada perfil, por id: el rol de la cuenta, si es del equipo o de un
 *  nodo, y si de verdad compra (la regla de `rolDeActor`). Nunca nombres. */
async function leerActores(service: Servicio, perfiles: string[]): Promise<Actores | null> {
  const actores = new Map<string, { rol: RolDelActor; sello: string | null }>();
  if (perfiles.length === 0) return actores;
  const [perfilesR, equipoR, sociosR, compradoresR, pedidosR, reservasR] = await Promise.all([
    service.from("profiles").select("id, role").in("id", perfiles),
    service.from("panel_users").select("profile_id").in("profile_id", perfiles),
    service.from("partner_accounts").select("profile_id, node_type").in("profile_id", perfiles),
    service.from("buyer_profiles").select("profile_id, membership_tier, lifetime_points").in("profile_id", perfiles),
    service.from("orders").select("buyer_id").in("buyer_id", perfiles).limit(1000),
    service.from("lot_reservations").select("buyer_id").in("buyer_id", perfiles).limit(1000),
  ]);
  if (perfilesR.error || equipoR.error || sociosR.error || compradoresR.error || pedidosR.error || reservasR.error) return null;

  const enPanel = new Set(((equipoR.data ?? []) as { profile_id: string }[]).map((e) => e.profile_id));
  const nodo = new Map(((sociosR.data ?? []) as { profile_id: string; node_type: string | null }[]).map((s) => [s.profile_id, s.node_type ?? null]));
  const conActividad = new Set<string>();
  for (const b of (compradoresR.data ?? []) as { profile_id: string; membership_tier: string | null; lifetime_points: number | string | null }[]) {
    if (Number(b.lifetime_points ?? 0) > 0 || String(b.membership_tier ?? "verde") !== "verde") conActividad.add(b.profile_id);
  }
  for (const o of (pedidosR.data ?? []) as { buyer_id: string }[]) conActividad.add(o.buyer_id);
  for (const r of (reservasR.data ?? []) as { buyer_id: string }[]) conActividad.add(r.buyer_id);

  for (const p of (perfilesR.data ?? []) as { id: string; role: string | null }[]) {
    actores.set(p.id, rolDeActor({
      role: p.role,
      enPanel: enPanel.has(p.id),
      nodo: nodo.get(p.id) ?? null,
      actividadDeComprador: conActividad.has(p.id),
    }));
  }
  return actores;
}

/** Los hechos de un rango, de las fuentes pedidas, del más reciente al más viejo. */
export async function leerHechos(op: OpcionesDeHechos = {}): Promise<ResultadoDeHechos> {
  const r = rango(op);
  if (!r) return { ok: false, error: "rango_invalido" };
  const fuentes = new Set(op.fuentes ?? FUENTES_POR_DEFECTO);
  const limite = Math.min(Math.max(Math.trunc(op.limite ?? 300), 1), 1000);
  const ahora = new Date().toISOString();
  const corteSinCierre = new Date(Date.parse(ahora) - LATIDO_SIN_CIERRE_MS).toISOString();

  try {
    const service = createServiceRoleClient();
    const [auditoria, eventos, latidos] = await Promise.all([
      fuentes.has("audit_log")
        ? service
            .from("audit_log")
            .select(SELECT_AUDITORIA)
            .gte("created_at", r.desde)
            .lt("created_at", r.hasta)
            .order("created_at", { ascending: false })
            .limit(limite)
        : null,
      fuentes.has("integration_events")
        ? service
            .from("integration_events")
            .select(SELECT_EVENTOS)
            .not("tipo", "like", `${PREFIJO_ENTRANTE}%`)
            .gte("created_at", r.desde)
            .lt("created_at", r.hasta)
            .order("created_at", { ascending: false })
            .limit(limite)
        : null,
      fuentes.has("latidos")
        ? service
            .from("latidos")
            .select(SELECT_LATIDOS)
            .or(`estado.neq.en_curso,inicio.lt.${corteSinCierre}`)
            .gte("inicio", r.desde)
            .lt("inicio", r.hasta)
            .order("inicio", { ascending: false })
            .limit(limite)
        : null,
    ]);
    if (auditoria?.error) return { ok: false, error: "lectura_auditoria" };
    if (eventos?.error) return { ok: false, error: "lectura_eventos" };
    if (latidos?.error) return { ok: false, error: "lectura_latidos" };

    const filasA = (auditoria?.data ?? []) as unknown as FilaDeAuditoria[];
    const filasE = (eventos?.data ?? []) as unknown as FilaDeEvento[];
    const filasL = (latidos?.data ?? []) as unknown as FilaDeLatido[];

    // El actor sale solo de `performed_by` (lo escribe el servidor), y solo si es un uuid.
    const perfiles = new Set<string>();
    for (const f of filasA) if (f.performed_by && ES_UUID.test(f.performed_by)) perfiles.add(f.performed_by);
    const actores = await leerActores(service, [...perfiles]);
    if (!actores) return { ok: false, error: "lectura_actores" };

    const hechos: Hecho[] = [];
    for (const f of filasA) hechos.push(normalizarAuditoria(f, actores));
    for (const f of filasE) {
      const h = normalizarEvento(f);
      if (h) hechos.push(h);
    }
    for (const f of filasL) {
      const h = normalizarLatido(f, ahora);
      if (h) hechos.push(h);
    }
    hechos.sort((a, b) => (a.cuando < b.cuando ? 1 : a.cuando > b.cuando ? -1 : 0));

    const truncado: FuenteDeHecho[] = [];
    if (filasA.length === limite) truncado.push("audit_log");
    if (filasE.length === limite) truncado.push("integration_events");
    if (filasL.length === limite) truncado.push("latidos");
    return { ok: true, hechos, desde: r.desde, hasta: r.hasta, truncado };
  } catch {
    // Sin credencial, un fallo de red o del cliente: el código, nunca el mensaje.
    return { ok: false, error: "lectura_fallida" };
  }
}
