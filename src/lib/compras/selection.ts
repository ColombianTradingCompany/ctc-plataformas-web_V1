// ── ¿Es CTCx Selection? · UNA sola regla para el OCP (V5.203, owner 2026-10-10) — PURO ────────────────────────────────────────
// El owner, 2026-10-10: «CTCx Compras no parece estar funcionando bien». El diagnóstico encontró TRES definiciones de «CTCx Selection»
// (bug B2 / hueco H2): la vitrina contaba solo las compras con destino 'selection'; /ocp/kr marcaba Selection con CUALQUIER compra (un
// saco «solo stock» hacía de un lote del productor un lote de CTCx); y el panel del productor tiene la suya. Esta es la del OCP: una
// compra hace del lote un CTCx Selection si es de Selection y no está anulada (V5.203: `compras.anulada_at`). La misma que las vistas
// públicas (`c.destino = 'selection' and c.anulada_at is null`). Sin red: la ejercita `qa-compras-check`.

export type CompraParaSelection = { destino: string | null | undefined; anulada_at?: string | null; anuladaAt?: string | null };

/** Una compra cuenta como CTCx Selection: destino 'selection' y viva (no anulada). */
export function esCompraSelection(c: CompraParaSelection | null | undefined): boolean {
  if (!c) return false;
  return c.destino === "selection" && !c.anulada_at && !c.anuladaAt;
}

/** Una compra viva (no anulada), sea del destino que sea. */
export function esCompraViva(c: { anulada_at?: string | null; anuladaAt?: string | null } | null | undefined): boolean {
  return !!c && !c.anulada_at && !c.anuladaAt;
}

/** Los lotes que la vitrina enseña con el perfil de CTCx: los que tienen al menos una compra Selection viva. */
export function lotesSelection(compras: readonly (CompraParaSelection & { lot_id: string })[]): Set<string> {
  return new Set(compras.filter(esCompraSelection).map((c) => c.lot_id));
}

// ── V5.203 · corrección (nodo final, 2026-10-10 · revisión de textos H11 y H14) ──────────────────────────────────────────────────
// H11: el mismo origen tenía tres nombres («Saco de ventana» · «Saco de trato por ventana» · «Compra solo stock» · «Solo Stock CTCx» ·
// «solo de stock»). Desde aquí, UN diccionario: Adquisición (`origenLegible`), el Stock CTCx y el Triage (`ETIQUETA_DE_ORIGEN`, que
// se arma con estas palabras) y los formularios dicen lo mismo. `qa-compras-check` vigila que nadie vuelva a escribir los viejos.
// H14: desde la V5.202 NINGÚN lote enseña la finca en la vitrina (el nombre es generado: variedades + proceso · región + año); la
// diferencia real entre un lote de CTCx Selection y uno del productor es el RÓTULO y la IMAGEN de CTCx frente a las fotos del lote.

/** El destino de una compra, en palabras del operador. */
export const DESTINO_LABEL: Record<"selection" | "stock", string> = { selection: "CTCx Selection", stock: "Solo stock" };

/** El origen de una compra o de una raíz del Stock CTCx, en las palabras del circuito. */
export const ORIGEN_LABEL = {
  saco: "Saco de trato por ventana",
  adelanto: "Adelanto de trato por ventana",
  vendido: "Vendido de un trato (a nombre del productor)",
  manual: "Compra a mano",
  ingreso: "Ingreso a mano",
  contrato: "Contrato",
  mes: (n: number) => `Mes ${n} del contrato`,
} as const;

/** Lo que ve el comprador en cada caso (Adquisición, el Triage, el Stock y CTCx Selection lo dicen con estas palabras). */
export const VITRINA_SEGUN_DESTINO: Record<"selection" | "stock", string> = {
  selection: "En la vitrina el lote sale con el rótulo y la imagen de CTCx Selection, no con las fotos del lote; la compra puede ir a mezclas.",
  stock: "En la vitrina el lote sale como lote del productor: con su nombre generado y, si CTCx las aprobó, sus fotos —sin el rótulo de CTCx—. Sirve para Sample Kits, sacos e inventario.",
};

/** Cuando OTRA compra Selection viva del mismo lote ya decide la vitrina (la marca va por lote, no por compra). */
export const VITRINA_YA_SELECTION = "El lote ya es CTCx Selection por otra compra: esto no cambia la vitrina.";

/** V5.203 (decisión 2 del nodo final): lo que se confirma al quitarle a un lote que sale en la vitrina su última compra Selection viva. */
export const AVISO_DEJA_SELECTION = "El lote dejará de salir como CTCx Selection: la vitrina enseñará su nombre generado y, si CTCx las aprobó, sus fotos.";
/** …y al hacer CTCx Selection un lote que ya sale en la vitrina como lote del productor (H7). */
export const AVISO_PASA_A_SELECTION = "El lote pasará a salir como CTCx Selection: la vitrina enseñará el rótulo y la imagen de CTCx en vez de sus fotos (el nombre generado no cambia).";

/** ¿Sale el lote en la vitrina pública? La MISMA condición que la vista `public_lot_vitrina` (V5.198 · V5.202): galardonado, con grado
 *  y no Tyrian, y con un trato por ventana vivo, café declarado vivo en el Catálogo Activo o una partida viva sin comprometer en el
 *  Stock CTCx. `qa-compras-check` compara esta regla con el WHERE de la vista. */
export function saleEnLaVitrina(l: { stage: string | null | undefined; grade: string | null | undefined; tratoVivo: boolean; declaracionViva: boolean; partidasLibres: number }): boolean {
  if (l.stage !== "galardonado" || !l.grade || l.grade === "tyrian") return false;
  return l.tratoVivo || l.declaracionViva || l.partidasLibres > 0;
}

/** Qué cambia en la vitrina un cambio de la marca Selection de un lote (null = nada que confirmar). Solo pide confirmación cuando un
 *  comprador pudo ver el lote ANTES y lo seguirá viendo DESPUÉS con otra cara: un lote que entra o sale de la vitrina no cambia de cara. */
export function cambioDeVitrina(e: { enVitrinaAntes: boolean; enVitrinaDespues: boolean; selectionAntes: boolean; selectionDespues: boolean }): string | null {
  if (!e.enVitrinaAntes || !e.enVitrinaDespues || e.selectionAntes === e.selectionDespues) return null;
  return e.selectionAntes ? AVISO_DEJA_SELECTION : AVISO_PASA_A_SELECTION;
}

/** Lo que la vitrina sabe de un lote en un momento: lo que lo hace salir y sus compras Selection vivas. La arma la carga de
 *  Adquisición (para pintar la confirmación) y la arma de nuevo cada acción con la base fresca (`leerVitrinaDelLote`): las dos pasan
 *  por las MISMAS funciones de abajo. */
export type FotoDeVitrina = {
  stage: string | null;
  grade: string | null;
  tratoVivo: boolean;
  declaracionViva: boolean;
  /** Las partidas VIVAS y sin comprometer del lote (ids). */
  partidasLibres: readonly string[];
  /** Las compras Selection VIVAS del lote (ids). */
  comprasSelectionVivas: readonly string[];
};

const sale = (v: FotoDeVitrina, sinPartida?: string | null) =>
  saleEnLaVitrina({ stage: v.stage, grade: v.grade, tratoVivo: v.tratoVivo, declaracionViva: v.declaracionViva, partidasLibres: v.partidasLibres.filter((id) => id !== sinPartida).length });

/** Anular una compra (y su raíz, que deja de contar): ¿cambia la cara del lote en la vitrina? */
export function cambioAlAnular(v: FotoDeVitrina, compraId: string, raizId: string | null): string | null {
  return cambioDeVitrina({
    enVitrinaAntes: sale(v),
    enVitrinaDespues: sale(v, raizId),
    selectionAntes: v.comprasSelectionVivas.length > 0,
    selectionDespues: v.comprasSelectionVivas.some((id) => id !== compraId),
  });
}

/** Cambiar «Es de» de una compra: ¿cambia la cara del lote en la vitrina? */
export function cambioAlDestinar(v: FotoDeVitrina, compraId: string, nuevo: "selection" | "stock"): string | null {
  const enVitrina = sale(v);
  return cambioDeVitrina({
    enVitrinaAntes: enVitrina,
    enVitrinaDespues: enVitrina,
    selectionAntes: v.comprasSelectionVivas.length > 0,
    selectionDespues: nuevo === "selection" || v.comprasSelectionVivas.some((id) => id !== compraId),
  });
}

/** Registrar a mano una compra nueva: ¿cambia la cara de un lote que ya sale en la vitrina? */
export function cambioAlRegistrar(v: FotoDeVitrina, destino: "selection" | "stock"): string | null {
  const enVitrina = sale(v);
  return cambioDeVitrina({
    enVitrinaAntes: enVitrina,
    enVitrinaDespues: enVitrina,
    selectionAntes: v.comprasSelectionVivas.length > 0,
    selectionDespues: destino === "selection" || v.comprasSelectionVivas.length > 0,
  });
}

/** Lo que dice la vitrina al lado de «Es de» (el alta y «cambiar»): la confirmación si cambia, que no cambia si otra compra ya decide
 *  (H6), o qué verá el comprador con ese destino. */
export function textoDeVitrina(v: FotoDeVitrina | null, destino: "selection" | "stock", compraId: string | null): { texto: string; confirmar: boolean } {
  if (v) {
    const cambio = compraId ? cambioAlDestinar(v, compraId, destino) : cambioAlRegistrar(v, destino);
    if (cambio) return { texto: cambio, confirmar: true };
    const otras = v.comprasSelectionVivas.filter((id) => id !== compraId).length > 0;
    if (otras) return { texto: VITRINA_YA_SELECTION, confirmar: false };
  }
  return { texto: VITRINA_SEGUN_DESTINO[destino], confirmar: false };
}
