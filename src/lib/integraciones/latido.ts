import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { codigoHttp, limpiarError } from "./errores";

// ── Integraciones · el latido de un cron (B6.0, P2 del plan de unificación) ──────────────────────────────
// `conLatido(clave, trabajo)` envuelve el trabajo de un cron DESPUÉS de su comprobación de CRON_SECRET (así
// un 401 o un 503 no escriben nada) y deja UNA fila en `latidos`: se abre `en_curso`, corre el trabajo, se
// lee una COPIA de su respuesta y se cierra con el estado final y solo números. La respuesta vuelve
// intacta: el cron no cambia qué hace, qué responde ni cuándo corre.
//
// El estado final:
//   el trabajo lanza                                   → fallido  (código por `limpiarError`, nunca el texto)
//   HTTP ≥ 400                                         → fallido  (`http_<status>`)
//   HTTP 207                                           → parcial
//   2xx con `ok: false` y `skipped`                    → parcial  (p. ej. FNC sin precio reconocible)
//   2xx con `ok: false` sin `skipped`                  → fallido  (`respuesta_ok_false`)
//   lo demás                                           → ok
//
// FALLA ABIERTO: cada escritura en la bitácora tiene un techo de 3 s y su error se traga. Si la bitácora no
// responde, el cron corre y responde exactamente igual; un cierre que no llegó se ve como «Atrasada».
// `conteos` guarda solo números finitos (arriba y un nivel abajo; una lista cuenta su largo), nunca texto:
// la regla F.4 (en la bitácora no entran contenidos, direcciones ni asuntos).

type Cliente = ReturnType<typeof createServiceRoleClient>;

export type LatidoDeps = {
  client?: Cliente | null;
  /** Techo de cada escritura en la bitácora (ms). */
  timeoutMs?: number;
  /** Purga los latidos de más de 400 días al cerrar (la vuelta diaria del despachador). */
  purgar?: boolean;
  ahora?: () => Date;
};

const DIAS_RETENCION = 400;

/** Los números de una respuesta: finitos, arriba y un nivel abajo (`a.b`); una lista vale su largo. */
export function extraerConteos(cuerpo: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const valor = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : Array.isArray(v) ? v.length : null;
  const clave = (k: string) => k.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 60);
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) return out;
  for (const [k, v] of Object.entries(cuerpo as Record<string, unknown>)) {
    const n = valor(v);
    if (n !== null) { out[clave(k)] = n; continue; }
    if (v && typeof v === "object") {
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        const n2 = valor(v2);
        if (n2 !== null) out[`${clave(k)}.${clave(k2)}`] = n2;
      }
    }
  }
  return out;
}

/** El estado final y su código, a partir del status y del cuerpo (ver la tabla de arriba). */
export function clasificar(status: number, cuerpo: unknown): { estado: "ok" | "parcial" | "fallido"; codigo: string | null } {
  if (status >= 400) return { estado: "fallido", codigo: codigoHttp(status) };
  if (status === 207) return { estado: "parcial", codigo: null };
  const c = cuerpo && typeof cuerpo === "object" ? (cuerpo as Record<string, unknown>) : {};
  if (c.ok === false) return c.skipped ? { estado: "parcial", codigo: null } : { estado: "fallido", codigo: "respuesta_ok_false" };
  return { estado: "ok", codigo: null };
}

export async function conLatido(clave: string, trabajo: () => Promise<Response>, deps: LatidoDeps = {}): Promise<Response> {
  const techo = deps.timeoutMs ?? 3_000;
  const ahora = deps.ahora ?? (() => new Date());
  let db: Cliente | null = null;
  try {
    db = deps.client === undefined ? createServiceRoleClient() : deps.client;
  } catch {
    db = null; // sin bitácora, el cron corre igual
  }

  let id: string | null = null;
  if (db) {
    try {
      const { data } = await db
        .from("latidos")
        .insert({ clave, trabajo: clave.split("/").pop() ?? clave, motor: "vercel_cron", inicio: ahora().toISOString(), estado: "en_curso" })
        .select("id")
        .abortSignal(AbortSignal.timeout(techo))
        .single();
      id = (data as { id: string } | null)?.id ?? null;
    } catch {
      id = null;
    }
  }

  const cerrar = async (estado: "ok" | "parcial" | "fallido", codigo: string | null, conteos: Record<string, number>) => {
    if (!db || !id) return;
    try {
      await db
        .from("latidos")
        .update({ estado, fin: ahora().toISOString(), codigo_error: codigo, conteos })
        .eq("id", id)
        .abortSignal(AbortSignal.timeout(techo));
    } catch {
      /* falla abierto: el cierre que no llegó se ve como «Atrasada» */
    }
  };

  let respuesta: Response;
  try {
    respuesta = await trabajo();
  } catch (e) {
    await cerrar("fallido", limpiarError(e), {});
    throw e;
  }

  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.clone().json();
  } catch {
    cuerpo = null;
  }
  const { estado, codigo } = clasificar(respuesta.status, cuerpo);
  const conteos = extraerConteos(cuerpo);

  if (deps.purgar && db) {
    try {
      // Una hora de holgura sobre los 400 días: el guardia de la tabla mide con el reloj de la base y rechaza el
      // borrado ENTERO si una sola fila cae del lado reciente; así un desfase de reloj no tumba la purga del día.
      const limite = new Date(ahora().getTime() - DIAS_RETENCION * 86_400_000 - 3_600_000).toISOString();
      const { count } = await db
        .from("latidos")
        .delete({ count: "exact" })
        .lt("inicio", limite)
        .abortSignal(AbortSignal.timeout(techo));
      conteos.latidos_purgados = count ?? 0;
    } catch {
      /* la purga es de mejor esfuerzo; se reintenta mañana */
    }
  }

  await cerrar(estado, codigo, conteos);
  return respuesta;
}
