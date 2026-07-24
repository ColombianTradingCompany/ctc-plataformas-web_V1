import type { MiFicha } from "./types";

// Perfil del Directorio como HTML imprimible → PDF. Mismo patrón que las
// instrucciones de envío de Kaffetal Regal (Blob URL + window.open, con
// descarga de respaldo si el popup se bloquea), pero además auto-lanza el
// diálogo de impresión para "Guardar como PDF".

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ESTADO: Record<MiFicha["estado"], string> = {
  pendiente: "En revisión",
  en_revision: "En revisión",
  aprobado: "Aprobada · pendiente de activar",
  verificado: "Verificado por CTC",
  rechazado: "No aprobada",
};

function perfilHtml(f: MiFicha): string {
  const lugar = [f.municipio, f.departamento].filter(Boolean).join(", ") || "Colombia";
  const tag = (t: string) => `<span class="tag">${esc(t)}</span>`;
  const contacto: string[] = [];
  if (f.mostrarTelefono && f.telefono) contacto.push(`Tel: ${esc(f.telefono)}`);
  if (f.mostrarCorreo && f.correo) contacto.push(`Correo: ${esc(f.correo)}`);

  const docs = f.documentos.length
    ? `<table class="docs"><thead><tr><th>Documento</th><th>Tipo</th><th>Apoya</th><th>Enlace</th></tr></thead><tbody>${f.documentos
        .map((d) => {
          const apoya = d.enlazaA ? `${d.enlazaA === "certificacion" ? "Cert." : "Esp."}: ${esc(d.enlaceValor ?? "")}` : "General";
          const enlace = d.url ? `<a href="${esc(d.url)}">${d.kind === "url" ? "abrir enlace" : "archivo"}</a>` : "—";
          return `<tr><td>${esc(d.nombre)}</td><td>${esc(d.tipo)}</td><td>${apoya}</td><td>${enlace}</td></tr>`;
        })
        .join("")}</tbody></table>`
    : `<p class="muted">Sin documentos adjuntos.</p>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Perfil · ${esc(f.nombre)} · Directorio del Café</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #221033; margin: 0; }
  .top { border-bottom: 3px solid #3C0A86; padding-bottom: 10px; margin-bottom: 18px; display:flex; justify-content:space-between; align-items:flex-end; }
  .brand { font-family: Arial, Helvetica, sans-serif; letter-spacing: .12em; text-transform: uppercase; font-size: 11px; color: #3C0A86; font-weight: 700; }
  h1 { font-size: 26px; margin: 4px 0 0; }
  .code { font-family: "Courier New", monospace; font-size: 12px; color: #6b567f; }
  .estado { display:inline-block; margin-top:4px; font-family: Arial, sans-serif; font-size: 11px; background:#F3ECFB; color:#3C0A86; border:1px solid #D3B8FA; border-radius:999px; padding:3px 10px; }
  .lugar { color:#5b4a6e; margin:6px 0 16px; font-size: 14px; }
  h2 { font-family: Arial, sans-serif; font-size: 12px; letter-spacing:.08em; text-transform:uppercase; color:#3C0A86; border-bottom:1px solid #e6ddf2; padding-bottom:4px; margin:18px 0 8px; }
  .tags { display:flex; flex-wrap:wrap; gap:6px; }
  .tag { font-family: Arial, sans-serif; font-size: 11px; border:1px solid #D3B8FA; color:#3C0A86; border-radius:999px; padding:3px 10px; }
  p { line-height:1.5; font-size: 13.5px; }
  .muted { color:#8a7a9c; font-size:12.5px; }
  .quote { font-style: italic; color:#4a3a63; border-left:3px solid #FFCD00; padding-left:10px; }
  table.docs { width:100%; border-collapse: collapse; font-size: 12px; font-family: Arial, sans-serif; }
  table.docs th, table.docs td { text-align:left; padding:6px 8px; border-bottom:1px solid #eee; }
  table.docs th { color:#6b567f; text-transform:uppercase; font-size:10px; letter-spacing:.06em; }
  a { color:#1F4FB0; }
  footer { margin-top:26px; border-top:1px solid #e6ddf2; padding-top:8px; font-family: Arial, sans-serif; font-size: 10.5px; color:#8a7a9c; }
</style></head>
<body onload="window.print()">
  <div class="top">
    <div>
      <div class="brand">Directorio del Café · Colombia</div>
      <h1>${esc(f.nombre || "Ficha del Directorio")}</h1>
      <div class="code">${esc(f.codigo)}</div>
    </div>
    <div style="text-align:right"><span class="estado">${ESTADO[f.estado]}</span></div>
  </div>
  <p class="lugar">${esc(lugar)} · ${f.anios} años de experiencia${contacto.length ? " · " + contacto.join(" · ") : ""}</p>

  ${f.esp.length ? `<h2>¿A qué se dedica?</h2><div class="tags">${f.esp.map(tag).join("")}</div>` : ""}
  ${f.cert.length ? `<h2>Certificaciones y experiencia</h2><div class="tags">${f.cert.map(tag).join("")}</div>` : ""}
  ${f.bio ? `<h2>Presentación</h2><p>${esc(f.bio)}</p>` : ""}
  ${f.motivoTxt ? `<p class="quote">“${esc(f.motivoTxt)}”</p>` : ""}
  <h2>Documentos y soportes</h2>${docs}

  <footer>Directorio de Especialistas del Café · Colombian Trading Company · NIT 901.483.425-7 · ctcexport.com</footer>
</body></html>`;
}

export function abrirPerfilPdf(ficha: MiFicha) {
  const blob = new Blob([perfilHtml(ficha)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `perfil-${ficha.codigo}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
