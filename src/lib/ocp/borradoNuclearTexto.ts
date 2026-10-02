// ── El borrado nuclear · lo que se dice y lo que se pide (V5.134, owner 2026-10-01) — PURO ───────────────────────────
// «Dame ese "Botón Nuclear", el cual tenga doble confirmación y le mande un mensaje al Productor que le anuncie que hubo
// esta operación unilateral por cuestiones del sistema.» Aquí vive lo que NO toca la base: la frase que el operador tiene
// que escribir, los rótulos del inventario y el texto del aviso. El borrado en sí es de la base (`nuclear_borrar`, acta en
// `docs/migraciones/2026-10-01_borrado_nuclear.sql`); quien lo llama es `borradoNuclear.ts`.

export type TipoNuclear = "lote" | "finca";

export const TIPO_NUCLEAR_LABEL: Record<TipoNuclear, string> = { lote: "Lote", finca: "Finca" };

/** El motivo es interno (queda en el archivo, no se le enseña al productor) y es obligatorio. */
export const MOTIVO_MINIMO = 10;

/** La SEGUNDA confirmación: escribir esta frase exacta, con el código del lote o la finca. */
export function fraseNuclear(codigo: string): string {
  return `BORRAR ${codigo}`;
}

/** Lo que devuelve `nuclear_inventario`: lo que la pantalla enseña en la PRIMERA confirmación. */
export type InventarioNuclear = {
  tipo: TipoNuclear;
  id: string;
  nombre: string;
  producer_id: string | null;
  lotes: { id: string; name: string }[];
  conteos: Record<string, number>;
  bloqueos: string[];
  archivos: number;
};

/** Cada tabla de la instantánea, dicha en palabras. Una que no esté aquí se enseña con su nombre (nunca se esconde). */
export const ROTULO_DE_TABLA: Record<string, string> = {
  fincas: "Finca",
  finca_parcelas: "Cafetales (parcelas)",
  finca_certificates: "Certificados de la finca",
  terratalento_jornadas: "Jornadas de Terratalento",
  terratalento_postulaciones: "Postulaciones a esas jornadas",
  lots: "Lotes",
  lot_contributions: "Aportes de finca al lote",
  lot_fichas: "Fichas técnicas emitidas",
  lot_referencias: "Referencias, fotos y videos agregados por el productor",
  ficha_completion_snapshots: "Avances de la Ficha",
  arena_inscriptions: "Solicitudes de evaluación (con su factura y su pago)",
  arena_entry_codes: "Códigos de subvención usados (quedan sin lote)",
  arena_scores: "Puntajes de Arena",
  arena_session_lots: "Participaciones en sesiones de Arena",
  muestras: "Muestras",
  muestra_movimientos: "Movimientos de muestras",
  lot_evaluations: "Evaluaciones (Q-Grader, Arena, reportadas)",
  lot_offers: "Ofertas",
  black_negotiations: "Negociaciones",
  purchase_contracts: "Contratos",
  contract_months: "Meses de contrato",
  contract_releases: "Liberaciones de contrato",
  humidity_readings: "Lecturas de humedad",
  compras: "Compras",
  ctcx_selection_lotes: "Entradas de CTCx Selection",
  lot_listings: "Publicaciones en el catálogo",
  lot_auctions: "Subastas",
  producer_comm_log: "Mensajes con el productor sobre esto",
  audit_log: "Rastro de auditoría",
};

/** Los conteos en el orden en que se leen: la entidad primero, luego lo demás de mayor a menor. */
export function conteosOrdenados(conteos: Record<string, number>): { tabla: string; rotulo: string; n: number }[] {
  const primero = ["fincas", "lots"];
  return Object.entries(conteos)
    .map(([tabla, n]) => ({ tabla, rotulo: ROTULO_DE_TABLA[tabla] ?? tabla, n }))
    .sort((a, b) => {
      const ia = primero.indexOf(a.tabla);
      const ib = primero.indexOf(b.tabla);
      if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      return b.n - a.n || a.rotulo.localeCompare(b.rotulo, "es");
    });
}

/** Lo que se le dice al productor. NO lleva el motivo interno: dice lo que pasó, que fue CTCx y que no tiene que hacer nada. */
export function avisoAlProductor(o: { tipo: TipoNuclear; nombre: string; codigo: string; lotes: string[]; productor: string | null }): { nota: string; subject: string; text: string } {
  const que = o.tipo === "finca" ? `la finca «${o.nombre}» (${o.codigo})` : `el lote «${o.nombre}» (${o.codigo})`;
  const conLotes = o.tipo === "finca" && o.lotes.length ? ` y ${o.lotes.length === 1 ? "su lote" : `sus ${o.lotes.length} lotes`} (${o.lotes.join(", ")})` : "";
  const nota =
    `CTCx retiró de la plataforma ${que}${conLotes}, con toda su información. ` +
    "Fue una operación unilateral de CTCx por razones del sistema: no se debe a nada que usted haya hecho y no requiere ninguna acción de su parte. " +
    "Si quiere registrarlo de nuevo puede hacerlo desde su panel, y si tiene preguntas responda a este mensaje.";
  return {
    nota,
    subject: `CTCx retiró ${o.tipo === "finca" ? "una finca" : "un lote"} de su cuenta en Kaffetal Regal`,
    text: [
      `Hola${o.productor ? ` ${o.productor}` : ""},`,
      "",
      `Le escribimos para avisarle que CTCx retiró de la plataforma ${que}${conLotes}, con toda la información que tenía registrada.`,
      "",
      "Fue una operación unilateral de CTCx por razones del sistema. No se debe a nada que usted haya hecho y no requiere ninguna acción de su parte.",
      "",
      "Si quiere registrarlo de nuevo, puede hacerlo desde su panel de Kaffetal Regal. Y si tiene cualquier pregunta, responda a este correo o escríbanos desde «Mensajes y Notificaciones».",
      "",
      "Un abrazo,",
      "Colombian Trading Company · CTCx",
      "info@ctcexport.com",
    ].join("\n"),
  };
}
