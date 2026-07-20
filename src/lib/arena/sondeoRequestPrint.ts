// "Solicitud de Bache de muestras" — el documento formal con el que CTC pide
// al laboratorio el servicio de sondeo de un bache (2026-07-20). HTML
// imprimible con marca CTC, mismo patrón de ventana que
// shipmentInstructionsPrint.ts. La cata es a ciegas: cada muestra viaja
// identificada SOLO por su código de lote — el documento lo dice explícito.

const CTC_LINE = "Colombian Trading Company · NIT 901.483.425-7 · Piedecuesta, Santander, Colombia · info@ctcexport.com";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type SondeoRequestData = {
  batchLabel: string;
  labName: string;
  labContact: string;
  /** [código corto, kg] por muestra — sin nombres de productor ni finca. */
  samples: { reference: string; kg: string }[];
};

export function openSondeoRequest(data: SondeoRequestData) {
  const rows = data.samples
    .map(
      (s, i) =>
        `<tr><td class="mono">${i + 1}</td><td class="mono"><b>${esc(s.reference)}</b></td><td>${esc(s.kg)}</td><td class="mono muted">____________</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Solicitud de Bache de muestras · ${esc(data.batchLabel)}</title>
<style>
  body{font-family:Georgia,serif;color:#17402B;max-width:720px;margin:28px auto;padding:0 22px;font-size:13.5px;line-height:1.55}
  h1{font-size:21px;margin:0}
  .mono{font-family:"Courier New",monospace}
  .muted{color:#5C6459}
  .head{border-bottom:3px double #17402B;padding-bottom:12px;margin-bottom:18px}
  .box{border:1.5px solid #17402B;border-radius:8px;padding:12px 16px;margin:14px 0}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{font-family:"Courier New",monospace;font-size:11px;text-transform:uppercase;letter-spacing:.06em;text-align:left;border-bottom:2px solid #17402B;padding:5px 8px}
  td{border-bottom:1px solid #B9B29B;padding:6px 8px}
  .sig{display:flex;gap:40px;margin-top:44px}
  .sig div{flex:1;border-top:1.5px solid #17402B;padding-top:6px;font-size:12px}
  @media print{.noprint{display:none}}
</style></head><body>
  <div class="head">
    <h1>Solicitud de Bache de muestras · Sondeo preliminar</h1>
    <p class="mono muted" style="font-size:11px;margin:6px 0 0">${esc(CTC_LINE)}</p>
  </div>

  <div class="box">
    <p style="margin:0"><b>Bache:</b> <span class="mono">${esc(data.batchLabel)}</span> · <b>Fecha:</b> <span class="mono">${new Date().toLocaleDateString("es-CO")}</span></p>
    <p style="margin:6px 0 0"><b>Laboratorio:</b> ${esc(data.labName)}${data.labContact ? ` · <span class="muted">${esc(data.labContact)}</span>` : ""}</p>
  </div>

  <p>Colombian Trading Company solicita formalmente el servicio de <b>análisis de sondeo preliminar</b>
  (perfil de taza SCA y caracterización física con granulometría y factor de rendimiento) para las
  <b>${data.samples.length}</b> muestras de café pergamino relacionadas a continuación.</p>

  <p><b>La evaluación es a ciegas:</b> cada muestra viaja identificada únicamente por su código de lote.
  Agradecemos que los resultados se reporten por ese mismo código, sin indagar el origen.</p>

  <table>
    <thead><tr><th>#</th><th>Código de muestra</th><th>Peso</th><th>Recibido ✓</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <p style="margin-top:16px">Solicitamos <b>confirmación escrita del recibo</b> del bache (correo o firma de esta
  relación) — es el soporte con el que CTC activa el seguimiento del servicio.</p>

  <div class="sig">
    <div>Por CTC — nombre y firma</div>
    <div>Por el laboratorio — nombre, firma y fecha de recibo</div>
  </div>

  <p class="noprint" style="margin-top:30px"><button onclick="window.print()" style="padding:10px 18px;font-size:14px;cursor:pointer">Imprimir</button></p>
</body></html>`;

  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
