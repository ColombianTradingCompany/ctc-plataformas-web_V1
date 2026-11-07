import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// ── V6.23 (owner, 2026-11-06, TAR-149) · los códigos con que se arma el texto del contrato ─────────────────────────────────
// El texto del contrato (`contrato.ts`) cita el código del lote (`loteReferencia`) y, en el provisional, el del productor
// (`provisional.cuenta`). Desde la V6.23 esos códigos son GUARDADOS y jerárquicos (`lots.public_code`, `producer_profiles.codigo`),
// pero los contratos que ya existían se firmaron —o CTCx los aceptó provisionalmente— con los códigos de antes, y su huella SHA-256 es
// la de ESE texto. Por eso cada contrato guarda los códigos de su texto (`purchase_contracts.texto_codigo_lote` /
// `texto_codigo_productor`; la migración los llenó con los de antes) y la regla es una sola:
//   · si el contrato los tiene, el texto se arma SIEMPRE con ellos: la página del contrato, la vista previa de la ratificación y la
//     ratificación (que reusa los códigos con que nació el provisional);
//   · si no los tiene (un contrato que nace), se arma con los vigentes y se guardan en el contrato junto con su huella.
// `CONTRATO_VERSION` no cambia: el texto es el mismo, solo cambia de dónde sale el código. La aplicación nunca calcula un código.

export type CodigosDelTexto = { lote: string | null; productor: string | null };

/** Las dos columnas del contrato con los códigos de su texto (para sumarlas al `select`). */
export const COLUMNAS_DE_CODIGOS = "texto_codigo_lote, texto_codigo_productor";

export type CodigosGuardados = { texto_codigo_lote: string | null; texto_codigo_productor: string | null };

const limpio = (v: string | null | undefined) => (v ?? "").trim() || null;

/** Los códigos VIGENTES del lote y de su productor, leídos de sus filas. */
export async function codigosVigentes(service: SupabaseClient, lotId: string, producerId: string): Promise<CodigosDelTexto> {
  const [{ data: lote }, { data: perfil }] = await Promise.all([
    service.from("lots").select("public_code").eq("id", lotId).maybeSingle(),
    service.from("producer_profiles").select("codigo").eq("profile_id", producerId).maybeSingle(),
  ]);
  return {
    lote: limpio((lote as { public_code: string | null } | null)?.public_code),
    productor: limpio((perfil as { codigo: string | null } | null)?.codigo),
  };
}

/** Los códigos del texto: los GUARDADOS en el contrato si los tiene; si no, los vigentes. */
export function codigosDelTexto(guardados: Partial<CodigosGuardados> | null, vigentes: CodigosDelTexto): CodigosDelTexto {
  return {
    lote: limpio(guardados?.texto_codigo_lote) ?? vigentes.lote,
    productor: limpio(guardados?.texto_codigo_productor) ?? vigentes.productor,
  };
}

/** Los códigos del texto de un contrato que YA EXISTE: los que guardó; los vigentes solo si le falta alguno. */
export async function codigosDeLaFila(
  service: SupabaseClient,
  fila: Partial<CodigosGuardados> & { lot_id: string },
  producerId: string,
): Promise<CodigosDelTexto> {
  const guardados = codigosDelTexto(fila, { lote: null, productor: null });
  if (guardados.lote && guardados.productor) return guardados;
  return codigosDelTexto(fila, await codigosVigentes(service, fila.lot_id, producerId));
}

/** Lo que se escribe en el contrato en la MISMA escritura que guarda la huella. */
export function columnasDeCodigos(c: CodigosDelTexto): CodigosGuardados {
  return { texto_codigo_lote: c.lote, texto_codigo_productor: c.productor };
}
