// ── CRM CP Green · la etapa de un comprador ─────────────────────────────────
// Módulo PURO y sin `server-only` a propósito: la regla la corre el servidor al
// pintar el tablero, pero también la comprueba un guardián de QA sin levantar
// una consola que vive detrás de 2FA. Mismo patrón que `lib/panel/navActivo.ts`
// y `lib/grados/definicion.ts`.
//
// LA REGLA (decisión D3.2 del plan V5): la etapa se DEDUCE de los pedidos, que
// es el único hecho que no admite discusión.
//
//     0 pedidos  → nuevo
//     1 pedido   → activo
//     2 o más    → recurrente
//
// Y se puede ANULAR A MANO, porque hay cosas que ningún contador sabe: «este
// comprador es recurrente aunque solo lleve un pedido, acabamos de firmar con
// él para la cosecha entera».
//
// ⚠️ LO QUE NO SE HACE, Y ES LA DECISIÓN DE DISEÑO: la etapa deducida **no se
// guarda**. En la base solo vive el anulado manual (`buyer_profiles.crm_stage`,
// nullable). Persistir la etapa calculada es el error clásico de este tipo de
// tablero: en cuanto entra el segundo pedido, la fila conserva la etapa vieja y
// hace falta acordarse de recalcularla en cada camino que toque `orders`. Así
// no hay nada que recalcular — la regla se evalúa al leer.

export const ETAPAS_CRM = ["nuevo", "activo", "recurrente"] as const;
export type EtapaCrm = (typeof ETAPAS_CRM)[number];

export const ETAPA_LABEL: Record<EtapaCrm, string> = {
  nuevo: "Nuevo",
  activo: "Activo",
  recurrente: "Recurrente",
};

/** La etapa que dictan los pedidos, sin mirar anulados. */
export function etapaPorPedidos(pedidos: number): EtapaCrm {
  if (pedidos >= 2) return "recurrente";
  if (pedidos === 1) return "activo";
  return "nuevo";
}

export function esEtapaValida(v: string): v is EtapaCrm {
  return (ETAPAS_CRM as readonly string[]).includes(v);
}

export type EtapaResuelta = {
  etapa: EtapaCrm;
  /** La que dictarían los pedidos. Sirve para enseñar «la regla dice X». */
  sugerida: EtapaCrm;
  /** `true` si un humano la puso a mano y NO coincide con la regla. */
  anulada: boolean;
};

/**
 * La etapa que se pinta, y de dónde viene.
 *
 * `anulada` solo es `true` cuando el anulado **discrepa** de la regla: marcar a
 * mano lo mismo que ya decía el contador no es una excepción que merezca
 * señalarse en la interfaz, y tratarlo como tal llenaría el tablero de avisos
 * que no dicen nada.
 */
export function resuelveEtapa(pedidos: number, anulado: string | null): EtapaResuelta {
  const sugerida = etapaPorPedidos(pedidos);
  if (anulado && esEtapaValida(anulado)) {
    return { etapa: anulado, sugerida, anulada: anulado !== sugerida };
  }
  return { etapa: sugerida, sugerida, anulada: false };
}
