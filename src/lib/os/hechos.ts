import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  LLAVES_DEL_PAYLOAD,
  normalizarAuditoria,
  normalizarEvento,
  normalizarLatido,
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
//   · Lo que no se lee no se filtra: de `audit_log` NO se selecciona `notes`
//     (texto libre); de `integration_events` NO se selecciona `payload` entero, ni
//     `ultimo_error`, ni `destino`: solo las llaves de `LLAVES_DEL_PAYLOAD` por ruta
//     JSON. De los perfiles se leen ids y roles; nunca un nombre ni un correo.
//   · Nunca lanza: devuelve `{ ok: false, error }` con un CÓDIGO (la misma regla
//     que `ultimo_error` de la espina, S0): el mensaje de la base no sale de aquí.
//   · Cifras reales o ninguna: cada efecto dice en qué columna vive su número
//     (`medidas`); este lector no suma importes.

export type OpcionesDeHechos = {
  /** ISO 8601. Por defecto, 24 h antes de `hasta`. */
  desde?: string;
  /** ISO 8601. Por defecto, ahora. */
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

/** El select de `integration_events`: columnas fijas + las llaves permitidas del
 *  payload por ruta JSON (`alias:payload->>llave`). */
const SELECT_EVENTOS = ["id", "dominio", "tipo", "created_at", ...LLAVES_DEL_PAYLOAD.map((k) => `${k}:payload->>${k}`)].join(", ");

type Servicio = ReturnType<typeof createServiceRoleClient>;

function rango(op: OpcionesDeHechos): { desde: string; hasta: string } | null {
  const hasta = op.hasta ? new Date(op.hasta) : new Date();
  const desde = op.desde ? new Date(op.desde) : new Date(hasta.getTime() - UN_DIA_MS);
  if (Number.isNaN(hasta.getTime()) || Number.isNaN(desde.getTime()) || desde > hasta) return null;
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

/** Rol y nodo de cada perfil, en tres lecturas por id (nunca nombres). */
async function leerActores(service: Servicio, perfiles: string[]): Promise<Actores | null> {
  const actores = new Map<string, { rol: RolDelActor; sello: string | null }>();
  if (perfiles.length === 0) return actores;
  const [perfilesR, equipoR, sociosR] = await Promise.all([
    service.from("profiles").select("id, role").in("id", perfiles),
    service.from("panel_users").select("profile_id").in("profile_id", perfiles),
    service.from("partner_accounts").select("profile_id, node_type").in("profile_id", perfiles),
  ]);
  if (perfilesR.error || equipoR.error || sociosR.error) return null;
  const ROLES: Record<string, RolDelActor> = { producer: "productor", buyer: "comprador", partner: "socio", bcp_admin: "equipo" };
  for (const p of (perfilesR.data ?? []) as { id: string; role: string | null }[]) {
    actores.set(p.id, { rol: ROLES[p.role ?? ""] ?? "desconocido", sello: null });
  }
  // Un colaborador del panel juega como equipo aunque su perfil diga otra cosa.
  for (const e of (equipoR.data ?? []) as { profile_id: string }[]) {
    actores.set(e.profile_id, { rol: "equipo", sello: null });
  }
  for (const s of (sociosR.data ?? []) as { profile_id: string; node_type: string | null }[]) {
    const previo = actores.get(s.profile_id);
    actores.set(s.profile_id, { rol: previo?.rol === "equipo" ? "equipo" : "socio", sello: s.node_type ?? null });
  }
  return actores;
}

/** Los hechos de un rango, de las fuentes pedidas, del más reciente al más viejo. */
export async function leerHechos(op: OpcionesDeHechos = {}): Promise<ResultadoDeHechos> {
  const r = rango(op);
  if (!r) return { ok: false, error: "rango_invalido" };
  const fuentes = new Set(op.fuentes ?? FUENTES_POR_DEFECTO);
  const limite = Math.min(Math.max(Math.trunc(op.limite ?? 300), 1), 1000);
  const service = createServiceRoleClient();

  try {
    const [auditoria, eventos, latidos] = await Promise.all([
      fuentes.has("audit_log")
        ? service
            .from("audit_log")
            .select("id, entity_type, entity_id, action, previous_status, new_status, performed_by, created_at")
            .gte("created_at", r.desde)
            .lte("created_at", r.hasta)
            .order("created_at", { ascending: false })
            .limit(limite)
        : null,
      fuentes.has("integration_events")
        ? service
            .from("integration_events")
            .select(SELECT_EVENTOS)
            .gte("created_at", r.desde)
            .lte("created_at", r.hasta)
            .order("created_at", { ascending: false })
            .limit(limite)
        : null,
      fuentes.has("latidos")
        ? service
            .from("latidos")
            .select("id, clave, estado, inicio, fin")
            .neq("estado", "en_curso")
            .gte("inicio", r.desde)
            .lte("inicio", r.hasta)
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

    const perfiles = new Set<string>();
    for (const f of filasA) if (f.performed_by) perfiles.add(f.performed_by);
    for (const f of filasE) if (f.usuario) perfiles.add(f.usuario);
    const actores = await leerActores(service, [...perfiles]);
    if (!actores) return { ok: false, error: "lectura_actores" };

    const hechos: Hecho[] = [];
    for (const f of filasA) hechos.push(normalizarAuditoria(f, actores));
    for (const f of filasE) {
      const h = normalizarEvento(f, actores);
      if (h) hechos.push(h);
    }
    for (const f of filasL) {
      const h = normalizarLatido(f);
      if (h) hechos.push(h);
    }
    hechos.sort((a, b) => (a.cuando < b.cuando ? 1 : a.cuando > b.cuando ? -1 : 0));

    const truncado: FuenteDeHecho[] = [];
    if (filasA.length === limite) truncado.push("audit_log");
    if (filasE.length === limite) truncado.push("integration_events");
    if (filasL.length === limite) truncado.push("latidos");
    return { ok: true, hechos, desde: r.desde, hasta: r.hasta, truncado };
  } catch {
    // Un fallo de red o del cliente: el código, nunca el mensaje.
    return { ok: false, error: "lectura_fallida" };
  }
}
