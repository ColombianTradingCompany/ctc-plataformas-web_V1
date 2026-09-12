import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { registrarConsumo, usoDesdeAnthropic, USOS } from "@/lib/ai/consumo";
import { contextoDeAcceso } from "@/lib/tools/toolGrants";
import { MOTIVO_COPY, puedeAbrir } from "@/lib/tools/accesoHerramienta";
import reglasJson from "@/lib/tools/cromatografia/reglas.json";
import {
  PROMPT_VERSION,
  ensamblarSistema,
  ensamblarUsuario,
  faltantesEnReglas,
  reglaRegional,
  type ContextoMuestra,
  type FordProgramatico,
  type Rasgos,
  type Reglas,
} from "@/lib/tools/cromatografia/prompt";
import { extraerJson, validarSalida } from "@/lib/tools/cromatografia/salida";

// ── Lector de Cromatografía de Suelo · la LECTURA con IA ─────────────────────
// La única pieza de la herramienta que gasta dinero (brief
// herramientas-cafe-cromatografia-suelo, aprobado 2026-09-12). Todo lo demás
// —compuerta de validación, rasgos, Ford programático, reporte, PDF— corre en el
// navegador y funciona sin cuenta y sin internet.
//
// Vive bajo /api/ porque `api/` está fuera del matcher del proxy: la MISMA URL
// sirve desde herramientas., kaffetal-regal. y directorio. sin reescritura, y la
// cookie compartida `sb-…` viaja entre subdominios.
//
// EL ORDEN DE LAS PUERTAS importa y es el de siempre: sesión → veredicto de
// acceso a la herramienta (miembro + permiso Plus) → reglas completas → clave →
// entrada saneada → techo diario. Ni un token se gasta antes de la última.
//
// LO QUE EL MODELO NUNCA DECIDE: el descargo (`limites`), la etiqueta de cada
// nivel de evidencia y el contexto regional cuando no hay región. Los pone
// `validarSalida()` desde `reglas.json`. Y lo que no pasa sus controles no se
// enseña: se pide UNA corrección y, si vuelve a fallar, se responde 422.

export const maxDuration = 120;

const TOOL_ID = "cromatografia-suelo";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// Modelo pequeño por defecto (disciplina de costes de la casa, decisión del
// owner 2026-09-12). El kickoff pide no cablearlo: `CROMA_MODEL` lo cambia sin
// desplegar. Un modelo sin fila en `precios.ts` se anota con coste NULL.
const MODEL = process.env.CROMA_MODEL?.trim() || "claude-haiku-4-5-20251001";
/** Llamadas al modelo por persona y día (UTC). Un reintento cuenta. */
const TECHO_DIARIO = 20;
const MAX_IMAGEN_B64 = 1_600_000;
const MANEJOS = new Set(["", "orgánico", "convencional", "en transición"]);

const reglas = reglasJson as unknown as Reglas;

type Respuesta = Record<string, unknown>;
const responder = (status: number, cuerpo: Respuesta) =>
  NextResponse.json(cuerpo, { status, headers: { "cache-control": "no-store" } });

type Entrada = {
  imagen: { media_type: "image/jpeg" | "image/png" | "image/webp"; data: string };
  rasgos: Rasgos;
  contexto: ContextoMuestra;
  ford: FordProgramatico | null;
  rasgosVersion: string;
};

const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const esNum = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const esRango = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n) && n >= 1 && n <= 5);

/** El cuerpo viene del navegador: se sanea TODO antes de que llegue al prompt. */
function leerEntrada(body: unknown): { ok: true; entrada: Entrada } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  const m = typeof b.imagen === "string" ? b.imagen.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/) : null;
  if (!m) return { ok: false, error: "Falta la imagen del cromatograma (JPEG, PNG o WebP)." };
  if (m[2].length > MAX_IMAGEN_B64) return { ok: false, error: "La imagen pesa demasiado; la herramienta la reduce antes de enviarla." };

  // La compuerta corrió en el navegador. El servidor no la repite (no decodifica
  // imágenes), pero exige su veredicto: una foto rechazada no se interpreta.
  const validacion = (b.validacion ?? {}) as Record<string, unknown>;
  if (validacion.valida !== true) return { ok: false, error: "La foto no pasó la compuerta de validación; no se interpreta." };

  const r = (b.rasgos ?? null) as Rasgos | null;
  if (!r || typeof r !== "object") return { ok: false, error: "Faltan los rasgos medidos." };
  if (JSON.stringify(r).length > 40_000) return { ok: false, error: "Los rasgos medidos no tienen el formato esperado." };
  const fr = r.zone_boundaries_rel;
  const rasgosOk =
    esNum(r.radiality_index, 0, 1) &&
    esNum(r.symmetry_score, 0, 1) &&
    Array.isArray(fr) &&
    fr.length === 3 &&
    fr.every((v, i) => esNum(v, 0, 1) && (i === 0 || v > fr[i - 1])) &&
    Array.isArray(r.radial_profile_lab) &&
    r.radial_profile_lab.length <= 60 &&
    typeof r.zone_colour_median_lab === "object" &&
    typeof r.capture_quality === "object";
  if (!rasgosOk) return { ok: false, error: "Los rasgos medidos no tienen el formato esperado." };

  const c = (b.contexto ?? {}) as Record<string, unknown>;
  const manejo = txt(c.manejo, 30);
  const fecha = txt(c.fecha_muestra, 10);
  const altitud = c.altitud_m === null || c.altitud_m === undefined || c.altitud_m === "" ? null : Number(c.altitud_m);
  if (!MANEJOS.has(manejo)) return { ok: false, error: "Manejo no reconocido." };
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: "Fecha de la muestra inválida." };
  if (altitud !== null && !esNum(altitud, 0, 4500)) return { ok: false, error: "Altitud fuera de rango." };

  const f = (b.ford_programatico ?? null) as Record<string, unknown> | null;
  const ford = f && esRango(f.canales) && esRango(f.picos) && esRango(f.intensidad) ? (f as unknown as FordProgramatico) : null;

  return {
    ok: true,
    entrada: {
      imagen: { media_type: m[1] as Entrada["imagen"]["media_type"], data: m[2] },
      rasgos: r,
      // Sin nombre de finca, sin lote, sin coordenadas: el modelo no los necesita.
      contexto: {
        departamento: txt(c.departamento, 60),
        municipio: txt(c.municipio, 80),
        altitud_m: altitud,
        variedad: txt(c.variedad, 60),
        manejo,
        fecha_muestra: fecha,
        practicas: txt(c.practicas, 600),
      },
      ford,
      rasgosVersion: txt(b.rasgos_version, 40),
    },
  };
}

type Mensaje = { role: "user" | "assistant"; content: unknown };

async function llamar(apiKey: string, system: string, messages: Mensaje[], actorId: string) {
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({ model: MODEL, max_tokens: 3000, temperature: 0, system, messages }),
    });
  } catch (e) {
    void registrarConsumo({
      proveedor: "anthropic",
      modelo: MODEL,
      superficie: USOS.herramientasCromatografia,
      uso: { tokens_entrada: 0, tokens_salida: 0 },
      ok: false,
      error: e instanceof Error ? e.message : "fetch falló",
      duracionMs: Date.now() - t0,
      actorId,
    });
    return { ok: false as const, error: "El lector no respondió (red o tiempo agotado). Intente de nuevo." };
  }
  const json = (await res.json().catch(() => null)) as {
    content?: { type: string; text?: string }[];
    usage?: unknown;
    error?: { message?: string };
  } | null;
  void registrarConsumo({
    proveedor: "anthropic",
    modelo: MODEL,
    superficie: USOS.herramientasCromatografia,
    uso: usoDesdeAnthropic(json?.usage),
    ok: res.ok,
    error: res.ok ? null : json?.error?.message ?? `HTTP ${res.status}`,
    duracionMs: Date.now() - t0,
    actorId,
  });
  if (!res.ok) {
    // El detalle del proveedor va al libro de consumo, no a la pantalla.
    return { ok: false as const, error: "El servicio de lectura no está disponible ahora. Los rasgos medidos siguen siendo válidos." };
  }
  return { ok: true as const, texto: json?.content?.find((c) => c.type === "text")?.text?.trim() ?? "" };
}

export async function POST(request: NextRequest) {
  // 1 · Sesión
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return responder(401, { ok: false, codigo: "sin-cuenta", error: MOTIVO_COPY["sin-cuenta"] });

  // 2 · Veredicto de acceso a ESTA herramienta (la misma regla que la concha)
  const service = createServiceRoleClient();
  const { data: tool } = await service
    .from("tools")
    .select("tier")
    .eq("id", TOOL_ID)
    .eq("clase", "compartible")
    .is("archivado_at", null)
    .maybeSingle();
  if (!tool) return responder(404, { ok: false, codigo: "sin-herramienta", error: "La herramienta no está disponible." });
  const veredicto = puedeAbrir(await contextoDeAcceso(), TOOL_ID, (tool as { tier: "default" | "plus" }).tier);
  if (!veredicto.abre) return responder(403, { ok: false, codigo: veredicto.motivo, error: MOTIVO_COPY[veredicto.motivo] });

  // 3 · Reglas completas (kickoff §9.1: sin un campo obligatorio no se arranca)
  const faltan = faltantesEnReglas(reglas);
  if (faltan.length) {
    console.error("[cromatografia] reglas incompletas:", faltan.join(", "));
    return responder(500, { ok: false, codigo: "reglas", error: "Las reglas de interpretación están incompletas; la lectura queda en pausa." });
  }

  // 4 · Clave: sin ella nada revienta, la herramienta sigue dando rasgos.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return responder(503, { ok: false, codigo: "sin-ia", error: "La lectura con IA no está configurada. Los rasgos medidos siguen siendo válidos." });
  }

  // 5 · Entrada
  const cuerpo = await request.json().catch(() => null);
  const leida = leerEntrada(cuerpo);
  if (!leida.ok) return responder(400, { ok: false, codigo: "entrada", error: leida.error });
  const { imagen, rasgos, contexto, ford, rasgosVersion } = leida.entrada;

  // 6 · Techo diario por persona
  const desde = new Date();
  desde.setUTCHours(0, 0, 0, 0);
  const { count } = await service
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", user.id)
    .eq("superficie", USOS.herramientasCromatografia)
    .gte("creado_en", desde.toISOString());
  if ((count ?? 0) >= TECHO_DIARIO) {
    return responder(429, { ok: false, codigo: "techo", error: `Ya usó las ${TECHO_DIARIO} lecturas de hoy. Mañana se renuevan.` });
  }

  // 7 · Lectura, con UNA corrección si no pasa los controles
  const regional = reglaRegional(reglas, contexto.departamento);
  const system = ensamblarSistema(reglas, regional);
  const messages: Mensaje[] = [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: imagen.media_type, data: imagen.data } },
        { type: "text", text: ensamblarUsuario(contexto, rasgos, regional, ford) },
      ],
    },
  ];

  let errores: string[] = [];
  for (let intento = 1; intento <= 2; intento++) {
    const r = await llamar(apiKey, system, messages, user.id);
    if (!r.ok) return responder(502, { ok: false, codigo: "ia", error: r.error });
    const v = validarSalida(extraerJson(r.texto), reglas, rasgos, regional);
    if (v.ok) {
      return responder(200, {
        ok: true,
        reporte: v.reporte,
        meta: {
          prompt_version: PROMPT_VERSION,
          rules_version: reglas.$schema_version,
          rasgos_version: rasgosVersion || null,
          model_name: MODEL,
          timestamp: new Date().toISOString(),
          intentos: intento,
        },
      });
    }
    errores = v.errores;
    messages.push(
      { role: "assistant", content: r.texto || "{}" },
      {
        role: "user",
        content: `Tu respuesta no superó los controles del lector:\n- ${errores.join("\n- ")}\nDevuelve el JSON COMPLETO corregido con el mismo esquema, solo el JSON.`,
      }
    );
  }

  console.warn("[cromatografia] lectura rechazada por los controles:", errores.join(" | "));
  return responder(422, {
    ok: false,
    codigo: "controles",
    error: "La lectura no superó los controles de honestidad del lector y no se muestra. Puede intentarlo de nuevo.",
    detalles: errores.slice(0, 8),
  });
}
