// Instrucciones de envío de muestra como HTML imprimible con marca CTC.
// Sistema de DOS CAPAS: la transportadora exige por ley los datos reales del
// remitente (Capa 2, exterior), pero la cata en la Arena es a ciegas -- CTC
// recibe el paquete, registra el cumplimiento, destruye la capa exterior con
// los datos personales y le pasa al panel únicamente la bolsa interior
// anónima (Capa 1), marcada solo con el código del lote. La página cierra con
// una etiqueta RECORTABLE (~1/4 de página, borde punteado + tijeras) para
// pegar con cinta sobre la bolsa interior.

const ADDRESS = "CTC · Cra. 4 #8N-30, vía Guatiguará, casa 205, conjunto campestre Santillana · Piedecuesta, Santander, Colombia";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Diagrama inline: la bolsa anónima (Capa 1) dentro de la caja/bolsa de la
// transportadora (Capa 2). SVG plano, sin dependencias, imprime bien en B/N.
function layersDiagram(short: string): string {
  return `
  <svg viewBox="0 0 640 240" role="img" aria-label="Empaque interior anónimo dentro del empaque exterior con la guía" style="width:100%;max-width:560px;display:block;margin:6px auto">
    <!-- Capa 2: caja exterior -->
    <rect x="14" y="26" width="380" height="196" rx="10" fill="#FCFBF6" stroke="#17402B" stroke-width="2.5"/>
    <text x="30" y="52" font-family="Courier New,monospace" font-size="13" font-weight="bold" fill="#17402B">CAPA 2 · EXTERIOR (el oficial)</text>
    <!-- guía de envío pegada a la caja -->
    <rect x="238" y="66" width="136" height="70" rx="4" fill="#fff" stroke="#A87B2F" stroke-width="1.5"/>
    <text x="248" y="84" font-family="Courier New,monospace" font-size="10" fill="#A87B2F">GUÍA DE ENVÍO</text>
    <line x1="248" y1="96" x2="362" y2="96" stroke="#B9B29B" stroke-width="1.5"/>
    <line x1="248" y1="108" x2="362" y2="108" stroke="#B9B29B" stroke-width="1.5"/>
    <line x1="248" y1="120" x2="330" y2="120" stroke="#B9B29B" stroke-width="1.5"/>
    <text x="248" y="132" font-family="Georgia,serif" font-size="9" fill="#5C6459">sus datos reales</text>
    <!-- Capa 1: bolsa interior -->
    <path d="M52 88 h150 a8 8 0 0 1 8 8 v96 a8 8 0 0 1 -8 8 h-150 a8 8 0 0 1 -8 -8 v-96 a8 8 0 0 1 8 -8 z" fill="#fff" stroke="#17402B" stroke-width="2" stroke-dasharray="7 4"/>
    <rect x="44" y="76" width="166" height="14" rx="4" fill="#17402B"/>
    <text x="127" y="87" text-anchor="middle" font-family="Courier New,monospace" font-size="9" fill="#fff">CIERRE HERMÉTICO (ziploc)</text>
    <!-- etiqueta con el código -->
    <rect x="66" y="118" width="122" height="46" rx="4" fill="#EEF3EA" stroke="#17402B" stroke-width="1.5"/>
    <text x="127" y="137" text-anchor="middle" font-family="Courier New,monospace" font-size="11" font-weight="bold" fill="#17402B">${short}</text>
    <text x="127" y="153" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="#5C6459">solo el código · sin nombre</text>
    <text x="127" y="182" text-anchor="middle" font-family="Courier New,monospace" font-size="10" font-weight="bold" fill="#17402B">CAPA 1 · INTERIOR</text>
    <text x="127" y="196" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="#5C6459">(el anónimo)</text>
    <!-- flecha y nota de qué pasa al llegar -->
    <path d="M400 118 h44" stroke="#A87B2F" stroke-width="2.5" fill="none" marker-end="url(#arr)"/>
    <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#A87B2F"/></marker></defs>
    <text x="452" y="96" font-family="Georgia,serif" font-size="11" fill="#14201A">
      <tspan x="452" dy="0">Al llegar, CTC registra su</tspan>
      <tspan x="452" dy="14">envío, <tspan font-weight="bold">destruye la capa</tspan></tspan>
      <tspan x="452" dy="14"><tspan font-weight="bold">exterior</tspan> con sus datos y</tspan>
      <tspan x="452" dy="14">pasa al panel solo la bolsa</tspan>
      <tspan x="452" dy="14">interior anónima.</tspan>
      <tspan x="452" dy="18" font-style="italic" fill="#5C6459">Nadie en la cata sabrá</tspan>
      <tspan x="452" dy="13" font-style="italic" fill="#5C6459">que es suyo.</tspan>
    </text>
  </svg>`;
}

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
  body{font-family:Georgia,'Times New Roman',serif;color:var(--ink);background:#fff;padding:34px 44px;max-width:780px;margin:0 auto;line-height:1.5;font-size:13px}
  .brand{display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid var(--primary);padding-bottom:10px}
  .brand h1{font-size:17px;letter-spacing:.02em;color:var(--primary)}
  .brand span{font-family:'Courier New',monospace;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  h2{font-size:13.5px;margin:16px 0 8px;color:var(--primary);text-transform:uppercase;letter-spacing:.06em}
  .code{font-family:'Courier New',monospace;font-size:16px;background:var(--paper);border:1.5px solid var(--line);border-radius:8px;padding:9px 14px;margin:12px 0 4px;text-align:center;overflow-wrap:anywhere}
  .code b{color:var(--accent)}
  .codeNote{font-size:11px;color:var(--muted);text-align:center;margin-bottom:8px}
  .layers{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0}
  .layer{border:1.5px solid var(--line);border-radius:8px;padding:10px 13px;background:var(--paper)}
  .layer h3{font-size:12px;color:var(--primary);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em}
  .layer p{font-size:12px;margin-bottom:5px}
  .layer b{color:var(--primary)}
  .address{background:var(--paper);border-left:4px solid var(--accent);padding:8px 12px;font-size:12px;margin:8px 0}
  .foot{margin-top:14px;padding-top:8px;border-top:1px solid var(--line);font-size:10px;color:var(--muted);display:flex;justify-content:space-between;gap:12px}
  /* Etiqueta recortable: ~1/4 de la página, borde punteado + tijeras. */
  .cutWrap{margin-top:18px;position:relative}
  .cutHint{font-size:11px;color:var(--muted);font-style:italic;margin-bottom:6px}
  .cutLabel{border:2.5px dashed var(--ink);border-radius:6px;min-height:225px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:18px;position:relative}
  .cutLabel .scissors{position:absolute;top:-13px;left:26px;background:#fff;padding:0 8px;font-size:17px}
  .cutLabel .tag{font-family:'Courier New',monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
  .cutLabel .bigcode{font-family:'Courier New',monospace;font-size:26px;font-weight:bold;overflow-wrap:anywhere}
  .cutLabel .bigcode b{color:var(--accent)}
  .cutLabel .sub{font-size:12px;color:var(--muted)}
  .cutLabel .blindTag{font-family:'Courier New',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;border:1.5px solid var(--primary);border-radius:999px;padding:3px 12px;color:var(--primary)}
  .noprint{margin:18px 0 0;text-align:center}
  .noprint button{font-family:inherit;font-size:14px;padding:10px 22px;border-radius:999px;border:none;background:var(--primary);color:#fff;cursor:pointer}
  @media print{.noprint{display:none}body{padding:14px 8px}}
</style>
</head>
<body>
  <header class="brand">
    <h1>COLOMBIAN TRADING COMPANY</h1>
    <span>Kaffetal Regal · Cupping Arena</span>
  </header>

  <h2>Envío de muestra · 2 kg pergamino · sistema de dos capas</h2>
  <div class="code">${markedCode}</div>
  <p class="codeNote">Los <b>7 caracteres en negrita</b> son su código de muestra.</p>

  <div class="layers">
    <div class="layer">
      <h3>Capa 1 · El empaque interior (el anónimo)</h3>
      <p><b>El empaque:</b> una bolsa plástica tipo <b>Ziploc gruesa</b> o de polietileno sellada al calor, completamente limpia (el café verde absorbe olores). Adentro: los 2 kg de pergamino seco.</p>
      <p><b>La identificación:</b> péguele la etiqueta recortable de abajo — <b>solo el código del lote</b>. Sin logos, sin su nombre real.</p>
    </div>
    <div class="layer">
      <h3>Capa 2 · El empaque exterior (el oficial)</h3>
      <p><b>El empaque:</b> meta la bolsa interior en una <b>caja de cartón pequeña</b> o en la bolsa de seguridad que le entrega la transportadora (Servientrega, Coordinadora, etc.).</p>
      <p><b>La identificación:</b> aquí va la <b>guía de envío obligatoria</b> con sus datos reales (nombre, cédula, dirección) — sin esto la transportadora no acepta el paquete, por ley.</p>
    </div>
  </div>

  ${layersDiagram(short)}

  <div class="address"><b>Enviar a:</b> ${esc(ADDRESS)} &nbsp;·&nbsp; Al despachar, confirme el envío en su panel (módulo <i>Envío de muestras</i>).</div>

  <div class="cutWrap">
    <p class="cutHint">Recorte esta etiqueta por la línea punteada y péguela con cinta transparente sobre la bolsa interior (Capa 1):</p>
    <div class="cutLabel">
      <span class="scissors" aria-hidden="true">✂</span>
      <span class="tag">Muestra · Kaffetal Regal Cupping Arena</span>
      <span class="bigcode">${markedCode}</span>
      <span class="sub">2 kg café pergamino seco</span>
      <span class="blindTag">Evaluación a ciegas · No abrir antes de la Arena</span>
    </div>
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
  // OJO: window.open con el feature "noopener" devuelve SIEMPRE null (spec),
  // así que la versión original con document.write() nunca escribía nada y el
  // botón quedaba mudo. Un Blob URL no depende del handle devuelto; y si el
  // popup es bloqueado, el fallback descarga el HTML (los anchor-download no
  // pasan por el bloqueador de popups).
  const blob = new Blob([shipmentInstructionsHtml(lotCode, shortRef)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `instrucciones-envio-${shortRef}.html`;
    a.click();
  }
  // Deja margen de sobra para que la pestaña/descarga lea el blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
