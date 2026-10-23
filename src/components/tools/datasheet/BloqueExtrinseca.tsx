"use client";

// ── Caracterización extrínseca · formato SCA 105 (V6.6) ───────────────────────────────────────────────────────────────
// Cinco categorías (Cultivo · Procesamiento · Comercio · Certificaciones · Otro). La casilla verde junto a cada campo es la
// del formato oficial: se enciende cuando hay información. Lo que ya vive en otra parte (variedad y proceso en B1; precio al
// productor y cantidades en la Información Comercial) se ENSEÑA aquí, no se vuelve a pedir — un dato, un sitio.

import { DEP_MUNI, HS_CODES } from "@/components/kaffetal-regal/ficha/fichaData";
import { INFO_PLANILLA } from "@/lib/arena/planillaInfo";
import type { IdiomaDePlanilla } from "@/lib/arena/planillaI18n";
import { Info } from "@/components/bcp/PlanillaPiezas";
import { CERT_OFICIALES, CERT_OTRAS, casillasExtrinsecas, precioTx, type Extrinseca, type Lote } from "./estado";
import { E } from "./estilos";
import { TX } from "./textos";

const PAISES = ["Colombia", "Brasil", "Perú", "Ecuador", "Bolivia", "Venezuela", "Panamá", "Costa Rica", "Nicaragua", "Honduras", "El Salvador", "Guatemala", "México", "Etiopía", "Kenia", "Ruanda", "Burundi", "Tanzania", "Uganda", "Indonesia", "Vietnam", "India", "Yemen"];

export function Casilla({ on }: { on: boolean }) {
  return <span aria-hidden style={{ ...E.casilla, ...(on ? E.casillaOn : {}) }}>✓</span>;
}

export function BloqueExtrinseca({ lote, lang, onExt, disabled }: { lote: Lote; lang: IdiomaDePlanilla; onExt: (patch: Partial<Extrinseca>) => void; disabled?: boolean }) {
  const t = TX[lang];
  const e = lote.ext;
  const info = (k: keyof (typeof INFO_PLANILLA)["es"]) => {
    const x = INFO_PLANILLA[lang][k];
    return <Info texto={x.texto} titulo={x.titulo} std={x.std} />;
  };
  const cas = casillasExtrinsecas(lote);
  const campo = (lbl: string, key: keyof Extrinseca, o?: { casilla?: string; ph?: string; lista?: string; ancho?: number }) => (
    <label style={E.par}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {o?.casilla && <Casilla on={!!cas.marca[o.casilla]} />}
        {lbl}
      </span>
      <input value={e[key] as string} list={o?.lista} placeholder={o?.ph} disabled={disabled} aria-label={lbl} onChange={(ev) => onExt({ [key]: ev.target.value } as Partial<Extrinseca>)} style={{ ...E.num, width: o?.ancho ?? 190 }} />
    </label>
  );
  const area = (lbl: string, key: keyof Extrinseca, ph: string, casilla?: string) => (
    <div style={{ marginTop: 8 }}>
      <label style={{ ...E.lbl, display: "flex", alignItems: "center", gap: 6 }}>
        {casilla && <Casilla on={!!cas.marca[casilla]} />}
        {lbl}
      </label>
      <textarea rows={2} value={e[key] as string} placeholder={ph} disabled={disabled} onChange={(ev) => onExt({ [key]: ev.target.value } as Partial<Extrinseca>)} style={{ ...E.input, fontFamily: "inherit" }} />
    </div>
  );
  const derivado = (lbl: string, valor: string, de: string, casilla: string) => (
    <div style={E.par}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Casilla on={!!cas.marca[casilla]} />
        {lbl} <small style={{ color: "var(--muted)" }}>· {de}</small>
      </span>
      <b style={{ textAlign: "right" }}>{valor || "—"}</b>
    </div>
  );
  const cert = (k: string, on: boolean, extra: boolean) => (
    <label key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, border: `1px ${extra ? "dashed" : "solid"} var(--line)`, borderRadius: 7, padding: "4px 9px", background: on ? "#E8F5EE" : "var(--paper)", cursor: "pointer" }}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(ev) => onExt({ certs: { ...e.certs, [k]: ev.target.checked } })} />
      {t.ce[k]}
    </label>
  );
  const titulo = (txt: string, infoKey: keyof (typeof INFO_PLANILLA)["es"], g: keyof typeof cas.cuenta) => (
    <h6 style={{ ...E.h6, display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span>{txt} {info(infoKey)}</span>
      <span style={{ fontWeight: 400, color: "var(--muted)" }}>{cas.cuenta[g][0]} / {cas.cuenta[g][1]}</span>
    </h6>
  );
  const variedades = lote.b1.variedades.filter((v) => v.nombre.trim()).map((v) => (v.pct ? `${v.pct} % ${v.nombre}` : v.nombre)).join(" · ");
  const proceso = lote.b1.proceso === "Otro" ? lote.b1.proceso_otro || "Otro" : lote.b1.proceso;
  const tamano = [lote.com.verde_kg && `${lote.com.verde_kg} kg verde`, lote.com.pergamino_kg && `${lote.com.pergamino_kg} kg pergamino`].filter(Boolean).join(" · ");
  const hs = HS_CODES.find((h) => h[1] === e.hs);

  return (
    <>
      <div style={E.seccion}>
        <h5 style={E.h}>{t.ext} {info("e_que")}</h5>
        <span style={E.pill}>{t.extCuenta(cas.total)}</span>
      </div>
      <p style={E.hint}>{t.extNota}</p>
      <datalist id="cdt-paises">{PAISES.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="cdt-deps">{Object.keys(DEP_MUNI).filter((d) => d !== "Multi-Origin").sort().map((d) => <option key={d} value={d} />)}</datalist>
      <datalist id="cdt-munis">{(DEP_MUNI[e.region] ?? []).map((m) => <option key={m} value={m} />)}</datalist>
      <div style={E.dosCol}>
        <div style={E.bloque}>
          {titulo(t.xCultivo, "e_cultivo", "cultivo")}
          <div style={E.pares}>
            {campo(t.xPais, "pais", { casilla: "pais", lista: "cdt-paises" })}
            {campo(t.xRegion, "region", { casilla: "region", lista: "cdt-deps" })}
            {campo(t.xMuni, "municipio", { lista: "cdt-munis" })}
            {campo(t.xFinca, "finca", { casilla: "finca" })}
            {campo(t.xProductor, "productor", { casilla: "productor" })}
            {derivado(t.variedades, variedades, "B1", "variedad")}
            {campo(t.xCosecha, "cosecha", { casilla: "cosecha", ph: "2026 · Mitaca", ancho: 150 })}
            {campo(t.xAltitud, "altitud", { ph: "1650", ancho: 110 })}
            {campo(t.xGeo, "geo", { ph: "6.5581, -73.1320" })}
          </div>
          {area(t.xCultivoInfo, "cultivo_info", t.xCultivoPh, "cultivo_otro")}
        </div>
        <div style={E.bloque}>
          {titulo(t.xProceso, "e_proceso", "proceso")}
          <div style={E.pares}>
            {campo(t.xHumedo, "humedo", { casilla: "humedo" })}
            {campo(t.xTrilla, "trilla", { casilla: "trilla" })}
            {campo(t.xProcOtro, "proc_otro", { casilla: "proc_otro" })}
            {derivado(t.xTipo, proceso, t.xTipoDeB1, "tipo")}
            <label style={E.par}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Casilla on={e.descaf === "si"} />{t.xDescaf}</span>
              <select value={e.descaf} disabled={disabled} onChange={(ev) => onExt({ descaf: ev.target.value as Extrinseca["descaf"], ...(ev.target.value !== "si" ? { descaf_cual: "" } : {}) })} style={E.sel}>
                <option value="">—</option>
                <option value="no">{t.xNo}</option>
                <option value="si">{t.xSi}</option>
              </select>
            </label>
            {e.descaf === "si" && campo(t.xDescafCual, "descaf_cual", { ph: "EA · CO₂ · agua" })}
          </div>
          {area(t.xProcDesc, "proc_desc", t.xProcDescPh, "proc_desc")}
          {area(t.xProcInfo, "proc_info", "")}
        </div>
        <div style={E.bloque}>
          {titulo(t.xComercio, "e_comercio", "comercio")}
          <div style={E.pares}>
            {campo(t.xGrado, "grado", { casilla: "grado", ph: t.xGradoPh })}
            {campo(t.xOic, "oic", { casilla: "oic", ph: "003-0000-00000", ancho: 150 })}
            {campo(t.xExport, "exportador", { casilla: "exportador" })}
            {campo(t.xImport, "importador", { casilla: "importador" })}
            {derivado(t.xPrecio, precioTx(lote.com.farm_gate, lote.com.farm_gate_unidad), t.xDeCom, "precio")}
            {derivado(t.xTamano, tamano, t.xDeCom, "tamano")}
            {campo(t.xProveedor, "proveedor", { casilla: "comercio_otro" })}
            {campo(t.xNit, "nit")}
            <label style={E.par}>
              <span>{t.xHs}</span>
              <select value={e.hs} disabled={disabled} onChange={(ev) => onExt({ hs: ev.target.value })} style={{ ...E.sel, maxWidth: 240 }}>
                <option value="">—</option>
                {HS_CODES.map((h) => (
                  <option key={h[1]} value={h[1]}>{h[1]} · {h[0]}</option>
                ))}
              </select>
            </label>
            {hs && <div style={{ ...E.par, fontSize: 11.5, color: "var(--muted)" }}><span>HS</span><span>{hs[0]}</span></div>}
          </div>
          {area(t.xComInfo, "comercio_info", t.xComPh)}
        </div>
        <div style={E.bloque}>
          {titulo(t.xCerts, "e_certs", "certs")}
          <div style={{ ...E.lbl, fontWeight: 400, color: "var(--muted)" }}>{t.xCertOficial}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{CERT_OFICIALES.map((k) => cert(k, !!e.certs[k], false))}</div>
          <div style={{ ...E.lbl, fontWeight: 400, color: "var(--muted)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Casilla on={!!cas.marca.c_otra} />{t.xCertMas}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{CERT_OTRAS.map((k) => cert(k, !!e.certs[k], true))}</div>
          <div style={{ ...E.pares, marginTop: 8 }}>{campo(t.xCertOtro, "cert_otro")}</div>
          {area(t.xCertInfo, "cert_info", t.xCertPh)}
          <div style={{ marginTop: 12 }}>
            {titulo(t.xOtro, "e_otro", "otro")}
            {area(t.xPremios, "premios", t.xPremiosPh, "premios")}
            {area(t.xHistoria, "historia", t.xHistoriaPh)}
          </div>
        </div>
      </div>
    </>
  );
}
