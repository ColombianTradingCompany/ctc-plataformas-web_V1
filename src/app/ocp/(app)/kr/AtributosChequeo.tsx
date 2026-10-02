"use client";

import type { ReactNode } from "react";
import type { AtributoDeChequeo, ChequeoSolicitado, ChequeosSolicitados, GrupoDeAtributo } from "@/lib/eudrAtributos";
import { claveDeChequeo, estadoDelAtributo } from "@/lib/eudrAtributos";

// ── Atributos Complementarios: una TABLA, una fila por atributo (V5.142, owner 2026-10-02) ────────────────────────────
// V5.128: cada ítem enseña lo que el productor pidió chequear (su nota y su imagen), la nota de CTCx y la evidencia.
// V5.142: «las X rojas dan la impresión de que algo está mal o falta». Estos atributos DOCUMENTAN la revisión propia de
// CTCx; no son faltas del productor. Ahora cada atributo es una fila con su ESTADO —verificada · por chequear (la pidió
// el productor) · no solicitada—, los enlaces de DÓNDE se verifica, la nota de CTCx y la evidencia. Lo que nadie pidió y
// nadie verificó va en GRIS: no es un error, es que no está en juego. Las dos listas (legislación y sostenibilidad)
// usan la misma tabla.
// `AtributosLectura` es la vista; `TablaDeAtributos` + `AtributoEditable` son el formulario (la marca, la nota y el
// adjunto viajan con el mismo `updateFincaEudr`).

const VERDE = "#166534";
const VERDE_FONDO = "#DCFCE7";
const AMBAR = "#92400E";
const AMBAR_FONDO = "#FEF3C7";

type KeyedFiles = Record<string, { assetId: string; fileName: string }>;

const celda = { padding: "8px 10px", verticalAlign: "top", borderTop: "1px solid var(--line)" } as const;
const cabecera = { padding: "6px 10px", textAlign: "left", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, whiteSpace: "nowrap" } as const;

function fecha(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString("es-CO") : "";
}

/** Lo que pidió el productor en UN ítem: la nota y la imagen (con su enlace firmado, si lo hay). */
function SolicitudDelProductor({ s, url, pendiente }: { s: ChequeoSolicitado; url: string | undefined; pendiente: boolean }) {
  return (
    <div style={{ background: pendiente ? AMBAR_FONDO : "transparent", border: `1px solid ${pendiente ? AMBAR : "var(--line)"}`, borderRadius: 8, padding: "5px 8px", fontSize: 12, marginTop: 5 }}>
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

/** Dónde se verifica un atributo: las fuentes de consulta, cada una en su pestaña. */
function Fuentes({ opcion }: { opcion: AtributoDeChequeo }) {
  if (!opcion.fuentes.length) return <span style={{ color: "var(--muted)" }}>—</span>;
  return (
    <div style={{ display: "grid", gap: 2 }}>
      {opcion.fuentes.map((f) => (
        <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" style={{ whiteSpace: "nowrap" }}>
          {f.label} ↗
        </a>
      ))}
    </div>
  );
}

/** La tabla: las mismas columnas al leer y al editar (al editar, la marca va en la primera y no hay columna de estado). */
export function TablaDeAtributos({ editable = false, children }: { editable?: boolean; children: ReactNode }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10, marginTop: 4 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr>
            <th style={cabecera}>Atributo</th>
            {!editable && <th style={cabecera}>Estado</th>}
            <th style={cabecera}>Dónde verificar</th>
            <th style={cabecera}>Nota de CTCx</th>
            <th style={cabecera}>Evidencia</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AtributosLectura({
  grupo,
  opciones,
  activas,
  solicitudes,
  notas,
  files,
  fileUrls,
  onAdjuntar,
}: {
  grupo: GrupoDeAtributo;
  opciones: AtributoDeChequeo[];
  activas: string[] | null | undefined;
  solicitudes: ChequeosSolicitados;
  notas: Record<string, string>;
  files: KeyedFiles;
  fileUrls: Record<string, string>;
  /** Abre el formulario en esta pestaña: allí se marca, se anota y se adjunta. */
  onAdjuntar?: () => void;
}) {
  const on = new Set(activas ?? []);
  return (
    <TablaDeAtributos>
      {opciones.map((o) => {
        const clave = claveDeChequeo(grupo, o.key);
        const s = solicitudes[clave];
        const nota = notas[clave];
        const file = files[o.key];
        const estado = estadoDelAtributo(on.has(o.key), !!s);
        // Lo que nadie pidió ni verificó va en gris: no está en juego (no es una falta).
        const gris = estado === "no_solicitada" ? { opacity: 0.55 } : undefined;
        return (
          <tr key={o.key} data-estado={estado}>
            <td style={{ ...celda, minWidth: 220 }}>
              <div style={gris}>
                <b>{o.label}</b>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>{o.ayuda}</div>
              </div>
              {s && <SolicitudDelProductor s={s} url={s.assetId ? fileUrls[s.assetId] : undefined} pendiente={estado === "por_chequear"} />}
            </td>
            <td style={{ ...celda, whiteSpace: "nowrap" }}>
              {estado === "verificada" ? (
                <span style={{ background: VERDE_FONDO, color: VERDE, borderRadius: 8, padding: "2px 8px", fontWeight: 700 }}>✓ Verificada</span>
              ) : estado === "por_chequear" ? (
                <span style={{ background: AMBAR_FONDO, color: AMBAR, borderRadius: 8, padding: "2px 8px", fontWeight: 700 }}>Por chequear</span>
              ) : (
                <span style={{ color: "var(--muted)", ...gris }}>No solicitada</span>
              )}
            </td>
            <td style={celda}>
              <div style={gris}>
                <Fuentes opcion={o} />
              </div>
            </td>
            <td style={{ ...celda, minWidth: 160, whiteSpace: "pre-wrap" }}>{nota || <span style={{ color: "var(--muted)", ...gris }}>—</span>}</td>
            <td style={{ ...celda, minWidth: 130 }}>
              {file ? (
                <span>
                  📎 {fileUrls[file.assetId] ? <a href={fileUrls[file.assetId]} target="_blank" rel="noopener noreferrer">{file.fileName}</a> : file.fileName}
                </span>
              ) : onAdjuntar ? (
                <button type="button" className="btn btn-sm" onClick={onAdjuntar} title="Abre el formulario: marque el atributo como verificado, escriba su nota y adjunte la evidencia" style={gris}>
                  Adjuntar…
                </button>
              ) : (
                <span style={{ color: "var(--muted)", ...gris }}>—</span>
              )}
            </td>
          </tr>
        );
      })}
    </TablaDeAtributos>
  );
}

/** Una fila del formulario. Va dentro de `<TablaDeAtributos editable>`. */
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
    <tr style={on ? { background: "rgba(22,101,52,.05)" } : undefined}>
      <td style={{ ...celda, minWidth: 220 }}>
        <label title={opcion.ayuda} style={{ display: "inline-flex", gap: 6, alignItems: "flex-start", fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" name={checkboxName} value={opcion.key} checked={on} onChange={(e) => onToggle(e.target.checked)} style={{ marginTop: 2 }} />
          <span>
            {opcion.label}
            <span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: "var(--muted)" }}>{on ? "Verificada por CTCx" : "Marque para dejarla como verificada"}</span>
          </span>
        </label>
        {solicitud && <SolicitudDelProductor s={solicitud} url={solicitud.assetId ? fileUrls[solicitud.assetId] : undefined} pendiente={!on} />}
      </td>
      <td style={celda}>
        <Fuentes opcion={opcion} />
      </td>
      <td style={{ ...celda, minWidth: 200 }}>
        <textarea
          name={`atributo_nota_${grupo}_${opcion.key}`}
          defaultValue={nota ?? ""}
          rows={2}
          maxLength={1200}
          placeholder="Nota de CTCx: qué se revisó, con qué, qué falta…"
          style={{ fontSize: 12.5, minHeight: 0, width: "100%" }}
        />
      </td>
      <td style={{ ...celda, minWidth: 190, fontSize: 12 }}>
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
      </td>
    </tr>
  );
}
