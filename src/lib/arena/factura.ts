// ── La factura de cobro de la evaluación (fase 3 del PLAN_CIRCUITO_DEL_LOTE, V5.80) ──────────
// Folio 7, paso 8: CTCx «corrobora la solicitud y emite una factura de cobro». Es UN documento imprimible con su
// referencia (FE-AAAA-NNNNN, de la secuencia de la base), la tarifa, la subvención decidida, el total y el carril
// de pago; lo abren las dos caras —el OCP desde Solicitudes de Evaluación y el productor desde «Evaluar mi Café»—
// con los MISMOS datos, así que la plantilla vive aquí y no en una pantalla. Mismo patrón de ventana que
// `sondeoRequestPrint.ts` y `shipmentInstructionsPrint.ts`.
//
// NO es una factura electrónica DIAN: es la cuenta de cobro con la que CTC pide el pago de un servicio. El carril
// es Nequi mientras no exista «Plataformas de Pagos» (su brief); si el número no está configurado, la factura lo
// dice y manda a escribir a CTC — nunca un número a medias (regla de `payment.ts`).

import { CTC_LEGAL_LINE } from "@/lib/legal";
import { formatCop } from "@/lib/arena/inscriptions";
import { MUESTRA_EVALUACION_KG, TERMINOS_VERSION } from "@/lib/trato/terminos";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type FacturaData = {
  ref: string;
  emitidaAt: string;
  productor: string;
  lote: string;
  /** El código corto del lote: es la referencia que el productor escribe en el pago. */
  codigoLote: string;
  /** La tarifa con la que nació la solicitud (`amount_cop`), congelada por fila. */
  tarifaCop: number;
  subvencionPct: number;
  subvencionNombre?: string | null;
  totalCop: number;
  contraEntrega: boolean;
  carril: { nequiNumber: string; nequiHolder: string; email: string };
};

export function facturaHtml(d: FacturaData): string {
  const fecha = new Date(d.emitidaAt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const nequi = d.carril.nequiNumber.trim();
  const carril = nequi
    ? `<p>Transfiera por <b>Nequi</b> al número <b class="mono">${esc(nequi)}</b>${d.carril.nequiHolder ? ` — a nombre de <b>${esc(d.carril.nequiHolder)}</b>` : ""}.
       Escriba en el mensaje del pago la referencia <b class="mono">${esc(d.codigoLote)}</b> y envíe el comprobante a <b>${esc(d.carril.email)}</b>.</p>`
    : `<p>Escríbanos a <b>${esc(d.carril.email)}</b> indicando la referencia <b class="mono">${esc(d.codigoLote)}</b> y le confirmamos el medio de pago.</p>`;
  const subvencion = d.subvencionPct > 0
    ? `<tr><td>Subvención ${d.subvencionPct} %${d.subvencionNombre ? ` · «${esc(d.subvencionNombre)}»` : ""}</td><td class="num">− ${esc(formatCop(d.tarifaCop - d.totalCop))}</td></tr>`
    : "";

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Factura de cobro ${esc(d.ref)} · ${esc(d.lote)}</title>
<style>
  body{font-family:Georgia,serif;color:#17402B;max-width:720px;margin:28px auto;padding:0 22px;font-size:13.5px;line-height:1.55}
  h1{font-size:21px;margin:0}
  .mono{font-family:"Courier New",monospace}
  .muted{color:#5C6459}
  .head{border-bottom:3px double #17402B;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px}
  .box{border:1.5px solid #17402B;border-radius:8px;padding:12px 16px;margin:14px 0}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{font-family:"Courier New",monospace;font-size:11px;text-transform:uppercase;letter-spacing:.06em;text-align:left;border-bottom:2px solid #17402B;padding:5px 8px}
  td{border-bottom:1px solid #B9B29B;padding:6px 8px}
  td.num,th.num{text-align:right;font-family:"Courier New",monospace}
  tr.total td{font-weight:bold;font-size:15px;border-bottom:none;border-top:2px solid #17402B}
  .foot{margin-top:26px;font-size:11px;color:#5C6459;border-top:1px solid #B9B29B;padding-top:8px}
  @media print{.noprint{display:none}}
</style></head><body>
  <div class="head">
    <div><h1>Factura de cobro</h1><div class="muted">Evaluación de lote · Kaffetal Regal</div></div>
    <div style="text-align:right"><div class="mono" style="font-size:18px"><b>${esc(d.ref)}</b></div><div class="muted">${esc(fecha)}</div></div>
  </div>

  <div class="box">
    <div><b>Productor:</b> ${esc(d.productor)}</div>
    <div><b>Lote:</b> ${esc(d.lote)} · referencia <span class="mono"><b>${esc(d.codigoLote)}</b></span></div>
    <div><b>Servicio:</b> evaluación física y sensorial por Q-Grader en el Centro de Calidad, factor de rendimiento, Grado CTC y feedback — salga o no salga galardonado.</div>
  </div>

  <table>
    <thead><tr><th>Concepto</th><th class="num">COP</th></tr></thead>
    <tbody>
      <tr><td>Tarifa de evaluación (${esc(TERMINOS_VERSION)})</td><td class="num">${esc(formatCop(d.tarifaCop))}</td></tr>
      ${subvencion}
      <tr class="total"><td>Total a pagar</td><td class="num">${esc(formatCop(d.totalCop))}</td></tr>
    </tbody>
  </table>

  <div class="box">
    <div><b>Cómo pagar</b></div>
    ${carril}
    <p class="muted" style="margin-top:6px">La muestra de <b>${MUESTRA_EVALUACION_KG} kg</b> de café pergamino seco se envía${d.contraEntrega ? " <b>contra entrega</b>: el flete lo paga CTC al recibir el paquete — a usted no le cuesta" : ""}. Con el pago y la muestra confirmados, su lote pasa a «Lotes a Evaluar».</p>
  </div>

  <div class="foot">${esc(CTC_LEGAL_LINE)} · Esta es la cuenta de cobro de un servicio; no sustituye a una factura electrónica.</div>
  <p class="noprint" style="margin-top:30px"><button onclick="window.print()" style="padding:10px 18px;font-size:14px;cursor:pointer">Imprimir</button></p>
</body></html>`;
}

/** Abre la factura en una ventana imprimible (solo en el navegador). */
export function openFactura(d: FacturaData) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return;
  w.document.write(facturaHtml(d));
  w.document.close();
}
