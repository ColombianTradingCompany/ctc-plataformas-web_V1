"use client";

import { useEffect, useRef, useState } from "react";
import { clausulasDelContrato, type DatosDelContrato } from "@/lib/trato/contrato";
import { documentoDelFirmante, TIPO_DE_DOCUMENTO_LABEL, TIPOS_DE_DOCUMENTO, validarDocumento, type TipoDeDocumento } from "@/lib/trato/documento";
import { diaEnColombia } from "@/lib/trato/fechas";

// ── V5.168 (owner, 2026-10-06) · el contrato y la firma con el dedo ─────────────────────────────────────────────────────
// «Al final, el Productor debe tomar la decisión y con ella se formula un contrato con un feature de firmar con el dedo.»
// El productor lee las cláusulas armadas con SU decisión (la misma función que firma el servidor, `clausulasDelContrato`),
// escribe su nombre y firma en el recuadro con el dedo (o el ratón). La firma viaja como PNG a la acción que acepta la oferta,
// que guarda la imagen en Storage privado, la fecha, el dispositivo y la huella del texto firmado.
// V5.188 (feedback de revisión): con el nombre va el DOCUMENTO de quien firma —la cédula de ciudadanía por defecto—, que el texto del
// contrato dice («identificado(a) con CC 1.098.765.432») y el servidor valida, firma con la huella y guarda (`documento.ts`).
// V5.190 (owner, 2026-10-08): en una SESIÓN ASISTIDA, justo debajo de la casilla, «Aceptar contrato provisionalmente» (resaltado): CTCx
// acepta en favor del Productor sin insertar su firma, su nombre ni su documento, con el «Nombre de responsable CTCx»; el texto que se
// enseña es el provisional. El error del último intento se queda a la vista junto al botón (antes solo salía un aviso fugaz: el
// 2026-10-08 «carga, pero no hace nada»). El mismo componente sirve para RATIFICAR (`titulo`, `textoBoton`, `arriba`).

export type FirmaDelProductor = { nombre: string; documentoTipo: TipoDeDocumento; documentoNumero: string; imagenPng: string };

const AMBAR = "#E8A317";
const AMBAR_SUAVE = "#FFF4DC";
const AMBAR_TINTA = "#3A2C00";

export function FirmaDelContrato({
  datos,
  ocupado,
  onFirmar,
  onVolver,
  error = null,
  provisional = null,
  titulo = "Su contrato con CTCx",
  textoBoton = "Firmar y aceptar la oferta",
  textoVolver = "Volver a la calculadora",
  arriba = null,
}: {
  /** Los datos del contrato SIN el nombre ni el documento (los escribe el productor al firmar). */
  datos: Omit<DatosDelContrato, "productorNombre" | "productorDocumento">;
  ocupado: boolean;
  onFirmar: (f: FirmaDelProductor) => void;
  onVolver: () => void;
  /** V5.190: el mensaje del último intento que falló. */
  error?: string | null;
  /** V5.190 · sesión asistida: la aceptación provisional de CTCx (la cuenta nombra al Productor en el texto provisional). */
  provisional?: { cuenta: string; onAceptar: (responsable: string) => void } | null;
  titulo?: string;
  textoBoton?: string;
  textoVolver?: string;
  /** V5.190: lo que va antes del texto (la cantidad, al ratificar). */
  arriba?: React.ReactNode;
}) {
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  const dibujando = useRef(false);
  const ultimo = useRef<{ x: number; y: number } | null>(null);
  const [trazos, setTrazos] = useState(0);
  const [nombre, setNombre] = useState("");
  const [docTipo, setDocTipo] = useState<TipoDeDocumento>("CC");
  const [docNumero, setDocNumero] = useState("");
  const [leido, setLeido] = useState(false);
  const [modoProvisional, setModoProvisional] = useState(false);
  const [responsable, setResponsable] = useState("");
  const doc = validarDocumento(docTipo, docNumero);
  const enProvisional = Boolean(provisional) && modoProvisional;
  const clausulas = clausulasDelContrato(
    enProvisional && provisional
      ? {
          ...datos,
          productorNombre: "—",
          productorDocumento: null,
          provisional: { responsable: responsable.trim() || "(responsable de CTCx)", fecha: diaEnColombia(new Date()), cuenta: provisional.cuenta, ratificado: null },
        }
      : {
          ...datos,
          productorNombre: nombre.trim() || "(su nombre)",
          productorDocumento: doc.ok ? documentoDelFirmante(doc.tipo, doc.numero) : `${docTipo} (su número)`,
        },
  );

  // El lienzo se ajusta a su ancho real (y a la densidad de la pantalla) para que el trazo no salga borroso.
  useEffect(() => {
    const c = lienzo.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#17121F";
  }, []);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const empezar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dibujando.current = true;
    ultimo.current = punto(e);
  };
  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current) return;
    const ctx = e.currentTarget.getContext("2d");
    const p = punto(e);
    if (ctx && ultimo.current) {
      ctx.beginPath();
      ctx.moveTo(ultimo.current.x, ultimo.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      setTrazos((n) => n + 1);
    }
    ultimo.current = p;
  };
  const terminar = () => {
    dibujando.current = false;
    ultimo.current = null;
  };
  const borrar = () => {
    const c = lienzo.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    setTrazos(0);
  };

  const firmaSuficiente = trazos >= 15;
  const listo = firmaSuficiente && nombre.trim().length >= 5 && doc.ok && leido && !ocupado && !enProvisional;
  const listoProvisional = responsable.trim().length >= 5 && !ocupado;
  // En modo provisional los campos del productor no cuentan: se apagan (no se borran: si CTCx cambia de idea, siguen ahí).
  const delProductor: React.CSSProperties = enProvisional ? { opacity: 0.4, pointerEvents: "none" } : {};

  return (
    <div style={{ marginTop: 10, border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", background: "var(--paper)", display: "grid", gap: 10 }}>
      <b style={{ fontSize: 14 }}>{titulo}</b>
      {provisional && (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: AMBAR_TINTA, background: AMBAR_SUAVE, border: `1px solid ${AMBAR}`, borderRadius: 8, padding: "7px 10px" }}>
          <b>Sesión asistida de CTCx.</b> La firma con la mano es solo del Productor, presente. Si no está, CTCx puede{" "}
          <b>aceptar el contrato provisionalmente</b> en su favor (debajo de la casilla): queda vigente y él lo ratifica desde su cuenta.
        </div>
      )}
      {arriba}
      <div
        style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", background: "var(--card)", fontSize: 12.5, lineHeight: 1.5 }}
        tabIndex={0}
        aria-label="Texto del contrato"
      >
        {clausulas.map((c) => (
          <p key={c.titulo} style={{ margin: "0 0 8px" }}>
            <b>{c.titulo}.</b> {c.texto}
          </p>
        ))}
      </div>
      <div style={{ display: "grid", gap: 10, ...delProductor }} aria-hidden={enProvisional || undefined}>
        <label style={{ fontSize: 12.5, display: "grid", gap: 4 }}>
          Su nombre completo (como en su documento)
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" style={{ padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }} />
        </label>
        <div style={{ fontSize: 12.5, display: "grid", gap: 4 }}>
          <span id="doc-firma">Su documento de identidad (va en el contrato junto a su nombre)</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              aria-label="Tipo de documento"
              value={docTipo}
              onChange={(e) => setDocTipo(e.target.value as TipoDeDocumento)}
              style={{ padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)", flex: "1 1 220px" }}
            >
              {TIPOS_DE_DOCUMENTO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_DE_DOCUMENTO_LABEL[t]}
                </option>
              ))}
            </select>
            <input
              aria-label="Número del documento"
              value={docNumero}
              onChange={(e) => setDocNumero(e.target.value)}
              inputMode={docTipo === "PA" ? "text" : "numeric"}
              autoComplete="off"
              placeholder={docTipo === "NIT" ? "900123456-7" : docTipo === "PA" ? "AB123456" : "Número, sin puntos"}
              style={{ padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)", flex: "1 1 160px" }}
            />
          </div>
          {docNumero.trim() !== "" && !doc.ok && <span style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 700 }}>{doc.motivo}</span>}
          {doc.ok && <span style={{ fontSize: 11.5, color: "var(--green)" }}>En el contrato: {documentoDelFirmante(doc.tipo, doc.numero)}</span>}
        </div>
        <div>
          <div style={{ fontSize: 12.5, marginBottom: 4 }}>Firme aquí con el dedo (o con el ratón)</div>
          <canvas
            ref={lienzo}
            onPointerDown={empezar}
            onPointerMove={mover}
            onPointerUp={terminar}
            onPointerCancel={terminar}
            onPointerLeave={terminar}
            aria-label="Recuadro de firma"
            style={{ width: "100%", height: 160, border: "2px dashed var(--line)", borderRadius: 10, background: "#fff", touchAction: "none", cursor: "crosshair", display: "block" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span style={{ fontSize: 11.5, color: firmaSuficiente ? "var(--green)" : "var(--muted)" }}>{firmaSuficiente ? "Firma lista" : "Trace su firma completa"}</span>
            <button type="button" className="btn btn-sm" onClick={borrar}>
              Borrar firma
            </button>
          </div>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, cursor: "pointer" }}>
          <input type="checkbox" checked={leido} onChange={(e) => setLeido(e.target.checked)} />
          <span>Leí el contrato, acepto sus condiciones y firmo con mi firma manuscrita digital.</span>
        </label>
      </div>
      {provisional && (
        <div style={{ border: `1.5px solid ${AMBAR}`, background: AMBAR_SUAVE, borderRadius: 10, padding: "10px 12px", display: "grid", gap: 8 }}>
          <button
            type="button"
            aria-pressed={modoProvisional}
            disabled={ocupado}
            onClick={() => setModoProvisional((v) => !v)}
            style={{ justifySelf: "start", background: modoProvisional ? AMBAR : "#FFE2A8", color: AMBAR_TINTA, border: `1.5px solid ${AMBAR}`, fontWeight: 800, fontSize: 13, borderRadius: 999, padding: "7px 16px", cursor: "pointer" }}
          >
            {modoProvisional ? "✓ Aceptar contrato provisionalmente" : "Aceptar contrato provisionalmente"}
          </button>
          {modoProvisional && (
            <>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: AMBAR_TINTA }}>
                CTCx acepta este contrato <b>en favor del Productor</b>, como parte del grupo de Pioneros. <b>No se insertan la firma, el nombre ni el
                documento del Productor</b>: el contrato queda vigente y él lo <b>ratifica y firma desde su cuenta</b>, donde puede ajustar la
                cantidad declarada (el precio, la ventana y lo demás no cambian). Ningún cambio será unilateral.
              </div>
              <label style={{ fontSize: 12.5, display: "grid", gap: 4, color: AMBAR_TINTA }}>
                Nombre de responsable CTCx
                <input
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  autoComplete="name"
                  placeholder="Nombre y apellido de quien acepta por CTCx"
                  style={{ padding: "8px 10px", border: `1.5px solid ${AMBAR}`, borderRadius: 8, fontSize: 13, background: "#fff" }}
                />
              </label>
              <button
                type="button"
                disabled={!listoProvisional}
                onClick={() => provisional.onAceptar(responsable.trim())}
                style={{ justifySelf: "end", background: listoProvisional ? AMBAR : "#F1DDB0", color: AMBAR_TINTA, border: "none", fontWeight: 800, fontSize: 13, borderRadius: 999, padding: "8px 18px", cursor: listoProvisional ? "pointer" : "not-allowed" }}
              >
                {ocupado ? "Aceptando…" : "Confirmar la aceptación provisional"}
              </button>
            </>
          )}
        </div>
      )}
      {error && (
        <div role="alert" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 8, padding: "7px 10px", background: "var(--card)" }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        <button
          type="button"
          className="btn btn-sm btn-solid-accent"
          disabled={!listo}
          onClick={() => {
            const png = lienzo.current?.toDataURL("image/png");
            if (png && doc.ok) onFirmar({ nombre: nombre.trim(), documentoTipo: doc.tipo, documentoNumero: doc.numero, imagenPng: png });
          }}
        >
          {ocupado && !enProvisional ? "Firmando…" : textoBoton}
        </button>
        <button type="button" className="btn btn-sm" disabled={ocupado} onClick={onVolver}>
          {textoVolver}
        </button>
      </div>
    </div>
  );
}
