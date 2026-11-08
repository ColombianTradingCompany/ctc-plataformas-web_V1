import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import type { LecturaDeContactos } from "./nucleo";
import { RESULTADOS, type Contacto, type DefinicionDeRonda, type LoteDeObjetivo, type Objetivo, type Respuestas, type ResultadoDeContacto, type Selector } from "./tipos";

// ── CTCx OS · Rondas · la lectura · SOLO SERVIDOR y SOLO LECTURA ─────────────
// Lee, con el service role y solo en el servidor, lo que una ronda necesita de sus Personajes: los lotes (las columnas de sus
// pedidos y la PRESENCIA de cinco secciones de la Ficha, nunca el datasheet entero), sus fincas (si tienen polígono EUDR, nunca
// las coordenadas), el último avance de la Ficha, el código guardado del productor, su contacto (por `fetchProducerContacts`, el
// MISMO lector que pinta la línea de contacto del OCP) y la bitácora de la ronda (`ronda_contactos`) con el nombre de
// quien anotó. Es el ÚNICO archivo del OS que lee nombres y teléfonos de personas: una ronda existe para llamar a alguien
// (`qa-os-check` R fija sus tablas y columnas). Nunca lanza y nunca escribe: el escritor es `src/app/ocp/(app)/rondasActions.ts`.
//
// Sin la tabla `ronda_contactos` (su migración, `docs/migraciones/2026-11-07_ronda_contactos.sql`, se aplica en la sesión del
// owner) la ronda se pinta igual, con la bitácora «sin registro»: nadie aparece hecho y «Registrar respuesta» lo dice.

export type LecturaDeRonda =
  | { ok: true; objetivos: Objetivo[]; contactos: Contacto[] | null; lecturaContactos: LecturaDeContactos; truncado: boolean }
  | { ok: false };

type FilaDeLote = {
  id: string;
  producer_id: string;
  finca_id: string | null;
  public_code: string | null;
  name: string;
  stage: string;
  grade: string | null;
  sample_shipped_at: string | null;
  sample_2kg_confirmed_at: string | null;
  existencia_cps_kg: number | string | null;
  ficha_a1: string | null;
  ficha_a2: unknown;
  ficha_a3_premios: string | null;
  ficha_a3_origen: string | null;
  ficha_b1: unknown;
};
type FilaDeFinca = { id: string; codigo: string | null; name: string; status: string; poligono_v3: unknown; eudr_polygon: unknown };
type FilaDeContacto = {
  id: string;
  producer_id: string;
  resultado: string;
  volver_el: string | null;
  nota: string | null;
  respuestas: unknown;
  aplicadas: unknown;
  registrado_por: string | null;
  registrado_at: string;
};

const hayTexto = (v: string | null | undefined) => typeof v === "string" && v.trim().length > 0;
const hayLista = (v: unknown) => Array.isArray(v) && v.length > 0;
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** La forma de `respuestas` sin fiarse de la fila: solo números y textos, por lote y del productor. */
function respuestasDe(v: unknown): Respuestas {
  const limpio = (o: unknown) =>
    Object.fromEntries(Object.entries(esObjeto(o) ? o : {}).filter(([, x]) => typeof x === "string" || typeof x === "number")) as Record<string, string | number>;
  const lotes = esObjeto(v) && esObjeto(v.lotes) ? v.lotes : {};
  return {
    lotes: Object.fromEntries(Object.entries(lotes).map(([k, o]) => [k, limpio(o)])),
    productor: limpio(esObjeto(v) ? v.productor : null),
  };
}

/** El selector «productores_con_lotes»: cada productor con al menos un lote, con sus lotes. */
async function productoresConLotes(service: ReturnType<typeof createServiceRoleClient>) {
  const { data, error, count } = await service
    .from("lots")
    .select(
      "id, producer_id, finca_id, public_code, name, stage, grade, sample_shipped_at, sample_2kg_confirmed_at, existencia_cps_kg, ficha_a1:datasheet->>product_name, ficha_a2:datasheet->contributions, ficha_a3_premios:datasheet->>awards, ficha_a3_origen:datasheet->>about_origin, ficha_b1:datasheet->varieties",
      { count: "exact" },
    )
    .order("created_at", { ascending: true });
  if (error) return null;
  const lotes = (data as FilaDeLote[] | null) ?? [];
  const truncado = (count ?? 0) > lotes.length;
  const productores = [...new Set(lotes.map((l) => l.producer_id))];
  const fincaIds = [...new Set(lotes.map((l) => l.finca_id).filter((x): x is string => !!x))];
  const lotIds = lotes.map((l) => l.id);

  const [fincasR, avancesR, perfilesR, contactos] = await Promise.all([
    fincaIds.length
      ? service.from("fincas").select("id, codigo, name, status, poligono_v3:eudr_polygon_geojson->2, eudr_polygon", { count: "exact" }).in("id", fincaIds)
      : Promise.resolve({ data: [], error: null }),
    lotIds.length
      ? service.from("ficha_completion_snapshots").select("lot_id, completion_pct, recorded_at", { count: "exact" }).in("lot_id", lotIds).order("recorded_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    productores.length
      ? service.from("producer_profiles").select("profile_id, codigo", { count: "exact" }).in("profile_id", productores)
      : Promise.resolve({ data: [], error: null }),
    fetchProducerContacts(service, productores),
  ]);

  const fincas = new Map(((fincasR.data as FilaDeFinca[] | null) ?? []).map((f) => [f.id, f]));
  const avance = new Map<string, number>();
  for (const s of (avancesR.data as { lot_id: string; completion_pct: number }[] | null) ?? []) if (!avance.has(s.lot_id)) avance.set(s.lot_id, s.completion_pct);
  const codigoDe = new Map(((perfilesR.data as { profile_id: string; codigo: string | null }[] | null) ?? []).map((p) => [p.profile_id, p.codigo]));

  const objetivos: Objetivo[] = productores.map((id) => {
    const c = contactos.get(id);
    const nombre = c?.fullName?.trim() || c?.companyName?.trim() || "Productor sin nombre";
    const lotesDe: LoteDeObjetivo[] = lotes
      .filter((l) => l.producer_id === id)
      .map((l) => {
        const f = l.finca_id ? fincas.get(l.finca_id) : undefined;
        return {
          id: l.id,
          nombre: l.name,
          codigo: l.public_code,
          etapa: l.stage,
          grado: l.grade,
          muestraEnviada: !!l.sample_shipped_at,
          muestraRecibida: !!l.sample_2kg_confirmed_at,
          existenciaKg: l.existencia_cps_kg != null ? Number(l.existencia_cps_kg) : null,
          fichaPct: avance.get(l.id) ?? null,
          fichaSecciones: {
            a1: hayTexto(l.ficha_a1),
            a2: hayLista(l.ficha_a2),
            a3: hayTexto(l.ficha_a3_premios) || hayTexto(l.ficha_a3_origen),
            a5: !!l.finca_id,
            b1: hayLista(l.ficha_b1),
          },
          finca: f ? { id: f.id, nombre: f.name, codigo: f.codigo, estado: f.status, conPoligono: f.poligono_v3 != null || f.eudr_polygon != null } : null,
        };
      });
    return {
      productorId: id,
      codigo: codigoDe.get(id) ?? null,
      nombre,
      nombreCorto: c?.fullName?.trim() ? c.fullName.trim().split(/\s+/)[0] : nombre,
      empresa: c?.companyName ?? null,
      telefono: c?.phone ?? null,
      whatsappConfirmado: c?.whatsappConfirmed ?? false,
      lotes: lotesDe,
    };
  });
  return { objetivos, truncado };
}

const SELECTORES_DE_LECTURA: Record<Selector, typeof productoresConLotes> = { productores_con_lotes: productoresConLotes };

/** La bitácora de una ronda, con el nombre de quien anotó. Sin la tabla (migración sin aplicar): «sin_registro». */
async function leerContactos(service: ReturnType<typeof createServiceRoleClient>, slug: string): Promise<{ lectura: LecturaDeContactos; contactos: Contacto[] | null }> {
  const { data, error } = await service
    .from("ronda_contactos")
    .select("id, producer_id, resultado, volver_el, nota, respuestas, aplicadas, registrado_por, registrado_at", { count: "exact" })
    .eq("ronda", slug)
    .order("registrado_at", { ascending: false });
  if (error) return { lectura: error.code === "42P01" || error.code === "PGRST205" ? "sin_registro" : "fallo", contactos: null };
  const filas = (data as FilaDeContacto[] | null) ?? [];
  const quienes = [...new Set(filas.map((f) => f.registrado_por).filter((x): x is string => !!x))];
  const nombres = new Map<string, string>();
  if (quienes.length) {
    // El nombre del perfil (`profiles.full_name`), no `panel_users`: los permisos se leen en un solo sitio (`qa-permisos-legibles`).
    const { data: pf } = await service.from("profiles").select("id, full_name", { count: "exact" }).in("id", quienes);
    for (const p of (pf as { id: string; full_name: string | null }[] | null) ?? []) if (p.full_name) nombres.set(p.id, p.full_name);
  }
  const contactos: Contacto[] = filas
    .filter((f) => (RESULTADOS as readonly string[]).includes(f.resultado))
    .map((f) => ({
      id: f.id,
      productorId: f.producer_id,
      resultado: f.resultado as ResultadoDeContacto,
      volverEl: f.volver_el,
      nota: f.nota,
      respuestas: respuestasDe(f.respuestas),
      aplicadas: Object.fromEntries(Object.entries(esObjeto(f.aplicadas) ? f.aplicadas : {}).filter(([, x]) => typeof x === "string")) as Record<string, string>,
      registradoPor: f.registrado_por ? (nombres.get(f.registrado_por) ?? null) : null,
      registradoAt: f.registrado_at,
    }));
  return { lectura: "leidos", contactos };
}

/** Todo lo que pinta una ronda. Nunca lanza: si los Personajes no se pueden leer, `{ ok: false }` y la vista lo dice. */
export async function leerRonda(def: DefinicionDeRonda): Promise<LecturaDeRonda> {
  try {
    const service = createServiceRoleClient();
    const [personajes, bitacora] = await Promise.all([SELECTORES_DE_LECTURA[def.quien.selector](service), leerContactos(service, def.slug)]);
    if (!personajes) return { ok: false };
    return { ok: true, objetivos: personajes.objetivos, contactos: bitacora.contactos, lecturaContactos: bitacora.lectura, truncado: personajes.truncado };
  } catch {
    return { ok: false };
  }
}
