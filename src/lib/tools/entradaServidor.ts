import "server-only";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { AVISO, combinarRegistro, type FincaPrefill, type LotePrefill, type RefRegistro, type RegistroPrefill } from "./entrada";

// ── TAR-121 · `?finca=` y `?lote=` del taller, resueltos CONTRA LA CUENTA ──────────────────────────────────────────────────
// La mitad servidor de `entrada.ts`. La regla es una sola y va en la CONSULTA, no en el render: una finca o un lote solo
// se leen si `producer_id` es la cuenta que tiene la sesión. `fincas` y `lots` se leen con el cliente de servicio (como la
// ruta `/api/herramientas/cromatografia/fincas`), así que el filtro por dueño ES la compuerta: sin él, un enlace con el id
// de otro productor le prellenaría la herramienta con datos ajenos.
//
// Lo que sale de aquí es lo que la persona ya ve en su propio panel de Kaffetal Regal (nombre, municipio, departamento,
// altitud; variedad y proceso del lote) — nada de coordenadas, polígonos, documentos ni precios.
//
// «No existe» y «no es suyo» dan el MISMO aviso: la URL no es un oráculo para saber qué ids existen.
//
// No es una server action (sin la directiva de servidor): solo la llama la página del taller en el servidor. Así no queda un
// endpoint que cualquiera pueda invocar con ids arbitrarios.
//
// V6.23 (TAR-149): una referencia se busca por su COLUMNA (`fincas.codigo`, `lots.public_code`), con el mismo filtro por dueño en
// la misma consulta; nunca se calcula un código en memoria. Los códigos son únicos, así que la consulta trae uno o ninguno.

type FilaFinca = {
  id: string;
  // V6.23 (TAR-149): el código guardado de la finca.
  codigo: string | null;
  producer_id: string;
  name: string;
  municipio: string | null;
  departamento: string | null;
  /** V5.127: el país de una finca fuera de Colombia; `null` = Colombia. */
  pais: string | null;
  altitude_m: number | null;
};

type FilaLote = {
  id: string;
  // V6.23 (TAR-149): el código guardado del lote; null = sin finca.
  public_code: string | null;
  name: string;
  ficha_variedad: string | null;
  ficha_proceso: string | null;
  ficha_altitud_m: number | null;
  fincas: FilaFinca | FilaFinca[] | null;
};

const COLS_FINCA = "id, codigo, producer_id, name, municipio, departamento, pais, altitude_m";
// Un id y un código son únicos: con dos filas pedidas, «una» es la respuesta y cualquier otra cosa no prellena nada.
const MAX_FILAS = 2;

const capitaliza = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : null);

function aFinca(f: FilaFinca): FincaPrefill {
  return {
    id: f.id,
    referencia: f.codigo,
    nombre: f.name,
    municipio: f.municipio,
    departamento: f.departamento,
    pais: f.pais,
    altitud_m: f.altitude_m,
  };
}

export type ResolucionEntrada = { registro: RegistroPrefill | null; avisos: string[] };

/**
 * Resuelve `?finca=` y `?lote=` contra la cuenta de la sesión. Sin sesión, o sin nada que resolver, `registro: null` y sin
 * avisos (la concha ya le dice a quien no entró que entre). Nunca lanza: un fallo de la base deja la herramienta vacía.
 */
export async function resolverEntrada(finca: RefRegistro | null, lote: RefRegistro | null): Promise<ResolucionEntrada> {
  if (!finca && !lote) return { registro: null, avisos: [] };

  let userId: string | null = null;
  try {
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return { registro: null, avisos: [] };

  const service = createServiceRoleClient();
  const avisos: string[] = [];

  let fincaRes: FincaPrefill | null = null;
  if (finca) {
    try {
      let q = service.from("fincas").select(COLS_FINCA).eq("producer_id", userId).neq("status", "rejected");
      q = finca.tipo === "uuid" ? q.eq("id", finca.valor) : q.eq("codigo", finca.valor);
      const { data } = await q.limit(MAX_FILAS);
      const filas = (data as FilaFinca[] | null) ?? [];
      if (filas.length === 1) fincaRes = aFinca(filas[0]);
    } catch {
      fincaRes = null;
    }
    if (!fincaRes) avisos.push(AVISO.fincaAjena);
  }

  let loteRes: LotePrefill | null = null;
  if (lote) {
    try {
      let q = service
        .from("lots")
        .select(`id, public_code, name, ficha_variedad, ficha_proceso, ficha_altitud_m, fincas(${COLS_FINCA})`)
        .eq("producer_id", userId);
      q = lote.tipo === "uuid" ? q.eq("id", lote.valor) : q.eq("public_code", lote.valor);
      const { data } = await q.limit(MAX_FILAS);
      const filas = (data as FilaLote[] | null) ?? [];
      // Uno o nada: mejor la herramienta vacía que el lote equivocado.
      if (filas.length === 1) {
        const l = filas[0];
        const f = Array.isArray(l.fincas) ? l.fincas[0] : l.fincas;
        loteRes = {
          referencia: l.public_code,
          nombre: l.name,
          variedad: capitaliza(l.ficha_variedad),
          proceso: capitaliza(l.ficha_proceso),
          altitud_m: l.ficha_altitud_m,
          // La finca del lote también tiene que ser de la cuenta: el embed no filtra por dueño, así que se comprueba aquí.
          finca: f && f.producer_id === userId ? aFinca(f) : null,
        };
      }
    } catch {
      loteRes = null;
    }
    if (!loteRes) avisos.push(AVISO.loteAjeno);
  }

  // El lote trae su finca: si la del enlace es otra, manda la del lote (y se avisa). Regla pura, en `entrada.ts`.
  const junto: { registro: RegistroPrefill | null; avisos: string[] } = combinarRegistro(fincaRes, loteRes);
  return { registro: junto.registro, avisos: [...avisos, ...junto.avisos] };
}
