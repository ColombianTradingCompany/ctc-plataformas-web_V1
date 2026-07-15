// Instrucciones de envío de muestra como HTML imprimible con marca CTC --
// reemplaza el viejo .txt plano. Se abre en una ventana nueva lista para
// imprimir / guardar como PDF. El productor permanece INCÓGNITO de cara a la
// Arena: el paquete interior lleva únicamente el código del lote (la cata es
// a ciegas), nunca el nombre del productor o de la finca.

const ADDRESS = "CTC · Cra. 4 #8N-30, vía Guatiguará, casa 205, conjunto campestre Santillana · Piedecuesta, Santander, Colombia";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function shipmentInstructionsHtml(lotCode: string, shortRef: string): string {
  const code = esc(lotCode);
  const short = esc(shortRef);
  const idx = code.indexOf(short);
  const markedCode = idx >= 0 ? `${code.slice(0, idx)}<b>${short}</b>${code.slice(idx + short.length)}` : code;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Instrucciones de envío · ${code}</title>
<style>
  :root{--ink:#14201A;--muted:#5C6459;--primary:#17402B;--accent:#A87B2F;--line:#D7D3C4;--paper:#FCFBF6}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Georgia,'Times New Roman',serif;color:var(--ink);background:#fff;padding:48px 52px;max-width:760px;margin:0 auto;line-height:1.55}
  .brand{display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid var(--primary);padding-bottom:14px}
  .brand h1{font-size:19px;letter-spacing:.02em;color:var(--primary)}
  .brand span{font-family:'Courier New',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  h2{font-size:15px;margin:26px 0 10px;color:var(--primary);text-transform:uppercase;letter-spacing:.06em}
  .code{font-family:'Courier New',monospace;font-size:20px;background:var(--paper);border:1.5px solid var(--line);border-radius:8px;padding:14px 18px;margin:18px 0;text-align:center;overflow-wrap:anywhere}
  .code b{color:var(--accent)}
  .codeNote{font-size:12px;color:var(--muted);text-align:center;margin-top:-10px;margin-bottom:18px}
  ol{padding-left:22px;font-size:14px}
  ol li{margin-bottom:12px}
  .address{background:var(--paper);border-left:4px solid var(--accent);padding:12px 16px;font-size:13.5px;margin:8px 0}
  .blind{border:1.5px solid var(--primary);border-radius:8px;padding:14px 16px;margin:22px 0;font-size:13.5px;background:#EEF3EA}
  .blind b{color:var(--primary)}
  .foot{margin-top:34px;padding-top:14px;border-top:1px solid var(--line);font-size:11px;color:var(--muted);display:flex;justify-content:space-between;gap:12px}
  .noprint{margin:26px 0 0;text-align:center}
  .noprint button{font-family:inherit;font-size:14px;padding:10px 22px;border-radius:999px;border:none;background:var(--primary);color:#fff;cursor:pointer}
  @media print{.noprint{display:none}body{padding:20px 8px}}
</style>
</head>
<body>
  <header class="brand">
    <h1>COLOMBIAN TRADING COMPANY</h1>
    <span>Kaffetal Regal · Cupping Arena</span>
  </header>

  <h2>Instrucciones de envío · Muestra de 2 kg</h2>
  <div class="code">${markedCode}</div>
  <p class="codeNote">Los <b>7 caracteres en negrita</b> son lo que va marcado, grande y legible, en el paquete.</p>

  <ol>
    <li>Empaque <b>2 kg de café pergamino seco</b> en una bolsa hermética (doble bolsa si es posible).</li>
    <li>Marque el paquete <b>visible y únicamente</b> con el código del lote mostrado arriba.</li>
    <li>Envíe el paquete a:
      <div class="address">${esc(ADDRESS)}</div>
    </li>
    <li>Cuando despache el paquete, vuelva a su panel y use <b>&quot;Confirmar envío&quot;</b> en el módulo <i>Envío de muestras</i>.</li>
    <li>Con la muestra recibida y confirmada por CTC, su lote entra en la fila de la próxima <b>Cupping Arena</b>: un panel de Q-Graders lo evalúa y usted recibe certificación y retroalimentación, sin costo.</li>
  </ol>

  <div class="blind">
    <b>La evaluación es 100% a ciegas.</b> No escriba su nombre, el de su finca ni ninguna seña personal dentro del
    paquete ni sobre la bolsa de la muestra — solo el código del lote. Así garantizamos que el panel de la Arena
    califique únicamente el café.
  </div>

  <div class="foot">
    <span>Colombian Trading Company · Piedecuesta, Santander · Colombia</span>
    <span>info@ctcexport.com</span>
  </div>

  <div class="noprint">
    <button onclick="window.print()">Imprimir / Guardar como PDF</button>
  </div>
</body>
</html>`;
}

export function openShipmentInstructions(lotCode: string, shortRef: string) {
  const w = window.open("", "_blank", "noopener,width=820,height=900");
  if (!w) return;
  w.document.write(shipmentInstructionsHtml(lotCode, shortRef));
  w.document.close();
}
