// ── El texto del contrato de suministro del Lote de Temporada (V5.168, owner 2026-10-06) ─────────────────────────────────
// «El Productor recibe esta oferta […] Al final debe tomar la decisión y con ella se formula un contrato con un feature de
// firmar con el dedo.» El contrato se ARMA de la oferta aceptada y de la declaración del productor con las cifras de
// `terminos.ts` (las mismas que lee la calculadora y el trato mes a mes): nada de lo que dice se teclea a mano.
// El texto tiene VERSIÓN propia (`CONTRATO_VERSION`) y el servidor guarda la huella SHA-256 del texto exacto que el
// productor firmó (`purchase_contracts.contract_text_sha256`): si un día el texto cambia, los contratos viejos siguen
// diciendo lo que dijeron.
// PURO: lo leen la pantalla de firma (KR), la acción que acepta la oferta, el documento del contrato y `qa-trato-check`.
//
// Es una redacción operativa de los términos del trato; la revisión jurídica la decide el owner.

import { CTC_RAZON, CTC_SEDE, NIT } from "@/lib/legal";
import {
  CARGA_KG,
  MORA,
  PENALIDAD_RETIRO_PCT,
  PERIODO_MESES,
  RENOVACION_DIAS,
  TRAMO_LIBRE_ACUMULADO_PCT,
} from "./terminos";

export const CONTRATO_VERSION = "2026-10-06";

export type DatosDelContrato = {
  productorNombre: string;
  productorDocumento: string | null;
  loteNombre: string;
  loteReferencia: string;
  grado: string;
  copKg: number;
  declaradoKg: number;
  declaracion: "trimestre" | "30_dias";
  compraInicialKg: number | null;
  lugarEntrega: string;
  termsVersion: string | null;
  temporada: string | null;
};

export type ClausulaDelContrato = { titulo: string; texto: string };

const cop = (n: number) => `$${Math.round(n).toLocaleString("es-CO")} COP`;
const kg = (n: number) => `${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg`;

/** Las cláusulas del contrato, en el orden en que se firman. */
export function clausulasDelContrato(d: DatosDelContrato): ClausulaDelContrato[] {
  const meses = d.declaracion === "30_dias" ? 1 : PERIODO_MESES;
  const cargas = d.declaradoKg / CARGA_KG;
  // El grado llega «red» del servidor y «Red» de la pantalla: el texto es el mismo (la huella también).
  const grado = d.grado ? d.grado.charAt(0).toUpperCase() + d.grado.slice(1).toLowerCase() : "—";
  const periodo = d.declaracion === "30_dias" ? "los 30 días del periodo en curso" : `el trimestre que empieza (${PERIODO_MESES} meses)`;
  return [
    {
      titulo: "1. Las partes",
      texto: `De una parte, ${CTC_RAZON} (CTCx), ${NIT}, con sede en ${CTC_SEDE}, en adelante «CTCx». De otra, ${d.productorNombre}${d.productorDocumento ? `, identificado(a) con ${d.productorDocumento}` : ""}, en adelante «el Productor». Las partes celebran este contrato de suministro sobre el lote descrito abajo, nacido de la aceptación de la oferta de CTCx en Kaffetal Regal.`,
    },
    {
      titulo: "2. Objeto",
      texto: `El Productor se compromete a suministrar a CTCx café pergamino seco (CPS) del lote «${d.loteNombre}» (${d.loteReferencia}), Grado CTCx ${grado}${d.temporada ? `, temporada ${d.temporada}` : ""}, con la calidad con que fue evaluado y galardonado.`,
    },
    {
      titulo: "3. Cantidad y periodo",
      texto: `El Productor declara y compromete ${kg(d.declaradoKg)} de CPS (${cargas.toLocaleString("es-CO", { maximumFractionDigits: 2 })} cargas de ${CARGA_KG} kg) para ${periodo}.${d.compraInicialKg ? ` CTCx compra de inmediato ${kg(d.compraInicialKg)} al precio acordado, como inversión en la promoción del lote.` : ""} El resto lo pide CTCx mes a mes durante ${meses === 1 ? "el mes" : `los ${meses} meses`} del periodo.`,
    },
    {
      titulo: "4. Precio",
      texto: `El precio queda fijo en ${cop(d.copKg)} por kg de CPS (${cop(d.copKg * CARGA_KG)} por carga), anclado al Precio de Valor de Compra (PVC) vigente al emitir la oferta. No cambia durante el periodo.`,
    },
    {
      titulo: "5. Entrega",
      texto: `${d.lugarEntrega} Cada entrega corresponde al pedido que CTCx haga en el mes; CTCx registra el recibo, el peso y la humedad en la plataforma.`,
    },
    {
      titulo: "6. Pago",
      texto: "CTCx paga cada pedido recibido en la primera semana del mes siguiente, por el medio de pago registrado por el Productor.",
    },
    {
      titulo: "7. Retiro de cantidad",
      texto:
        d.declaracion === "30_dias"
          ? `Por ser un compromiso de 30 días no hay tramo libre de retiro: lo que el Productor retire paga el ${PENALIDAD_RETIRO_PCT} % del precio de cada carga retirada.`
          : `Al cerrar el mes 1 el Productor puede retirar sin penalidad hasta el ${TRAMO_LIBRE_ACUMULADO_PCT[2]} % de lo declarado y, al cerrar el mes 2, hasta el ${TRAMO_LIBRE_ACUMULADO_PCT[3]} % acumulado. Lo que retire por encima de ese tramo paga el ${PENALIDAD_RETIRO_PCT} % del precio de cada carga.`,
    },
    {
      titulo: "8. Mora y ruptura",
      texto: `Si un pedido no se entrega, corren ${MORA.semanasSinCargo} semanas sin cargo y ${MORA.semanasConRecargo} más con un recargo del ${MORA.recargoPct} %. Pasado ese plazo, CTCx puede declarar la ruptura contractual, que congela la cuenta del Productor hasta que se resuelva.`,
    },
    {
      titulo: "9. Renovación",
      texto: `A los ${RENOVACION_DIAS} días CTCx puede ofrecer renovar el trato con el PVC vigente en ese momento. Renovar es una oferta nueva que el Productor acepta o rechaza.`,
    },
    {
      titulo: "10. Documentos y confidencialidad",
      texto:
        "El dossier del lote, la Visa EUDR, el Pasaporte de la finca, la Ficha Técnica y los análisis que CTCx produce o certifica son de uso exclusivo dentro de la relación comercial con CTCx. El Productor no los presentará a terceros compradores para vender el lote por fuera de este contrato, ni los alterará o reproducirá sin autorización escrita de CTCx.",
    },
    {
      titulo: "11. Firma",
      texto: `El Productor firma este contrato en la plataforma Kaffetal Regal con su firma manuscrita digital; la plataforma guarda la fecha, el nombre, los datos del dispositivo y la huella del texto firmado. El contrato queda vigente cuando CTCx lo firma.${d.termsVersion ? ` Términos del trato versión ${d.termsVersion}.` : ""} Texto del contrato versión ${CONTRATO_VERSION}.`,
    },
  ];
}

/** El texto plano del contrato (lo que se resume con SHA-256 al firmar). */
export function textoDelContrato(d: DatosDelContrato): string {
  return clausulasDelContrato(d)
    .map((c) => `${c.titulo}\n${c.texto}`)
    .join("\n\n");
}
