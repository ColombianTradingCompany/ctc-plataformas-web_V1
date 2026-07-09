import { INTL_CERTS, MESH, ORIGIN_CERTS, SCA_ATTRS, num, type FichaFormData } from "./fichaData";

type Factor = { start: number; remainder: number; yieldLoss: number; healthy: number; yieldFactor: number | null };
type Mesh = { rows: { key: string; label: string; grams: number; pct: number | null }[]; sum: number; totalPct: number; bad: boolean };
type Sca = { values: number[]; total: number; cls: "Especialidad" | "Comercial" | "Sin puntaje" };

function esc(s: string | undefined | null) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

function di(k: string, v: string) {
  return v && v.trim() ? `<div class="di"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>` : "";
}

export function renderFichaHtml(data: FichaFormData, factor: Factor, mesh: Mesh, sca: Sca, varTotal: number, spiderSvg: string) {
  const oc = ORIGIN_CERTS.filter(([key]) => data[key as keyof FichaFormData] as boolean).map(([, label]) => label);
  if (data.origin_cert_other && data.origin_cert_other_text) oc.push(data.origin_cert_other_text);
  const ic = INTL_CERTS.filter(([key]) => data[key as keyof FichaFormData] as boolean).map(([, , label]) => label);
  if (data.intl_other && data.intl_cert_other_text) ic.push(data.intl_cert_other_text);

  const varieties = data.varieties.filter((v) => v.pct || v.name);
  const tags = [
    data.species,
    data.harvest_year && `Cosecha ${data.harvest_year}${data.harvest_season ? " · " + data.harvest_season.split(" ")[0] : ""}`,
    data.origin_category,
    data.hs_code,
  ].filter(Boolean) as string[];

  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

  const meshRows = MESH.map(([key, label]) => {
    const w = num(data[key as keyof FichaFormData] as string);
    return w
      ? `<div class="di"><span class="k">${esc(label)}</span><span class="v">${w.toFixed(1)} g${factor.remainder > 0 ? " · " + ((w / factor.remainder) * 100).toFixed(1) + "%" : ""}</span></div>`
      : "";
  }).join("");

  const scaLine = SCA_ATTRS.map(([, label], i) => (sca.values[i] ? `${label.split("/")[0]} ${sca.values[i].toFixed(2)}` : "")).filter(Boolean).join(" · ");

  return `
<div class="ficha">
  <div class="ficha-header">
    <div>
      <div class="co">Colombian Trading Company · Green Coffee Datasheet</div>
      <div class="pname">${esc(data.product_name || "Producto sin nombre")}</div>
      ${data.razon_social ? `<div class="prov">Proveedor: <b>${esc(data.razon_social)}</b></div>` : ""}
      <div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    </div>
    <div class="ctc-mark">
      <div class="logo-sm">CTC</div>
      <div>CTC UID: ${esc(data.ctc_uid || "—")}</div>
      <div>${esc(data.revision_date || dateStr)}</div>
      <div class="confidential">CONFIDENCIAL</div>
    </div>
  </div>
  <div class="ficha-gold"></div>
  <div class="ficha-body">

    <div class="ficha-section">
      <h3>Identidad & Trazabilidad</h3>
      <div class="dl">
        ${di("Proveedor", data.razon_social)}${di("NIT / RUT", data.nit_rut)}
        ${di("CTC UID", data.ctc_uid)}${di("Productor", data.productor)}
        ${di("Especie", data.species)}${di("Tipo de Producto", data.product_type)}
        ${di("HS Code (NANDINA)", data.hs_code)}${di("Revisión", data.revision_date)}
        ${di("Año de Cosecha", data.harvest_year)}${di("Temporada", data.harvest_season)}
      </div>
    </div>

    <div class="ficha-section">
      <h3>Origen</h3>
      <div class="dl">
        ${di("Categoría", data.origin_category)}${di("Finca", data.estate)}
        ${di("País", data.country)}${di("Departamento", data.region_dep)}
        ${di("Municipio", data.county_muni || data.county_muni_text)}
        ${di("M.A.S.L.", data.masl && data.masl + " msnm")}
        ${di("Geo Referencia", data.geo_ref)}${di("Edad Plantación", data.plantation_age && data.plantation_age + " años")}
      </div>
      ${data.multi_origin_specs ? `<p class="prose">Blend specs: ${esc(data.multi_origin_specs)}</p>` : ""}
      ${data.about_origin ? `<p class="prose">${esc(data.about_origin)}</p>` : ""}
    </div>

    ${
      oc.length || ic.length || data.awards
        ? `<div class="ficha-section">
      <h3>Certificaciones & Reconocimientos</h3>
      ${oc.length ? `<p class="chipslabel">ORIGEN</p><div class="chips">${oc.map((c) => `<span class="chip navy">${esc(c)}</span>`).join("")}</div>` : ""}
      ${ic.length ? `<p class="chipslabel">INTERNACIONALES</p><div class="chips">${ic.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>` : ""}
      ${data.awards ? `<div class="dl one">${di("Premios & Rankings", data.awards)}</div>` : ""}
    </div>`
        : ""
    }

    ${
      varieties.length
        ? `<div class="ficha-section">
      <h3>Variedades del Lote${varTotal ? ` · ${varTotal}%` : ""}</h3>
      <div class="dl">${varieties.map((v) => `<div class="di"><span class="k">${v.pct ? v.pct + "% · " : ""}${esc(v.name || "—")}</span></div>`).join("")}</div>
    </div>`
        : ""
    }

    <div class="ficha-section">
      <h3>Caracterización Básica</h3>
      <div class="dl">
        ${di("Humedad del Grano", data.green_bean_humidity && data.green_bean_humidity + " %")}
        ${di("Densidad", data.green_bean_density && data.green_bean_density + " g/L")}
        ${di("Actividad de Agua", data.water_activity && data.water_activity + " aW")}
        ${di("Proceso Base", data.base_processing)}
        ${di("Proceso Especial", data.special_processing)}
        ${di("Factor de Rendimiento (productor)", data.yield_factor_producer)}
      </div>
    </div>

    ${
      sca.total > 0
        ? `<div class="ficha-section">
      <h3>Perfil Sensorial · SCA</h3>
      <div class="scagrid">
        <div class="spiderbox">${spiderSvg}</div>
        <div>
          <div class="scoreband">
            <span class="big">${sca.total.toFixed(2)}</span>
            <div>
              <div class="scoreclass">${sca.total >= 80 ? "Café de Especialidad ≥ 80 pts" : "Café Comercial"}</div>
              <div class="prose">${esc(scaLine)}</div>
            </div>
          </div>
          ${data.cupping_profile ? `<p class="prose">${esc(data.cupping_profile)}</p>` : ""}
        </div>
      </div>
    </div>`
        : data.cupping_profile
          ? `<div class="ficha-section"><h3>Perfil Sensorial</h3><p class="prose">${esc(data.cupping_profile)}</p></div>`
          : ""
    }

    ${
      factor.remainder || factor.healthy || meshRows
        ? `<div class="ficha-section">
      <h3>Caracterización Física</h3>
      <div class="dl">
        ${di("Muestra Pergamino Inicial", data.fa_start && data.fa_start + " g")}
        ${di("Humedad Pergamino", data.fa_parch_hum && data.fa_parch_hum + " %")}
        ${di("Pérdida por Trilla", factor.yieldLoss ? factor.yieldLoss.toFixed(1) + " g" : "")}
        ${di("Trillado Verde Restante", factor.remainder ? factor.remainder + " g" : "")}
        ${di("Grano Sano", factor.healthy ? factor.healthy.toFixed(1) + " g" + (factor.remainder > 0 ? " · " + ((factor.healthy / factor.remainder) * 100).toFixed(1) + "%" : "") : "")}
        ${di("Defecto Primario", data.fa_primary_defect && data.fa_primary_defect + " g")}
        ${di("Defecto Secundario", data.fa_secondary_defect && data.fa_secondary_defect + " g")}
        ${di("Factor de Rendimiento", factor.yieldFactor !== null ? factor.yieldFactor.toFixed(2) : "")}
      </div>
      ${meshRows ? `<p class="chipslabel">GRANULOMETRÍA</p><div class="dl">${meshRows}</div>` : ""}
    </div>`
        : ""
    }

    ${
      data.analysis_notes || data.qgrader_1 || data.qgrader_2 || data.qgrader_3
        ? `<div class="ficha-section">
      <h3>Notas & Referencias Q-Grader</h3>
      ${data.analysis_notes ? `<p class="prose">${esc(data.analysis_notes)}</p>` : ""}
      <div class="dl">${di("Q-Grader Ref 1", data.qgrader_1)}${di("Q-Grader Ref 2", data.qgrader_2)}${di("Q-Grader Ref 3", data.qgrader_3)}</div>
    </div>`
        : ""
    }

    <div class="pi-note">
      <strong>AVISO DE PROPIEDAD INTELECTUAL & CONFIDENCIALIDAD</strong><br>
      Este documento es propiedad de <strong>Colombian Trading Company (CTC)</strong> y contiene información técnica y comercial confidencial. Queda prohibida su reproducción, distribución o divulgación sin previa autorización escrita. Consultas: <strong>info@colombiantradingcompany.com</strong><br>
      <span class="copyright">© ${now.getFullYear()} Colombian Trading Company · Green Coffee Datasheet System v2.0 · Generado: ${dateStr}</span>
    </div>
  </div>
  <div class="ficha-foot">
    <span>Colombian Trading Company · Ficha Técnica Café Verde</span>
    <span>${esc(data.ctc_uid || "—")} · ${dateStr}</span>
  </div>
</div>`;
}

export const FICHA_PREVIEW_CSS = `
.ficha{background:#fff;max-width:880px;margin:0 auto;border:1px solid #DDD9EE;box-shadow:0 1px 4px rgba(0,0,0,.07);font-family:'Helvetica Neue',Arial,'Segoe UI',system-ui,sans-serif;color:#12101A;font-size:14px;line-height:1.5}
.ficha .co{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#D3B8FA;margin-bottom:3px}
.ficha-header{background:#3C0A86;color:#fff;padding:22px 28px 18px;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start}
.ficha .pname{font-size:22px;font-weight:700;letter-spacing:-.01em}
.ficha .prov{font-family:ui-monospace,monospace;font-size:11.5px;color:#D3B8FA;margin-top:4px;letter-spacing:.03em}
.ficha .prov b{color:#fff;font-weight:600}
.ficha .tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.ficha .tag{font-family:ui-monospace,monospace;font-size:10.5px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:2px;padding:2px 8px}
.ficha .ctc-mark{text-align:right;font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.1em;color:#D3B8FA}
.ficha .logo-sm{width:36px;height:36px;background:#FFCD00;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:10px;letter-spacing:-.5px;color:#3C0A86;margin-bottom:4px;margin-left:auto}
.ficha .confidential{margin-top:3px;opacity:.7}
.ficha-gold{background:#FFCD00;height:4px}
.ficha-body{padding:20px 28px}
.ficha-section{margin-bottom:18px}
.ficha-section h3{font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:#3C0A86;border-bottom:1px solid #DDD9EE;padding-bottom:5px;margin-bottom:10px;font-weight:700;display:flex;align-items:center;gap:8px}
.ficha-section h3::before{content:"";display:inline-block;width:3px;height:12px;background:#FFCD00;border-radius:1px}
.dl{display:grid;grid-template-columns:repeat(2,1fr);gap:2px 24px}
.dl.one{grid-template-columns:1fr}
.di{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-family:ui-monospace,monospace;font-size:11.5px;padding:3.5px 0;border-bottom:1px dotted #ECEAF8}
.di .k{color:#4E4A60;flex:0 0 auto}
.di .v{color:#12101A;font-weight:600;text-align:right}
.prose{font-size:12.5px;line-height:1.55;color:#12101A;margin-top:8px}
.chipslabel{font-size:10.5px;color:#4E4A60;font-family:ui-monospace,monospace;margin:12px 0 5px}
.chips{display:flex;flex-wrap:wrap;gap:5px}
.chip{font-family:ui-monospace,monospace;font-size:10.5px;background:#F2EDFD;border:1px solid #D3B8FA;color:#3C0A86;padding:2px 8px;border-radius:2px}
.chip.navy{background:#EEF3FB;border-color:#BDD0EE;color:#003087}
.scagrid{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center}
.spiderbox{width:180px;flex:0 0 auto}
.spiderbox svg{width:100%;display:block}
.scoreband{display:flex;align-items:center;gap:14px;background:#F5F3FC;border:1px solid #D3B8FA;border-radius:3px;padding:10px 14px;margin-bottom:10px}
.scoreband .big{font-family:ui-monospace,monospace;font-size:28px;font-weight:700;color:#3C0A86}
.scoreclass{font-family:ui-monospace,monospace;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#003087;font-weight:700}
.pi-note{margin-top:14px;border-top:1px solid #DDD9EE;padding-top:12px;font-family:ui-monospace,monospace;font-size:10px;color:#4E4A60;line-height:1.6}
.pi-note strong{color:#C8102F}
.copyright{opacity:.7}
.ficha-foot{background:#F5F3FC;border-top:2px solid #3C0A86;padding:12px 28px;display:flex;justify-content:space-between;align-items:center;font-family:ui-monospace,monospace;font-size:10px;color:#4E4A60}
@media print{
  body *{visibility:hidden}
  .ficha-print-root,.ficha-print-root *{visibility:visible}
  .ficha-print-root{position:absolute;left:0;top:0;width:100%}
}
`;
