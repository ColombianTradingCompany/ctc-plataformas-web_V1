"use client";

import type { AtributoDeChequeo, ChequeoSolicitado, ChequeosSolicitados, GrupoDeAtributo } from "@/lib/eudrAtributos";
import { claveDeChequeo } from "@/lib/eudrAtributos";

// ── Atributos Complementarios con solicitud, nota y evidencia (V5.128, owner 2026-10-01) ─────────────────────────────
// Antes: una fila de fichas ✓/✗. Ahora cada ítem enseña TAMBIÉN lo que el productor pidió chequear (su nota y su imagen),
// la nota de CTCx y la evidencia de CTCx. `AtributosLectura` es la vista; `AtributoEditable` es la fila del formulario
// (la marca, la nota y el adjunto viajan con el mismo `updateFincaEudr`).

const VERDE = "#166534";
const VERDE_FONDO = "#DCFCE7";
const ROJO = "#991B1B";
const ROJO_FONDO = "#FEE2E2";
const AMBAR = "#92400E";
const AMBAR_FONDO = "#FEF3C7";

type KeyedFiles = Record<string, { assetId: string; fileName: string }>;

function fecha(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString("es-CO") : "";
}

/** Lo que pidió el productor en UN ítem: la nota y la imagen (con su enlace firmado, si lo hay). */
function SolicitudDelProductor({ s, url, pendiente }: { s: ChequeoSolicitado; url: string | undefined; pendiente: boolean }) {
  return (
    <div style={{ background: pendiente ? AMBAR_FONDO : "transparent", border: `1px solid ${pendiente ? AMBAR : "var(--line)"}`, borderRadius: 8, padding: "5px 8px", fontSize: 12 }}>
      <b style={{ color: pendiente ? AMBAR : "var(--muted)" }}>
        {pendiente ? "El productor pidió este chequeo" : "Pedido por el productor"}
        {s.at ? ` · ${fecha(s.at)}` : ""}
      </b>
      {s.nota && <p style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>«{s.nota}»</p>}
      {s.fileName && (
        <p style={{ margin: "2px 0 0" }}>
          📎 {url ? <a href={url} target="_blank" rel="noopener noreferrer">{s.fileName}</a> : s.fileName}
        </p>
      )}
    </div>
  );
}

export function AtributosLectura({
  grupo,
  opciones,
  activas,
  faltante = "gris",
  solicitudes,
  notas,
  files,
  fileUrls,
}: {
  grupo: GrupoDeAtributo;
  opciones: AtributoDeChequeo[];
  activas: string[] | null | undefined;
  /** La legislación sin verificar es una falta (rojo); la sostenibilidad es opcional (gris). */
  faltante?: "gris" | "rojo";
  solicitudes: ChequeosSolicitados;
  notas: Record<string, string>;
  files: KeyedFiles;
  fileUrls: Record<string, string>;
}) {
  const on = new Set(activas ?? []);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8, marginTop: 4 }}>
      {opciones.map((o) => {
        const clave = claveDeChequeo(grupo, o.key);
        const activa = on.has(o.key);
        const s = solicitudes[clave];
        const nota = notas[clave];
        const file = files[o.key];
        const color = activa ? VERDE : faltante === "rojo" ? ROJO : "var(--muted)";
        const borde = activa ? VERDE : s ? AMBAR : faltante === "rojo" ? ROJO : "var(--line)";
        return (
          <div key={o.key} title={o.ayuda} style={{ border: `1.5px solid ${borde}`, borderRadius: 10, padding: "7px 9px", display: "grid", gap: 5, alignContent: "start" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifySelf: "start", background: activa ? VERDE_FONDO : faltante === "rojo" ? ROJO_FONDO : "transparent", color, borderRadius: 8, padding: "3px 8px", fontSize: 12, fontWeight: activa ? 700 : 600 }}>
              <span aria-hidden style={{ fontSize: 11 }}>{activa ? "✓" : faltante === "rojo" ? "✗" : "○"}</span>
              {o.label}
            </span>
            {s && <SolicitudDelProductor s={s} url={s.assetId ? fileUrls[s.assetId] : undefined} pendiente={!activa} />}
            {nota && (
              <p style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
                <b>Nota de CTCx:</b> {nota}
              </p>
            )}
            {file && (
              <p style={{ margin: 0, fontSize: 12 }}>
                <b>Evidencia:</b> 📎 {fileUrls[file.assetId] ? <a href={fileUrls[file.assetId]} target="_blank" rel="noopener noreferrer">{file.fileName}</a> : file.fileName}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AtributoEditable({
  grupo,
  opcion,
  on,
  onToggle,
  checkboxName,
  fileField,
  solicitud,
  nota,
  file,
  fileUrls,
}: {
  grupo: GrupoDeAtributo;
  opcion: AtributoDeChequeo;
  on: boolean;
  onToggle: (on: boolean) => void;
  /** `eudr_legal_areas` | `eudr_sustainability_tags`: la marca de siempre. */
  checkboxName: string;
  /** `areas_file_<clave>` | `sustainability_file_<clave>`: el editor lo sube al Storage y manda solo el asset. */
  fileField: string;
  solicitud: ChequeoSolicitado | undefined;
  nota: string | undefined;
  file: { assetId: string; fileName: string } | undefined;
  fileUrls: Record<string, string>;
}) {
  return (
    <div title={opcion.ayuda} style={{ border: `1.5px solid ${on ? VERDE : solicitud ? AMBAR : "var(--line)"}`, borderRadius: 10, padding: "8px 10px", display: "grid", gap: 6, alignContent: "start" }}>
      <label style={{ display: "inline-flex", gap: 6, fontSize: 13, fontWeight: 600 }}>
        <input type="checkbox" name={checkboxName} value={opcion.key} checked={on} onChange={(e) => onToggle(e.target.checked)} /> {opcion.label}
      </label>
      {solicitud && <SolicitudDelProductor s={solicitud} url={solicitud.assetId ? fileUrls[solicitud.assetId] : undefined} pendiente={!on} />}
      <textarea
        name={`atributo_nota_${grupo}_${opcion.key}`}
        defaultValue={nota ?? ""}
        rows={2}
        maxLength={1200}
        placeholder="Nota de CTCx: qué se revisó, con qué, qué falta…"
        style={{ fontSize: 12.5, minHeight: 0 }}
      />
      <div style={{ fontSize: 12 }}>
        {file && (
          <p style={{ margin: "0 0 3px" }}>
            ✓ {file.fileName}
            {fileUrls[file.assetId] && <> · <a href={fileUrls[file.assetId]} target="_blank" rel="noopener noreferrer">ver</a></>}
          </p>
        )}
        {on ? (
          <input type="file" name={fileField} accept="image/*,application/pdf" style={{ fontSize: 12, maxWidth: "100%" }} />
        ) : (
          <span style={{ color: "var(--muted)" }}>La evidencia se adjunta al marcarlo como verificado.</span>
        )}
      </div>
    </div>
  );
}
