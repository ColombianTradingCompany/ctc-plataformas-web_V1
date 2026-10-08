"use client";

import { fechaParaElProductor } from "@/lib/trato/fechas";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { checkFileSizeMb } from "@/lib/fileSize";
import { GRUPOS_DE_ATRIBUTOS, MAX_MB_ADJUNTO_CHEQUEO, claveDeChequeo, type GrupoDeAtributo } from "@/lib/eudrAtributos";
import { FieldInfo } from "./ficha/panes/FieldInfo";
import type { Finca } from "./data";

// ── «Chequeos que hace CTCx» (V5.128, owner 2026-10-01) ──────────────────────────────────────────────────────────────
// La pestaña 3 de la finca decía «las áreas de legislación verificadas y el enfoque de sostenibilidad los completa CTC
// […] no requieren acción suya aquí». Ahora el productor MARCA los que quiere que CTCx chequee y los SOLICITA, con una
// nota y una imagen opcionales por cada uno. No es parte del guardado de la finca: es un envío propio (botón «Solicitar
// chequeo»), vive FUERA del fieldset de solo lectura y por eso funciona también con la finca aprobada.
// No frena el Pasaporte: estos atributos documentan la revisión de CTCx, no la declaración del productor.

export type SolicitudDeChequeos = {
  /** Los ítems marcados (nuevos o ya pedidos), con su nota y, si eligió una, la imagen nueva. */
  items: { clave: string; nota: string; archivo: File | null }[];
  /** Los que tenía pedidos y desmarcó. */
  retirar: string[];
};

type Borrador = { on: boolean; nota: string; archivo: File | null };

const VERDE = "#166534";
const VERDE_FONDO = "#DCFCE7";
const AMBAR = "#92400E";
const AMBAR_FONDO = "#FEF3C7";

export function ChequeosCtcx({ finca, onSolicitar }: { finca: Finca | null; onSolicitar: (cambios: SolicitudDeChequeos) => Promise<boolean> }) {
  const { showToast } = useToast();
  const guardadas = finca?.eudrChequeoSolicitudes ?? {};
  const [borrador, setBorrador] = useState<Record<string, Borrador>>(() => {
    const inicial: Record<string, Borrador> = {};
    for (const g of GRUPOS_DE_ATRIBUTOS) {
      for (const o of g.opciones) {
        const clave = claveDeChequeo(g.grupo, o.key);
        inicial[clave] = { on: !!guardadas[clave], nota: guardadas[clave]?.nota ?? "", archivo: null };
      }
    }
    return inicial;
  });
  const [enviando, setEnviando] = useState(false);

  const verificado = (grupo: GrupoDeAtributo, key: string) =>
    grupo === "legal" ? !!finca?.eudrLegalAreas.includes(key) : !!finca?.eudrSustainabilityTags.includes(key);
  const patch = (clave: string, cambio: Partial<Borrador>) => setBorrador((prev) => ({ ...prev, [clave]: { ...prev[clave], ...cambio } }));

  // Lo que cambió frente a lo ya enviado: es lo único que habilita el botón.
  const claves = Object.keys(borrador);
  const hayCambios = claves.some((clave) => {
    const b = borrador[clave];
    const previa = guardadas[clave];
    if (b.on !== !!previa) return true;
    return b.on && (b.nota.trim() !== (previa?.nota ?? "") || !!b.archivo);
  });
  const marcados = claves.filter((c) => borrador[c].on).length;

  function elegirImagen(clave: string, file: File | null) {
    if (!file) return patch(clave, { archivo: null });
    const { ok, mb } = checkFileSizeMb(file, MAX_MB_ADJUNTO_CHEQUEO);
    if (!ok) {
      showToast(`La imagen pesa ${mb.toFixed(1)} MB. El máximo es ${MAX_MB_ADJUNTO_CHEQUEO} MB.`);
      return;
    }
    patch(clave, { archivo: file });
  }

  async function enviar() {
    if (!finca?.id || enviando || !hayCambios) return;
    setEnviando(true);
    const ok = await onSolicitar({
      items: claves.filter((c) => borrador[c].on).map((c) => ({ clave: c, nota: borrador[c].nota, archivo: borrador[c].archivo })),
      retirar: claves.filter((c) => !borrador[c].on && !!guardadas[c]),
    });
    setEnviando(false);
    // Al guardarse, la finca llega con las solicitudes nuevas y el editor vuelve a montar este bloque (ver `key`).
    if (ok) setBorrador((prev) => Object.fromEntries(Object.entries(prev).map(([c, b]) => [c, { ...b, archivo: null }])));
  }

  return (
    <section style={{ border: "1.5px solid var(--line)", borderRadius: 12, padding: 14, margin: "4px 0 16px", background: "var(--paper)" }}>
      <p style={{ fontSize: 13.5, fontWeight: 700, margin: "0 0 4px" }}>Chequeos que hace CTCx</p>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px" }}>
        Las áreas de legislación y el enfoque de sostenibilidad los verifica CTCx en su propia revisión, igual que la evidencia de no
        deforestación. <b>Marque los que quiere que revisemos y solicite el chequeo</b>: a cada uno puede añadirle una nota y una imagen.
        Es opcional y no frena su Pasaporte EUDR.
      </p>

      {GRUPOS_DE_ATRIBUTOS.map((g) => (
        <div key={g.grupo} style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 6px" }}>{g.titulo}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
            {g.opciones.map((o) => {
              const clave = claveDeChequeo(g.grupo, o.key);
              const b = borrador[clave];
              const previa = guardadas[clave];
              const listo = verificado(g.grupo, o.key);
              return (
                <div key={clave} style={{ border: `1.5px solid ${listo ? VERDE : b.on ? "var(--primary)" : "var(--line)"}`, borderRadius: 10, padding: "8px 10px", background: listo ? VERDE_FONDO : "var(--card, #fff)" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, fontWeight: 600, cursor: listo || !finca?.id ? "default" : "pointer" }}>
                    <input
                      type="checkbox"
                      checked={listo || b.on}
                      disabled={listo || !finca?.id || enviando}
                      onChange={(e) => patch(clave, { on: e.target.checked })}
                      style={{ marginTop: 2 }}
                    />
                    <span style={{ flex: 1 }}>
                      {o.label} <FieldInfo text={o.ayuda} />
                    </span>
                  </label>
                  {listo ? (
                    <p style={{ margin: "4px 0 0 24px", fontSize: 11.5, fontWeight: 700, color: VERDE }}>✓ Verificado por CTCx</p>
                  ) : previa ? (
                    <p style={{ margin: "4px 0 0 24px", fontSize: 11.5 }}>
                      <span style={{ background: AMBAR_FONDO, color: AMBAR, fontWeight: 700, borderRadius: 6, padding: "1px 6px" }}>
                        Chequeo solicitado{previa.at ? ` · ${fechaParaElProductor(previa.at)}` : ""}
                      </span>
                    </p>
                  ) : null}
                  {b.on && !listo && (
                    <div style={{ margin: "8px 0 0 24px", display: "grid", gap: 6 }}>
                      <textarea
                        value={b.nota}
                        onChange={(e) => patch(clave, { nota: e.target.value })}
                        rows={2}
                        maxLength={600}
                        disabled={enviando}
                        placeholder="Nota para CTCx (opcional): qué tiene, dónde está, qué quiere que revisemos…"
                        style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 12.5, fontFamily: "var(--font-instrument-sans),sans-serif", background: "var(--paper)", resize: "vertical" }}
                      />
                      <div style={{ fontSize: 12 }}>
                        {previa?.fileName && !b.archivo && <p style={{ margin: "0 0 3px", color: "var(--muted)" }}>📎 {previa.fileName} (ya enviada)</p>}
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, marginBottom: 3 }}>
                          {previa?.fileName ? "Cambiar la imagen (opcional)" : "Adjuntar una imagen (opcional)"}
                        </label>
                        <input type="file" accept="image/*" disabled={enviando} onChange={(e) => elegirImagen(clave, e.target.files?.[0] ?? null)} style={{ fontSize: 12, maxWidth: "100%" }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {finca?.id ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-sm btn-solid" onClick={enviar} disabled={!hayCambios || enviando}>
            {enviando ? "Enviando…" : "Solicitar chequeo"}
          </button>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {hayCambios ? "Tiene cambios sin enviar." : marcados ? `${marcados} chequeo(s) pedido(s). CTCx los verá en su revisión de la finca.` : "Todavía no ha pedido ningún chequeo."}
          </span>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Guarde la finca primero para poder solicitar chequeos.</p>
      )}
    </section>
  );
}
