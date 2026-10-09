// ── Las referencias de Empacado hasta FOB, como las leen el ECP y el Triage de Catálogo Activo (V5.194) ──────────────────────
// Una referencia es un cálculo de `empaqueFob.ts` con nombre, CONGELADO en `empaque_fob_referencias` (solo se retira). Este módulo
// no tiene compuerta: lo llama una página o una acción que ya pasó la suya, con el cliente de service role.

import type { SupabaseClient } from "@supabase/supabase-js";
import { destinoDe, modoDe, normalizaParametros, type ParametrosEmpaqueFob } from "./empaqueFob";

/** Dónde vive la herramienta (la ruta se conservó al cambiar la herramienta, V5.194: los talones viejos siguen apuntando aquí). */
export const EMPACADO_PATH = "/ecp/cotizador-empaque";

export type ReferenciaEmpaque = {
  id: string;
  codigo: string;
  nombre: string;
  modo: string;
  modoNombre: string;
  destino: string;
  destinoNombre: string;
  incoterm: "FOB" | "FCA";
  kgEmbarque: number;
  trm: number;
  copKg: number;
  usdKg: number;
  estado: "vigente" | "retirada";
  parametros: ParametrosEmpaqueFob;
  avisos: string[];
  creadaEl: string;
  retiradaEl: string | null;
  motivoRetiro: string | null;
};

export const COLUMNAS_REFERENCIA = "id, codigo, nombre, modo, destino, kg_embarque, trm, parametros, resultado, cop_kg, usd_kg, estado, created_at, retirada_at, retirada_motivo";

export type FilaReferencia = {
  id: string;
  codigo: string;
  nombre: string;
  modo: string;
  destino: string;
  kg_embarque: number | string;
  trm: number | string;
  parametros: unknown;
  resultado: unknown;
  cop_kg: number | string;
  usd_kg: number | string;
  estado: string;
  created_at: string;
  retirada_at: string | null;
  retirada_motivo: string | null;
};

export function filaAReferencia(r: FilaReferencia): ReferenciaEmpaque {
  const destino = destinoDe(r.destino);
  const resultado = (r.resultado && typeof r.resultado === "object" ? r.resultado : {}) as { avisos?: unknown };
  return {
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    modo: r.modo,
    modoNombre: modoDe(r.modo)?.nombre ?? r.modo,
    destino: r.destino,
    destinoNombre: destino?.nombre ?? r.destino,
    incoterm: destino?.incoterm ?? "FOB",
    kgEmbarque: Number(r.kg_embarque),
    trm: Number(r.trm),
    copKg: Number(r.cop_kg),
    usdKg: Number(r.usd_kg),
    estado: r.estado === "retirada" ? "retirada" : "vigente",
    parametros: normalizaParametros(r.parametros),
    avisos: Array.isArray(resultado.avisos) ? resultado.avisos.filter((a): a is string => typeof a === "string") : [],
    creadaEl: r.created_at,
    retiradaEl: r.retirada_at,
    motivoRetiro: r.retirada_motivo,
  };
}

/** Las referencias, la más nueva primero. `soloVigentes` para quien elige una (el Triage). */
export async function cargarReferenciasEmpaque(service: SupabaseClient, opciones: { soloVigentes?: boolean } = {}): Promise<ReferenciaEmpaque[]> {
  let q = service.from("empaque_fob_referencias").select(COLUMNAS_REFERENCIA).order("created_at", { ascending: false }).limit(200);
  if (opciones.soloVigentes) q = q.eq("estado", "vigente");
  const { data } = await q;
  return ((data as FilaReferencia[] | null) ?? []).map(filaAReferencia);
}
