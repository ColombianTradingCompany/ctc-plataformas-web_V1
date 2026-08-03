import { resumenTerminos, terminosFromRow } from "./terminos";

// ── Constancia de acuerdo · Jornada de Recolecta ────────────────────────────
// Imprimible que deja por escrito lo pactado, generado desde el SNAPSHOT
// congelado al confirmar el cupo (si la finca edita la jornada después, esto
// no cambia). Mismo patrón que shipmentInstructionsPrint: se arma el HTML y se
// abre en una ventana para imprimir/guardar como PDF.
//
// ⚠ REGLA DURA (decisión §5.2 del plan, owner 2026-08-02): esto es una
// CONSTANCIA, no un contrato. No lleva cláusulas que obliguen (prestaciones,
// ARL, terminación, exclusividad) y la palabra "contrato" no aparece. Deja
// explícito que CTC conecta a las partes. Si algún día CTC quiere una figura
// laboral real, esa redacción la aporta un abogado y se monta aquí.

export type ConstanciaInput = {
  folio: string;
  fincaNombre: string;
  fincaUbicacion: string;
  productorNombre: string;
  recolectorNombre: string;
  recolectorCedula: string | null;
  recolectorCelular: string;
  fechaInicio: string;
  fechaFin: string | null;
  acordadoEl: string; // ISO
  terminos: Record<string, unknown>; // el snapshot congelado
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const fecha = (iso: string) =>
  new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function buildConstanciaHtml(input: ConstanciaInput): string {
  const t = terminosFromRow(input.terminos);
  const lineas = resumenTerminos(t);
  const rango = input.fechaFin
    ? `del ${fecha(input.fechaInicio)} al ${fecha(input.fechaFin)}`
    : `a partir del ${fecha(input.fechaInicio)}`;

  const filas = lineas
    .map((l) => `<tr><th>${esc(l.label)}</th><td>${esc(l.value)}</td></tr>`)
    .join("");

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<title>Constancia de acuerdo · ${esc(input.folio)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #232323; margin: 0; line-height: 1.5; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3C0A86; padding-bottom: 12px; }
  .brand { font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: #3C0A86; font-family: Arial, sans-serif; }
  h1 { font-size: 22px; margin: 4px 0 0; }
  .folio { font-family: "Courier New", monospace; font-size: 11px; color: #6B6459; text-align: right; }
  .lead { margin: 18px 0; font-size: 14px; }
  .partes { display: flex; gap: 16px; margin: 18px 0; }
  .parte { flex: 1; border: 1px solid #DDD8CF; border-radius: 8px; padding: 12px 14px; }
  .parte h2 { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #6B6459; margin: 0 0 6px; font-family: Arial, sans-serif; }
  .parte b { font-size: 15px; display: block; }
  .parte span { font-size: 12.5px; color: #55504A; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid #E9E4DB; font-size: 13.5px; }
  th { width: 34%; font-family: Arial, sans-serif; font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; color: #6B6459; font-weight: 600; }
  .nota { margin-top: 22px; padding: 12px 14px; background: #F7F5F1; border-left: 4px solid #FFCD00; font-size: 12.5px; }
  .firmas { display: flex; gap: 40px; margin-top: 46px; }
  .firma { flex: 1; border-top: 1px solid #55504A; padding-top: 6px; font-size: 12px; color: #55504A; }
  footer { margin-top: 28px; border-top: 1px solid #E9E4DB; padding-top: 10px; font-size: 10.5px; color: #6B6459; font-family: Arial, sans-serif; }
</style></head>
<body>
  <div class="head">
    <div>
      <div class="brand">Terratalento · Colombian Trading Company</div>
      <h1>Constancia de acuerdo</h1>
      <div style="font-size:13px;color:#55504A">Jornada de Recolecta ${esc(rango)}</div>
    </div>
    <div class="folio">Folio<br /><b>${esc(input.folio)}</b><br />${esc(fecha(input.acordadoEl))}</div>
  </div>

  <p class="lead">
    Se deja constancia de que las partes identificadas abajo acordaron los términos de la
    Jornada de Recolecta descrita en este documento. <b>Colombian Trading Company actuó
    conectando a las partes</b> a través de Terratalento.
  </p>

  <div class="partes">
    <div class="parte">
      <h2>La finca</h2>
      <b>${esc(input.fincaNombre)}</b>
      <span>${esc(input.fincaUbicacion)}</span><br />
      <span>Responsable: ${esc(input.productorNombre)}</span>
    </div>
    <div class="parte">
      <h2>El recolector</h2>
      <b>${esc(input.recolectorNombre)}</b>
      ${input.recolectorCedula ? `<span>CC ${esc(input.recolectorCedula)}</span><br />` : ""}
      <span>${esc(input.recolectorCelular)}</span>
    </div>
  </div>

  <h2 style="font-size:13px;font-family:Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#3C0A86;margin-bottom:0">
    Lo acordado
  </h2>
  <table>
    <tr><th>Fechas</th><td>${esc(rango)}</td></tr>
    ${filas}
  </table>

  <div class="nota">
    Este documento registra lo que las partes acordaron el ${esc(fecha(input.acordadoEl))} y refleja
    los términos publicados en ese momento. No sustituye ni reemplaza los acuerdos que la finca y el
    recolector definan directamente entre ellos.
  </div>

  <div class="firmas">
    <div class="firma">Por la finca</div>
    <div class="firma">El recolector</div>
  </div>

  <footer>
    Terratalento · Colombian Trading Company · NIT 901.483.425-7 · info@ctcexport.com<br />
    Generado el ${esc(fecha(new Date().toISOString()))} desde terratalento.ctcexport.com
  </footer>
</body></html>`;
}

/** Abre la constancia en una ventana nueva y dispara el diálogo de impresión. */
export function openConstancia(input: ConstanciaInput): void {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;
  win.document.write(buildConstanciaHtml(input));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
