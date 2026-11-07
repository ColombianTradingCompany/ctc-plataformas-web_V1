"use client";

import { createContext, useContext } from "react";
import { codigoDelLote } from "../codigoDelLote";

// El código del lote en las pestañas del panel. (Movida de AppDashboard a esta carpeta en V5.16: la usan varias pestañas.)
// V6.23 (owner, 2026-11-06, TAR-149): el código es el GUARDADO del lote (`Lot.codigo` = `lots.public_code`), nunca uno derivado del
// id; va entero en negrita porque es lo que va en el paquete. Un lote sin finca no tiene código: se dice qué le falta
// (`codigoDelLote`). Las tarjetas de ofertas y contratos solo traen el id del lote: leen el código del mapa `CodigosDeLotes`, que
// arma la pestaña con los lotes del propio productor.

/** Los códigos guardados de los lotes del productor, por id del lote. */
export const CodigosDeLotes = createContext<ReadonlyMap<string, string | null>>(new Map());

/** El código guardado de un lote del productor (null = sin finca, sin código). */
export function useCodigoDeLote(lotId: string): string | null {
  return useContext(CodigosDeLotes).get(lotId) ?? null;
}

export function CtcRef({ codigo }: { codigo: string | null }) {
  return codigo ? (
    <span className="mono">
      <b style={{ color: "var(--ink)" }}>{codigo}</b>
    </span>
  ) : (
    <span style={{ fontStyle: "italic" }}>{codigoDelLote(null)}</span>
  );
}

/** `CtcRef` para una tarjeta que solo trae el id del lote (una oferta o un contrato). */
export function CtcRefDeLote({ lotId }: { lotId: string }) {
  return <CtcRef codigo={useCodigoDeLote(lotId)} />;
}
