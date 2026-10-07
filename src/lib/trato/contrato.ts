// ── El texto del contrato (V5.168 · por ventanas de ciclos desde la V5.175, owner 2026-10-07) ────────────────────────────────
// «El Productor recibe esta oferta […] Al final debe tomar la decisión y con ella se formula un contrato con un feature de
// firmar con el dedo.» El contrato se ARMA de la oferta aceptada y de la decisión del productor con las cifras de
// `terminos.ts`, `ventanas.ts`, `despachos.ts` y la edición del PVC: nada de lo que dice se teclea. Dos clases:
//   · PARTICIPACIÓN EN CHERRY PICKED — desde la V5.175 por VENTANAS de ciclos (docs/PLAN_CICLOS.md): la fecha de firma decide
//     la ventana, el retiro libre y la regla de precio; el saco inicial va fuera de lo declarado; pago 60/40 con calidad.
//   · COMPRA CTCx SELECTION — una venta en firme de una cantidad a un precio acordado (hasta PVC − 8 %). No cambia.
// El texto tiene VERSIÓN propia y el servidor guarda la huella SHA-256 del texto exacto que el productor firmó.
// PURO. Es una redacción operativa de los términos del trato; la revisión jurídica la decide el owner.

import { CTC_RAZON, CTC_SEDE, NIT } from "@/lib/legal";
import { AJUSTE_FUERA_DE_RANGO_MAX_PCT, CALIDAD_POR_DEFECTO, CARGA_KG, MORA, PAGO_AL_DESPACHO_PCT, PENALIDAD_RETIRO_PCT, PRORROGA_DIAS } from "./terminos";
import { CONTINUIDAD_REBAJA_PCT } from "./minimos";
import type { ReglaDePrecio } from "./ventanas";
import type { RangosDeCalidad } from "./despachos";
import { fletePorKg, REGION_DE_FLETE_LABEL, type FleteDelTrato } from "./flete";

export const CONTRATO_VERSION = "2026-10-07.2";

export type VentanaDelContrato = { tipo: "ciclo" | "extendida"; desde: string; hasta: string; ciclos: string[]; retiroLibrePct: number; precio: ReglaDePrecio };

export type DatosDelContrato = {
  /** V5.169: participación en Cherry Picked (por ventana) o compra de CTCx Selection. */
  tipo: "cherry_picked" | "selection";
  productorNombre: string;
  productorDocumento: string | null;
  loteNombre: string;
  loteReferencia: string;
  grado: string;
  copKg: number;
  declaradoKg: number;
  /** Solo Cherry Picked: la ventana que decidió la fecha de firma (`ventanas.ts`). */
  ventana: VentanaDelContrato | null;
  /** Declaración reducida por existencia insuficiente: sin derecho a retiro. */
  sinRetiro: boolean;
  /** El saco inicial (primer contrato) o el adelanto (renovación), kg de CPS fuera de lo declarado. */
  sacoKg: number | null;
  esRenovacion: boolean;
  minimoKg: number | null;
  calidad: RangosDeCalidad | null;
  /** V5.177: el Flete a CTCx de la oferta (región de despacho y COP por carga), ya incluido en el precio. */
  flete: FleteDelTrato | null;
  lugarEntrega: string;
  termsVersion: string | null;
  temporada: string | null;
};

export type ClausulaDelContrato = { titulo: string; texto: string };

const cop = (n: number) => `$${Math.round(n).toLocaleString("es-CO")} COP`;
const kg = (n: number) => `${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg`;
const fecha = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d} de ${meses[m - 1]} de ${y}`;
};
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
// V5.177 (owner, 2026-10-07): no hay «auxilio de transporte» (las cooperativas DESCUENTAN el flete de la base FNC). CTCx suma
// el Flete a CTCx de la región al precio final y el productor despacha con el código corporativo de CTCx en Servientrega.
const fleteEnElPrecio = (f: FleteDelTrato | null) =>
  f ? `, e incluye el Flete a CTCx de la región ${REGION_DE_FLETE_LABEL[f.region]}: ${cop(f.carga)} por carga equivalente (${cop(fletePorKg(f.carga))} por kg)` : "";
const despachoConFlete = (f: FleteDelTrato | null) =>
  f
    ? "El Productor despacha con el código de envío corporativo de CTCx en Servientrega y paga el envío en la oficina: el Flete a CTCx incluido en el precio le reconoce parte de ese costo y el resto corre por su cuenta."
    : "El Productor despacha por su cuenta.";

const REGLA_TEXTO: Record<ReglaDePrecio, string> = {
  vigente: "el Precio de Valor de Compra (PVC) de la temporada vigente",
  promedio: "el promedio simple de los PVC de la temporada vigente y de la siguiente, ya publicado",
  siguiente: "el PVC publicado para la siguiente Temporada Trimestral",
};

/** Las cláusulas del contrato, en el orden en que se firman. */
export function clausulasDelContrato(d: DatosDelContrato): ClausulaDelContrato[] {
  // El grado llega «red» del servidor y «Red» de la pantalla: el texto es el mismo (la huella también).
  const grado = d.grado ? d.grado.charAt(0).toUpperCase() + d.grado.slice(1).toLowerCase() : "—";
  const cargas = (d.declaradoKg / CARGA_KG).toLocaleString("es-CO", { maximumFractionDigits: 2 });
  const partes: ClausulaDelContrato = {
    titulo: "1. Las partes",
    texto: `De una parte, ${CTC_RAZON} (CTCx), ${NIT}, con sede en ${CTC_SEDE}, en adelante «CTCx». De otra, ${d.productorNombre}${d.productorDocumento ? `, identificado(a) con ${d.productorDocumento}` : ""}, en adelante «el Productor». Las partes celebran este contrato sobre el lote descrito abajo, nacido de la aceptación de la oferta de CTCx en Kaffetal Regal.`,
  };
  const documentos: ClausulaDelContrato = {
    titulo: "",
    texto:
      "El dossier del lote, la Visa EUDR, el Pasaporte de la finca, la Ficha Técnica y los análisis que CTCx produce o certifica son de uso exclusivo dentro de la relación comercial con CTCx. El Productor no los presentará a terceros compradores para vender el lote por fuera de este contrato, ni los alterará o reproducirá sin autorización escrita de CTCx.",
  };
  const firma: ClausulaDelContrato = {
    titulo: "",
    texto: `El Productor firma este contrato en la plataforma Kaffetal Regal con su firma manuscrita digital; la plataforma guarda la fecha, el nombre, los datos del dispositivo y la huella del texto firmado. El contrato queda vigente cuando CTCx lo firma.${d.termsVersion ? ` Términos del trato versión ${d.termsVersion}.` : ""} Texto del contrato versión ${CONTRATO_VERSION}.`,
  };
  const numerar = (cs: ClausulaDelContrato[], titulos: string[]) => cs.map((c, i) => ({ titulo: `${i + 1}. ${titulos[i]}`, texto: c.texto }));

  // ── CTCx Selection: una compra en firme (no cambia con los ciclos) ──
  if (d.tipo === "selection" || !d.ventana) {
    return numerar(
      [
        partes,
        { titulo: "", texto: `CTCx compra al Productor ${kg(d.declaradoKg)} de café pergamino seco (CPS) del lote «${d.loteNombre}» (${d.loteReferencia}), Grado CTCx ${grado}, con la calidad con que fue evaluado. Es una compra en firme de CTCx Selection.` },
        { titulo: "", texto: `El precio acordado es ${cop(d.copKg)} por kg de CPS (${cop(d.copKg * CARGA_KG)} por carga), un precio de compra directa que no es el PVC: es hasta el PVC vigente menos el 8 %, fijado en la negociación${fleteEnElPrecio(d.flete)}. El total es ${cop(d.copKg * d.declaradoKg)}.` },
        { titulo: "", texto: `${d.lugarEntrega}${d.flete ? ` ${despachoConFlete(d.flete)}` : ""} CTCx registra el recibo, el peso y la humedad de cada entrega en la plataforma.` },
        { titulo: "", texto: "CTCx paga cada compra recibida en la primera semana del mes siguiente, por el medio de pago registrado por el Productor." },
        { titulo: "", texto: `Si el Productor no entrega la cantidad pactada, corren ${MORA.semanasSinCargo} semanas sin cargo y ${MORA.semanasConRecargo} más con un recargo del ${MORA.recargoPct} %; pasado ese plazo, CTCx puede declarar la ruptura contractual.` },
        documentos,
        firma,
      ],
      ["Las partes", "Objeto", "Precio", "Entrega", "Pago", "Incumplimiento", "Documentos y confidencialidad", "Firma"]
    );
  }

  // ── Participación en Cherry Picked, por ventana ──
  const v = d.ventana;
  const calidad = d.calidad ?? CALIDAD_POR_DEFECTO;
  const cantidad =
    `El Productor declara disponibles ${kg(d.declaradoKg)} de CPS (${cargas} cargas de ${CARGA_KG} kg) para la ventana del ${fecha(v.desde)} al ${fecha(v.hasta)} (${v.ciclos.join(" y ")}), en una sola declaración.` +
    (v.tipo === "extendida" ? " Como se firma después de la semana 1 del ciclo, la ventana se extiende al ciclo siguiente para que las muestras del lote viajen en el flete consolidado." : "") +
    (d.sinRetiro && d.minimoKg ? ` Declara por debajo del mínimo de su grado (${kg(d.minimoKg)}) porque la existencia del lote no le alcanza: lo hace sin derecho a retiro libre.` : "");
  const compra = d.esRenovacion
    ? d.sacoKg && d.sacoKg > 0
      ? `En esta renovación CTCx compra por adelantado ${kg(d.sacoKg)} de CPS, fuera de lo declarado, al precio acordado.`
      : "En esta renovación CTCx no compra por adelantado; se reserva el derecho de hacerlo en renovaciones futuras."
    : `Con la firma, CTCx compra de inmediato ${kg(d.sacoKg ?? 0)} de CPS (un saco), FUERA de lo declarado, al precio acordado. Es el material con que CTCx promociona y posiciona el lote (Sample Kits).`;
  const ventas =
    "CTCx no se compromete a comprar cantidades fijas: puede no haber ventas en una semana, o venderse todo lo declarado el primer día. Cada semana CTCx le confirma al Productor lo vendido en Cherry Picked; lo vendido es de CTCx y ya no se puede retirar.";
  const precio = `El precio queda fijo en ${cop(d.copKg)} por kg de CPS (${cop(d.copKg * CARGA_KG)} por carga), ${REGLA_TEXTO[v.precio]}${fleteEnElPrecio(d.flete)}. No cambia durante la ventana.`;
  const entrega = `${d.lugarEntrega} ${despachoConFlete(d.flete)} El saco${d.esRenovacion ? " o el adelanto" : ""} sale al cierre de la semana en que se firma; si no sale, el Productor puede pedir una prórroga de ${PRORROGA_DIAS} días —que queda como advertencia—, cancelar el contrato o pasarlo a la ventana siguiente (un contrato firmado en la semana 1 del ciclo no tiene prórroga: su saco tiene que llegar al procesamiento de la semana 2). Lo vendido en cada ciclo sale en la semana 1 del ciclo siguiente; si no sale, tiene ${PRORROGA_DIAS} días de prórroga con advertencia y, después, el faltante se cobra como retiro penalizado y CTCx puede declarar la ruptura contractual, que congela la cuenta del Productor hasta que se resuelva.`;
  const pago = `CTCx paga el ${PAGO_AL_DESPACHO_PCT} % de cada envío con el tiquete de despacho (guía, peso y foto) y el ${100 - PAGO_AL_DESPACHO_PCT} % al recibirlo, comprobado que la humedad está entre ${num(calidad.humedad_min)} y ${num(calidad.humedad_max)} % y la actividad de agua no pasa de ${num(calidad.aw_max)}. Fuera de rango, CTCx elige: devolverlo (el Productor reintegra el ${PAGO_AL_DESPACHO_PCT} % y CTCx paga el flete de vuelta; cada parte pierde su transporte) o comprarlo con un pago adicional de 0 a ${AJUSTE_FUERA_DE_RANGO_MAX_PCT} % (el café queda pagado entre el ${PAGO_AL_DESPACHO_PCT} y el ${PAGO_AL_DESPACHO_PCT + AJUSTE_FUERA_DE_RANGO_MAX_PCT} %).`;
  const retiro = d.sinRetiro
    ? `Por ser una declaración reducida no hay retiro libre: lo que el Productor retire de lo no vendido paga el ${PENALIDAD_RETIRO_PCT} % del precio de cada carga.`
    : `El Productor puede retirar en cualquier momento, solo de lo no vendido, hasta el ${v.retiroLibrePct} % de lo declarado sin penalidad; por encima, paga el ${PENALIDAD_RETIRO_PCT} % del precio de cada carga retirada.`;
  const renovacion = `En la semana 4 de cada ciclo CTCx deja lista la renovación de la ventana siguiente: el Productor confirma la cantidad disponible, que la humedad y el bodegaje son los adecuados, y firma. Si no responde antes de terminar su ventana, el contrato vence y CTCx puede ofrecerle uno nuevo. Con cada cambio de Temporada Trimestral el mínimo de su grado baja ${CONTINUIDAD_REBAJA_PCT} %.`;
  return numerar(
    [
      partes,
      { titulo: "", texto: `El Productor participa en Cherry Picked con café pergamino seco (CPS) del lote «${d.loteNombre}» (${d.loteReferencia}), Grado CTCx ${grado}${d.temporada ? `, temporada ${d.temporada}` : ""}, con la calidad con que fue evaluado y galardonado.` },
      { titulo: "", texto: cantidad },
      { titulo: "", texto: compra },
      { titulo: "", texto: ventas },
      { titulo: "", texto: precio },
      { titulo: "", texto: entrega },
      { titulo: "", texto: pago },
      { titulo: "", texto: retiro },
      { titulo: "", texto: renovacion },
      documentos,
      firma,
    ],
    ["Las partes", "Objeto", "Ventana y cantidad", d.esRenovacion ? "Compra adelantada" : "Compra con la firma", "Ventas y confirmaciones", "Precio", "Entrega y despachos", "Pago y calidad", "Retiro de cantidad", "Renovación", "Documentos y confidencialidad", "Firma"]
  );
}

/** El texto plano del contrato (lo que se resume con SHA-256 al firmar). */
export function textoDelContrato(d: DatosDelContrato): string {
  return clausulasDelContrato(d)
    .map((c) => `${c.titulo}\n${c.texto}`)
    .join("\n\n");
}
