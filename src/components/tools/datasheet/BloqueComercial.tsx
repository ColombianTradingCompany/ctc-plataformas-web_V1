"use client";

// ── Información Comercial (V6.6, owner 2026-10-23) ────────────────────────────────────────────────────────────────────
// «Blocks to specify available quantity of parchment and green coffee, Farm Gate Price, FOB price, CIP or DDP price (and
// to which region), packaging notes, Quality Norm (UGQ…) and additional condition notes; also a "Valid until" date.»
// No calcula ni convierte nada: registra lo que el vendedor declara, con su unidad, y la fecha hasta la que vale.

import { INFO_PLANILLA } from "@/lib/arena/planillaInfo";
import type { IdiomaDePlanilla } from "@/lib/arena/planillaI18n";
import { Info } from "@/components/bcp/PlanillaPiezas";
import { INCOTERMS, NORMAS_CALIDAD, UNIDADES_PRECIO, vigenciaDe, type Comercial } from "./estado";
import { E } from "./estilos";
import { TX } from "./textos";

export function BloqueComercial({ com, lang, onCom, disabled, hoyIso }: { com: Comercial; lang: IdiomaDePlanilla; onCom: (patch: Partial<Comercial>) => void; disabled?: boolean; hoyIso: string }) {
  const t = TX[lang];
  const info = (k: keyof (typeof INFO_PLANILLA)["es"]) => {
    const x = INFO_PLANILLA[lang][k];
    return <Info texto={x.texto} titulo={x.titulo} std={x.std} />;
  };
  const texto = (key: keyof Comercial, extra?: { ph?: string; ancho?: number }) => (
    <input value={com[key]} disabled={disabled} placeholder={extra?.ph} aria-label={String(key)} onChange={(e) => onCom({ [key]: e.target.value } as Partial<Comercial>)} style={{ ...E.num, width: extra?.ancho ?? 110 }} />
  );
  const unidad = (key: "farm_gate_unidad" | "fob_unidad" | "destino_unidad") => (
    <select value={com[key]} disabled={disabled} aria-label={t.unidad} onChange={(e) => onCom({ [key]: e.target.value } as Partial<Comercial>)} style={{ ...E.sel, fontSize: 11.5 }}>
      {UNIDADES_PRECIO.map((u) => (
        <option key={u} value={u}>{u}</option>
      ))}
    </select>
  );
  const vig = vigenciaDe(com.valido_hasta, hoyIso);

  return (
    <>
      <div style={E.seccion}>
        <h5 style={E.h}>{t.com} {info("c_que")}</h5>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
          <span style={{ fontWeight: 600 }}>{t.validoHasta} {info("c_validez")}</span>
          <input type="date" value={com.valido_hasta} disabled={disabled} onChange={(e) => onCom({ valido_hasta: e.target.value })} style={{ ...E.num, width: 150 }} />
          {vig === "vencida" && <span style={{ ...E.pill, color: "#C4402F", borderColor: "#C4402F", fontWeight: 700 }}>{t.vencida}</span>}
        </label>
      </div>
      <p style={E.hint}>{t.comNota}</p>
      <div style={E.dosCol}>
        <div style={E.bloque}>
          <h6 style={E.h6}>{t.disponible}</h6>
          <div style={E.pares}>
            <label style={E.par}><span>{t.pergaminoKg}</span>{texto("pergamino_kg", { ancho: 96 })}</label>
            <label style={E.par}><span>{t.verdeKg}</span>{texto("verde_kg", { ancho: 96 })}</label>
          </div>
          <h6 style={{ ...E.h6, marginTop: 12 }}>{t.precios} {info("c_precios")}</h6>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={E.par}>
              <span>{t.farmGate}</span>
              <span style={{ display: "inline-flex", gap: 6 }}>{texto("farm_gate", { ancho: 90 })}{unidad("farm_gate_unidad")}</span>
            </div>
            <div style={E.par}>
              <span>{t.fob}</span>
              <span style={{ display: "inline-flex", gap: 6 }}>{texto("fob", { ancho: 90 })}{unidad("fob_unidad")}</span>
            </div>
            <label style={E.par}>
              <span>{t.fobPuerto}</span>
              {texto("fob_puerto", { ph: t.fobPuertoPh, ancho: 220 })}
            </label>
            <div style={E.par}>
              <span>{t.destino}</span>
              <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <select value={com.incoterm} disabled={disabled} aria-label={t.incoterm} onChange={(e) => onCom({ incoterm: e.target.value as Comercial["incoterm"] })} style={{ ...E.sel, fontSize: 11.5 }}>
                  {INCOTERMS.map((i) => (
                    <option key={i} value={i}>{i || t.incoterm}</option>
                  ))}
                </select>
                {texto("destino_precio", { ancho: 90 })}
                {unidad("destino_unidad")}
              </span>
            </div>
            <label style={E.par}>
              <span>{t.destinoRegion}</span>
              {texto("destino_region", { ph: t.destinoRegionPh, ancho: 220 })}
            </label>
          </div>
        </div>
        <div style={E.bloque}>
          <h6 style={E.h6}>{t.condiciones}</h6>
          <div style={E.pares}>
            <label style={E.par}>
              <span>{t.norma}</span>
              <select value={com.norma} disabled={disabled} onChange={(e) => onCom({ norma: e.target.value })} style={E.sel}>
                <option value="">—</option>
                {NORMAS_CALIDAD.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            {com.norma === "Otra" && (
              <label style={E.par}>
                <span>{t.normaOtra}</span>
                {texto("norma_otra", { ancho: 160 })}
              </label>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={E.lbl}>{t.empaque}</label>
            <textarea rows={2} value={com.empaque} disabled={disabled} placeholder={t.empaquePh} onChange={(e) => onCom({ empaque: e.target.value })} style={{ ...E.input, fontFamily: "inherit" }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={E.lbl}>{t.condicionesNotas}</label>
            <textarea rows={3} value={com.condiciones} disabled={disabled} placeholder={t.condicionesPh} onChange={(e) => onCom({ condiciones: e.target.value })} style={{ ...E.input, fontFamily: "inherit" }} />
          </div>
        </div>
      </div>
    </>
  );
}
