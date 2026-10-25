import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { limpiarError, type CodigoEntrada } from "./errores";

// ── Integraciones · lo que un evento ENTRANTE puede hacer ────────────────────
// La puerta (`/api/integraciones/[canal]`) autentica y registra. Esto es lo
// único que decide QUÉ se toca en la base de datos, y está escrito como una
// lista blanca corta a propósito.
//
// La regla que gobierna el archivo, del plan (§1): la plataforma manda sobre la
// cotización. Notion NO puede cambiar un total, un estado, un destinatario ni
// una vigencia — esos campos tienen guardianes, máquina de estados y bitácora, y
// Notion no puede honrar nada de eso. Lo que Notion sí sabe, y nosotros no, es
// la conversación que hubo alrededor del número. Eso —y nada más— vuelve.
//
// Por eso no hay un manejador genérico de «actualiza la cotización con este
// jsonb». Cada tipo entrante se añade a mano, con su validación, y se ve de un
// vistazo todo lo que el exterior puede provocar aquí dentro.
//
// Un fallo lleva DOS cosas: `codigo` (de la lista cerrada de `errores.ts`) es lo
// único que se guarda en `ultimo_error`; `detalle` vuelve solo en la respuesta
// HTTP a Make, para que el escenario sepa qué pasó. Lo que trae el evento puede
// aparecer en `detalle`, nunca en la base.

type Cliente = ReturnType<typeof createServiceRoleClient>;

export type Aplicacion =
  | { estado: "aplicado"; detalle: string }
  | { estado: "descartado"; detalle: string }
  | { estado: "fallido"; detalle: string; codigo: CodigoEntrada | `excepcion:${string}` };

const falla = (codigo: CodigoEntrada, detalle: string): Aplicacion => ({ estado: "fallido", codigo, detalle });

/** El tope de la nota comercial. No es una regla de negocio: es que un campo de
 *  texto sin techo que escribe un sistema ajeno acaba trayendo una novela. */
const NOTA_MAX = 4000;

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Aplica un evento entrante. NUNCA lanza: la puerta ya respondió que lo
 *  recibió, y la fila queda con el resultado escrito para poder mirarlo.
 *  `client` se inyecta solo desde el guardián. */
export async function aplicarEntrante(
  tipo: string,
  payload: Record<string, unknown>,
  deps: { client?: Cliente } = {}
): Promise<Aplicacion> {
  try {
    const db = () => deps.client ?? createServiceRoleClient();
    switch (tipo) {
      case "cotizacion.espejada":
        return await cotizacionEspejada(payload, db);
      case "cotizacion.nota":
        return await cotizacionNota(payload, db);
      case "jornada.agendada":
        return await jornadaAgendada(payload, db);
      case "rts.tablero":
        return await rtsTablero(payload, db);
      default:
        // No es un error. Un evento sin manejador se queda registrado y ya:
        // sirve para ver qué está mandando Make antes de decidir si merece uno.
        return { estado: "descartado", detalle: `sin manejador para «${tipo}»` };
    }
  } catch (e) {
    const codigo = limpiarError(e);
    return { estado: "fallido", codigo: codigo.startsWith("excepcion:") ? (codigo as `excepcion:${string}`) : "excepcion", detalle: codigo };
  }
}

/** Make creó (o encontró) la página en Notion y nos dice dónde quedó. Con esto
 *  el OCP puede saltar a ella, que es lo que convierte el espejo en algo que se
 *  usa en vez de un duplicado silencioso. */
async function cotizacionEspejada(p: Record<string, unknown>, db: () => Cliente): Promise<Aplicacion> {
  const code = texto(p.ctc_id) ?? texto(p.code);
  const pageId = texto(p.notion_page_id);
  if (!code) return falla("falta_campo", "falta `ctc_id`");
  if (!pageId) return falla("falta_campo", "falta `notion_page_id`");

  const service = db();
  const { data, error } = await service
    .from("quotes")
    .update({
      notion_page_id: pageId,
      notion_url: texto(p.notion_url),
      notion_synced_at: new Date().toISOString(),
    })
    .eq("code", code)
    .select("id");

  if (error) return falla("error_bd", error.message);
  if (!data?.length) return { estado: "descartado", detalle: `no existe la cotización ${code}` };
  return { estado: "aplicado", detalle: `${code} ← ${pageId}` };
}

/** Dónde quedó el evento del calendario (F3). El `ref` dice de qué jornada
 *  hablamos —`arena:<uuid>` o `recolecta:<uuid>`—, porque son dos tablas
 *  distintas: una catación en el laboratorio y gente yendo a una finca no son
 *  la misma cosa aunque las dos se agenden.
 *
 *  Guardar el id NO es un adorno: sin él, cambiar la fecha de una jornada deja
 *  dos eventos en el calendario y nadie sabe cuál rige. */
async function jornadaAgendada(p: Record<string, unknown>, db: () => Cliente): Promise<Aplicacion> {
  const ref = texto(p.ref);
  const eventId = texto(p.calendar_event_id);
  if (!ref) return falla("falta_campo", "falta `ref`");
  if (!eventId) return falla("falta_campo", "falta `calendar_event_id`");

  const [clase, id] = ref.split(":");
  const tabla =
    clase === "arena" ? "arena_sessions" : clase === "recolecta" ? "terratalento_jornadas" : null;
  if (!tabla || !id) {
    return falla("ref_no_reconocido", `ref no reconocido: «${ref}» (espera arena:<id> o recolecta:<id>)`);
  }

  const service = db();
  const { data, error } = await service
    .from(tabla)
    .update({
      calendar_event_id: eventId,
      calendar_url: texto(p.calendar_url),
      calendar_synced_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");

  if (error) return falla("error_bd", error.message);
  if (!data?.length) return { estado: "descartado", detalle: `no existe ${ref}` };
  return { estado: "aplicado", detalle: `${ref} ← ${eventId}` };
}

/** RT-Scriptor · fase 2. La plataforma genera las fotografías con Gemini (su
 *  clave, su cuota) y le pasa a Make lo único que Make sabe hacer y nosotros no:
 *  montarlas en un tablero de marca con Canva, donde vive ese OAuth.
 *
 *  Lo único que vuelve es DÓNDE quedó el diseño. Nada de tocar el trabajo de
 *  revelado en sí: los fotogramas son de la plataforma y tienen su historial.
 *  Misma regla que el espejo de Notion — vuelve la referencia, no el contenido. */
async function rtsTablero(p: Record<string, unknown>, db: () => Cliente): Promise<Aplicacion> {
  const jobId = texto(p.jobId) ?? texto(p.job_id);
  const url = texto(p.canva_url) ?? texto(p.url);
  if (!jobId) return falla("falta_campo", "falta `jobId`");
  if (!url) return { estado: "descartado", detalle: "sin url del tablero" };
  if (!/^https:\/\//i.test(url)) return falla("url_no_https", "la url del tablero tiene que ser https");

  const service = db();
  const { data, error } = await service
    .from("coffeed_rts_renders")
    .update({ canva_url: url, canva_design_id: texto(p.design_id), canva_synced_at: new Date().toISOString() })
    .eq("id", jobId)
    .select("id");

  if (error) return falla("error_bd", error.message);
  if (!data?.length) return { estado: "descartado", detalle: `no existe el revelado ${jobId}` };
  return { estado: "aplicado", detalle: `${jobId} ← ${url}` };
}

/** La nota comercial que se escribió en Notion, de vuelta. Es EL campo que
 *  viaja en esta dirección; el plan pide empezar por uno solo y sostenerlo un
 *  mes antes de abrir más. */
async function cotizacionNota(p: Record<string, unknown>, db: () => Cliente): Promise<Aplicacion> {
  const code = texto(p.ctc_id) ?? texto(p.code);
  const nota = texto(p.nota) ?? texto(p.nota_comercial);
  if (!code) return falla("falta_campo", "falta `ctc_id`");
  if (!nota) return { estado: "descartado", detalle: "nota vacía" };
  if (nota.length > NOTA_MAX) {
    return falla("nota_demasiado_larga", `la nota supera ${NOTA_MAX} caracteres (${nota.length})`);
  }

  const service = db();
  const { data, error } = await service
    .from("quotes")
    .update({ nota_comercial: nota, nota_comercial_at: new Date().toISOString() })
    .eq("code", code)
    .select("id");

  if (error) return falla("error_bd", error.message);
  if (!data?.length) return { estado: "descartado", detalle: `no existe la cotización ${code}` };
  return { estado: "aplicado", detalle: `${code} · ${nota.length} caracteres` };
}
