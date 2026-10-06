// ── El texto del contrato (V5.168 · por modalidad desde la V5.169, owner 2026-10-06) ────────────────────────────────────
// «El Productor recibe esta oferta […] Al final debe tomar la decisión y con ella se formula un contrato con un feature de
// firmar con el dedo.» El contrato se ARMA de la oferta aceptada y de la decisión del productor con las cifras de
// `terminos.ts` y `modalidades.ts` (las mismas que leen la calculadora y el trato mes a mes): nada de lo que dice se teclea.
// Dos clases:
//   · PARTICIPACIÓN EN CHERRY PICKED — con su modalidad («Declarar Ahora», «Siguiente Temporada Trimestral», «Ahora y
//     Siguiente»), y la cláusula de que CTCx NO se compromete a comprar fracciones mes a mes.
//   · COMPRA CTCx SELECTION — una venta en firme de una cantidad a un precio acordado (hasta PVC − 8 %).
// El texto tiene VERSIÓN propia y el servidor guarda la huella SHA-256 del texto exacto que el productor firmó.
// PURO. Es una redacción operativa de los términos del trato; la revisión jurídica la decide el owner.

import { CTC_RAZON, CTC_SEDE, NIT } from "@/lib/legal";
import { CARGA_KG, MORA, PENALIDAD_RETIRO_PCT, RENOVACION_DIAS, TRAMO_LIBRE_ACUMULADO_PCT } from "./terminos";
import { MODALIDAD_LABEL, textoCompraInicial, type CondicionesDeModalidad } from "./modalidades";

export const CONTRATO_VERSION = "2026-10-06.2";

export type DatosDelContrato = {
  /** V5.169: participación en Cherry Picked (con modalidad) o compra de CTCx Selection. */
  tipo: "cherry_picked" | "selection";
  productorNombre: string;
  productorDocumento: string | null;
  loteNombre: string;
  loteReferencia: string;
  grado: string;
  copKg: number;
  declaradoKg: number;
  /** Solo Cherry Picked: la modalidad y sus condiciones (`condicionesDe`). */
  condiciones: CondicionesDeModalidad | null;
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

/** Las cláusulas del contrato, en el orden en que se firman. */
export function clausulasDelContrato(d: DatosDelContrato): ClausulaDelContrato[] {
  // El grado llega «red» del servidor y «Red» de la pantalla: el texto es el mismo (la huella también).
  const grado = d.grado ? d.grado.charAt(0).toUpperCase() + d.grado.slice(1).toLowerCase() : "—";
  const cargas = (d.declaradoKg / CARGA_KG).toLocaleString("es-CO", { maximumFractionDigits: 2 });
  const partes: ClausulaDelContrato = {
    titulo: "1. Las partes",
    texto: `De una parte, ${CTC_RAZON} (CTCx), ${NIT}, con sede en ${CTC_SEDE}, en adelante «CTCx». De otra, ${d.productorNombre}${d.productorDocumento ? `, identificado(a) con ${d.productorDocumento}` : ""}, en adelante «el Productor». Las partes celebran este contrato sobre el lote descrito abajo, nacido de la aceptación de la oferta de CTCx en Kaffetal Regal.`,
  };
  const entrega: ClausulaDelContrato = { titulo: "", texto: `${d.lugarEntrega} CTCx registra el recibo, el peso y la humedad de cada entrega en la plataforma.` };
  const pago: ClausulaDelContrato = { titulo: "", texto: "CTCx paga cada compra recibida en la primera semana del mes siguiente, por el medio de pago registrado por el Productor." };
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

  // ── CTCx Selection: una compra en firme ──
  if (d.tipo === "selection" || !d.condiciones) {
    return numerar(
      [
        partes,
        { titulo: "", texto: `CTCx compra al Productor ${kg(d.declaradoKg)} de café pergamino seco (CPS) del lote «${d.loteNombre}» (${d.loteReferencia}), Grado CTCx ${grado}, con la calidad con que fue evaluado. Es una compra en firme de CTCx Selection.` },
        { titulo: "", texto: `El precio acordado es ${cop(d.copKg)} por kg de CPS (${cop(d.copKg * CARGA_KG)} por carga), un precio de compra directa que no es el PVC: es hasta el PVC vigente menos el 8 %, fijado en la negociación. El total es ${cop(d.copKg * d.declaradoKg)}.` },
        entrega,
        pago,
        { titulo: "", texto: `Si el Productor no entrega la cantidad pactada, corren ${MORA.semanasSinCargo} semanas sin cargo y ${MORA.semanasConRecargo} más con un recargo del ${MORA.recargoPct} %; pasado ese plazo, CTCx puede declarar la ruptura contractual.` },
        documentos,
        firma,
      ],
      ["Las partes", "Objeto", "Precio", "Entrega", "Pago", "Incumplimiento", "Documentos y confidencialidad", "Firma"]
    );
  }

  // ── Participación en Cherry Picked ──
  const c = d.condiciones;
  const modalidad = MODALIDAD_LABEL[c.modalidad];
  const vigencia = `del ${fecha(c.desde)} al ${fecha(c.hasta)}`;
  const cantidad =
    c.modalidad === "30_dias"
      ? `En la modalidad «${modalidad}», el Productor declara disponibles ${kg(d.declaradoKg)} de CPS (${cargas} cargas de ${CARGA_KG} kg) para los próximos 30 días, ${vigencia}. Puede renovar la declaración dentro de la misma Temporada Trimestral mientras falten al menos 30 días para la siguiente; cada renovación enmienda la cantidad declarada, y CTCx no queda obligado a una compra adicional.`
      : c.modalidad === "trimestre"
        ? `En la modalidad «${modalidad}», el Productor declara disponibles ${kg(d.declaradoKg)} de CPS (${cargas} cargas de ${CARGA_KG} kg) para la siguiente Temporada Trimestral, ${vigencia}.`
        : `En la modalidad «${modalidad}», el Productor declara disponibles ${kg(d.declaradoKg)} de CPS (${cargas} cargas de ${CARGA_KG} kg) desde hoy y durante la siguiente Temporada Trimestral, ${vigencia}. Al empezar la siguiente temporada (${fecha(c.redeclarar!.at)}) el Productor redeclara al menos ${kg(c.redeclarar!.minKg)} (el 70 % de lo declarado, y nunca menos del mínimo de su grado).`;
  const compra = `Con la firma, CTCx compra ${textoCompraInicial(c.compraInicial)} de CPS al precio acordado, como inversión en la promoción del lote en Cherry Picked.`;
  const sinCompromiso = {
    titulo: "",
    texto:
      "CTCx no se compromete a comprar fracciones fijas del café declarado mes a mes. Puede no haber compras en un mes cualquiera, o venderse todo lo declarado el primer día: el café declarado queda disponible para la venta en Cherry Picked y CTCx lo compra a medida que se vende, al precio acordado.",
  };
  const retiro =
    c.modalidad === "30_dias"
      ? `Por ser una declaración de 30 días no hay tramo libre de retiro: lo que el Productor retire paga el ${PENALIDAD_RETIRO_PCT} % del precio de cada carga retirada.`
      : c.modalidad === "trimestre"
        ? `Al cerrar el mes 1 el Productor puede retirar sin penalidad hasta el ${TRAMO_LIBRE_ACUMULADO_PCT[2]} % de lo declarado y, al cerrar el mes 2, hasta el ${TRAMO_LIBRE_ACUMULADO_PCT[3]} % acumulado. Lo que retire por encima paga el ${PENALIDAD_RETIRO_PCT} % del precio de cada carga.`
        : `El Productor puede retirar sin penalidad hasta el ${c.retiroLibrePct} % de lo declarado en cualquier momento, sin escalones mensuales. Lo que retire por encima paga el ${PENALIDAD_RETIRO_PCT} % del precio de cada carga.`;
  return numerar(
    [
      partes,
      { titulo: "", texto: `El Productor participa en Cherry Picked con café pergamino seco (CPS) del lote «${d.loteNombre}» (${d.loteReferencia}), Grado CTCx ${grado}${d.temporada ? `, temporada ${d.temporada}` : ""}, con la calidad con que fue evaluado y galardonado.` },
      { titulo: "", texto: cantidad },
      { titulo: "", texto: `${compra}` },
      sinCompromiso,
      { titulo: "", texto: `El precio queda fijo en ${cop(d.copKg)} por kg de CPS (${cop(d.copKg * CARGA_KG)} por carga), el Precio de Valor de Compra (PVC) de la temporada vigente al emitir la oferta. No cambia durante la vigencia.` },
      entrega,
      pago,
      { titulo: "", texto: retiro },
      { titulo: "", texto: `Si una compra no se entrega, corren ${MORA.semanasSinCargo} semanas sin cargo y ${MORA.semanasConRecargo} más con un recargo del ${MORA.recargoPct} %. Pasado ese plazo, CTCx puede declarar la ruptura contractual, que congela la cuenta del Productor hasta que se resuelva.` },
      { titulo: "", texto: `A los ${RENOVACION_DIAS} días CTCx puede ofrecer renovar con el PVC vigente en ese momento. Renovar es una oferta nueva que el Productor acepta o rechaza.` },
      documentos,
      firma,
    ],
    ["Las partes", "Objeto", "Cantidad y vigencia", "Compra con la firma", "Sin compromiso de compra mensual", "Precio", "Entrega", "Pago", "Retiro de cantidad", "Mora y ruptura", "Renovación", "Documentos y confidencialidad", "Firma"]
  );
}

/** El texto plano del contrato (lo que se resume con SHA-256 al firmar). */
export function textoDelContrato(d: DatosDelContrato): string {
  return clausulasDelContrato(d)
    .map((c) => `${c.titulo}\n${c.texto}`)
    .join("\n\n");
}
