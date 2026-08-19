"use client";

// ── ECP · Herramientas del café · el administrador del registro ──────────────
// (2026-07-20) Nació como la tabla de «Disponibilidad»: dónde se ve cada
// herramienta y con qué nivel.
// (2026-08-15) Se convirtió en el registro entero, a petición del owner. Ahora
// además: SUBIR una versión nueva de una herramienta, ELEGIR cuál está
// publicada (que es lo mismo que volver a una anterior), marcarla INTERNA o
// COMPARTIBLE, y dar de alta herramientas que no existen en el repositorio.
//
// La tabla de arriba es el mapa de un vistazo; cada fila se abre en su ficha.
// Se mantienen las dos cosas porque responden a preguntas distintas: «¿qué ve un
// productor?» se contesta mirando la tabla, y «¿qué le pasó a esta herramienta?»
// abriendo su ficha.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ToolAdmin, ToolClase, ToolTier } from "@/lib/tools/catalog";
import { MAX_TOOL_MB, TOOL_ACCEPT } from "@/lib/tools/catalog";
import {
  archivarTool,
  crearTool,
  guardarFicha,
  publicarVersion,
  subirVersion,
  type FichaTool,
} from "./toolsActions";
import styles from "@/components/panel/shared.module.css";

type Msg = { ok: boolean; text: string } | null;

function pesoLegible(bytes: number | null): string {
  if (!bytes) return "—";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function ToolsAdmin({ tools }: { tools: ToolAdmin[] }) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();

  const activas = tools.filter((t) => !t.archivada);
  const archivadas = tools.filter((t) => t.archivada);

  function correr(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, exito: string) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg({ ok: true, text: exito });
        router.refresh();
      } else setMsg({ ok: false, text: res.error });
    });
  }

  return (
    <div style={caja}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Registro de herramientas</h2>
        <button className="btn btn-sm" onClick={() => setNueva((v) => !v)}>
          {nueva ? "Cancelar" : "+ Nueva herramienta"}
        </button>
      </div>

      <p className={styles.subtitle} style={{ marginTop: 6 }}>
        Dónde se ofrece cada herramienta y con qué nivel. <b>Default</b>: la ve cualquier cuenta de esa superficie (en la
        web, cualquier visitante). <b>Plus</b>: solo con la activación aprobada. Una herramienta <b>interna</b> no se
        ofrece en ninguna superficie y su archivo solo se entrega a una sesión de consola — por eso sus casillas de
        reparto aparecen apagadas y bloqueadas.
      </p>

      {msg && (
        <p style={{ fontSize: 13, fontWeight: 600, color: msg.ok ? "var(--primary)" : "#B45309", margin: "10px 0 0" }}>
          {msg.text}
        </p>
      )}

      {nueva && (
        <form
          style={{ ...subcaja, marginTop: 14 }}
          action={(fd) =>
            correr(
              () => crearTool(fd),
              "Herramienta creada. Súbale un archivo y publíquelo para que se pueda abrir."
            )
          }
        >
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>Nueva herramienta</p>
          <p className={styles.meta} style={{ marginTop: 0 }}>
            Nace sin archivo: no se ofrece en ninguna parte hasta que se le suba una versión y se publique.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
            <label style={campo}>
              <span style={etiqueta}>Identificador</span>
              <input name="id" placeholder="costo-flete" required style={input} />
            </label>
            <label style={campo}>
              <span style={etiqueta}>Nombre</span>
              <input name="nombre" placeholder="Costo de flete interno" required style={{ ...input, minWidth: 240 }} />
            </label>
            <label style={campo}>
              <span style={etiqueta}>Clase</span>
              <select name="clase" defaultValue="compartible" style={input}>
                <option value="compartible">Compartible</option>
                <option value="interna">Interna de CTC</option>
              </select>
            </label>
            <button className="btn btn-sm btn-solid" disabled={pending} type="submit">
              Crear
            </button>
          </div>
        </form>
      )}

      <div style={{ overflowX: "auto", marginTop: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 660 }}>
          <thead>
            <tr>
              <th style={th}>Herramienta</th>
              <th style={{ ...th, width: 110 }}>Clase</th>
              <th style={{ ...th, width: 90 }}>Versión</th>
              <th style={{ ...th, textAlign: "center", width: 70 }}>KR</th>
              <th style={{ ...th, textAlign: "center", width: 70 }}>CP</th>
              <th style={{ ...th, textAlign: "center", width: 70 }}>Web</th>
              <th style={{ ...th, textAlign: "center", width: 70 }}>DC</th>
              <th style={{ ...th, width: 80 }}>Nivel</th>
              <th style={{ ...th, width: 90 }} />
            </tr>
          </thead>
          <tbody>
            {activas.map((t) => (
              <FilaTool key={t.id} t={t} abierta={abierta === t.id} onToggle={() => setAbierta(abierta === t.id ? null : t.id)} />
            ))}
          </tbody>
        </table>
      </div>

      {abierta && <Ficha tool={tools.find((t) => t.id === abierta)!} correr={correr} pending={pending} />}

      {archivadas.length > 0 && (
        <details style={{ marginTop: 18 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--muted)" }}>
            Archivadas ({archivadas.length}) — retiradas de las superficies, conservadas con su historial
          </summary>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13 }}>
            {archivadas.map((t) => (
              <li key={t.id} style={{ marginBottom: 6 }}>
                <b>{t.nombre}</b> <span className={styles.meta}>({t.id})</span>{" "}
                <button
                  className="btn btn-sm"
                  disabled={pending}
                  onClick={() => correr(() => archivarTool(t.id, false), `«${t.nombre}» restaurada.`)}
                >
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function FilaTool({ t, abierta, onToggle }: { t: ToolAdmin; abierta: boolean; onToggle: () => void }) {
  const interna = t.clase === "interna";
  return (
    <tr style={abierta ? { background: "var(--bg-soft, rgba(0,0,0,.03))" } : undefined}>
      <td style={td}>
        <b>{t.nombre}</b>
        <br />
        <span className={styles.meta}>{t.id}</span>
        {!t.versionPublicadaId && (
          <span style={{ ...chip, background: "#FEF3C7", color: "#92400E", marginLeft: 6 }}>sin publicar</span>
        )}
      </td>
      <td style={td}>
        <span style={{ ...chip, background: interna ? "#E0E7FF" : "#DCFCE7", color: interna ? "#3730A3" : "#166534" }}>
          {interna ? "Interna" : "Compartible"}
        </span>
      </td>
      <td style={td}>
        {t.versionPublicadaId ? `v${t.versiones.find((v) => v.id === t.versionPublicadaId)?.numero ?? "?"}` : "—"}
      </td>
      <td style={{ ...td, textAlign: "center" }}>{t.kr ? "●" : "·"}</td>
      <td style={{ ...td, textAlign: "center" }}>{t.cp ? "●" : "·"}</td>
      <td style={{ ...td, textAlign: "center" }}>{t.web ? "●" : "·"}</td>
      <td style={{ ...td, textAlign: "center" }}>{t.dc ? "●" : "·"}</td>
      <td style={td}>{t.tier === "plus" ? "Plus" : "Default"}</td>
      <td style={td}>
        <button className="btn btn-sm" onClick={onToggle} aria-expanded={abierta}>
          {abierta ? "Cerrar" : "Gestionar"}
        </button>
      </td>
    </tr>
  );
}

function Ficha({
  tool,
  correr,
  pending,
}: {
  tool: ToolAdmin;
  correr: (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, exito: string) => void;
  pending: boolean;
}) {
  const [f, setF] = useState<FichaTool>({
    nombre: tool.nombre,
    descripcion: tool.descripcion,
    metaDescription: tool.metaDescription ?? "",
    lang: tool.lang,
    clase: tool.clase,
    familia: tool.familia ?? "",
    tier: tool.tier,
    kr: tool.kr,
    cp: tool.cp,
    web: tool.web,
    dc: tool.dc,
    orden: tool.orden,
    soportaMemoria: tool.soportaMemoria,
  });

  const interna = f.clase === "interna";
  const publicada = tool.versiones.find((v) => v.id === tool.versionPublicadaId) ?? null;
  // El guardián de la base rechaza esta combinación; se avisa ANTES de intentarlo
  // para que el owner no descubra la regla por un mensaje de error.
  const bloqueaInterna = publicada?.origen === "repo";

  const set = <K extends keyof FichaTool>(k: K, v: FichaTool[K]) => setF((s) => ({ ...s, [k]: v }));

  return (
    <div style={{ ...subcaja, marginTop: 16 }}>
      <h3 style={{ margin: 0, fontSize: 15 }}>{tool.nombre}</h3>
      <p className={styles.meta} style={{ marginTop: 2 }}>
        {tool.id} · se abre en <code>{tool.src || "— sin versión publicada"}</code>
      </p>

      {/* ── Ficha ── */}
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 12 }}>
        <label style={campo}>
          <span style={etiqueta}>Nombre</span>
          <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} style={input} />
        </label>
        <label style={campo}>
          <span style={etiqueta}>Familia (agrupa variantes)</span>
          <input
            value={f.familia}
            onChange={(e) => set("familia", e.target.value)}
            placeholder="mermas"
            style={input}
          />
        </label>
        <label style={campo}>
          <span style={etiqueta}>Idioma de la herramienta</span>
          <select value={f.lang} onChange={(e) => set("lang", e.target.value as "es" | "en")} style={input}>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </select>
        </label>
        <label style={campo}>
          <span style={etiqueta}>Orden en la lista</span>
          <input
            type="number"
            value={f.orden}
            onChange={(e) => set("orden", Number(e.target.value) || 0)}
            style={input}
          />
        </label>
      </div>

      <label style={{ ...campo, marginTop: 10 }}>
        <span style={etiqueta}>Descripción (la que se lee en la tarjeta)</span>
        <textarea value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={2} style={input} />
      </label>

      <label style={{ ...campo, marginTop: 10 }}>
        <span style={etiqueta}>Descripción para buscadores</span>
        <textarea
          value={f.metaDescription}
          onChange={(e) => set("metaDescription", e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="El resumen que enseña Google bajo el título. Entre 120 y 160 caracteres."
          style={input}
        />
        <span className={styles.meta}>{f.metaDescription.length} caracteres · lo cómodo son 120–160.</span>
        {/* Sin este aviso el campo engaña. Para una herramienta del repositorio,
            lo que se descarga el buscador es el `<head>` del propio archivo de
            `public/tools/` — esta ruta ni pasa por Next. Escribir aquí no cambia
            lo que sale en Google: es el INVENTARIO con el que este panel avisa
            de las que van sin descripción. `qa-tools-seo-espejo.mjs` comprueba
            que los dos digan lo mismo. */}
        {publicada?.origen === "repo" && (
          <span className={styles.meta} style={{ color: "#B45309" }}>
            Su HTML vive en <code>public{publicada.srcPublico}</code>: lo que enseña Google sale de ese archivo, no
            de aquí. Este campo es el inventario — cámbialo junto con el archivo, o quedarán descuadrados.
          </span>
        )}
      </label>

      {/* ── Clase y reparto ── */}
      <div style={{ marginTop: 14 }}>
        <span style={etiqueta}>Clase</span>
        <div style={{ display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
          {(["compartible", "interna"] as ToolClase[]).map((c) => (
            <label key={c} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input
                type="radio"
                name={`clase-${tool.id}`}
                checked={f.clase === c}
                disabled={c === "interna" && bloqueaInterna}
                onChange={() => set("clase", c)}
              />
              {c === "interna" ? "Interna de CTC" : "Compartible con las plataformas"}
            </label>
          ))}
        </div>
        {bloqueaInterna && (
          <p className={styles.meta} style={{ marginTop: 6, maxWidth: 620 }}>
            No se puede marcar interna todavía: la versión publicada es el archivo que vive en el repositorio
            (<code>{publicada?.srcPublico}</code>), y ése lo sirve la CDN sin pasar por la plataforma — es una URL
            pública y ninguna compuerta puede taparla. Suba una versión aquí abajo y publíquela; entonces sí.
          </p>
        )}
      </div>

      <div style={{ marginTop: 12, opacity: interna ? 0.45 : 1 }}>
        <span style={etiqueta}>Se ofrece en</span>
        <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
          {([
            ["kr", "Kaffetal Regal"],
            ["cp", "Cherry Picked"],
            ["web", "Herramientas (web)"],
            ["dc", "Directorio"],
          ] as const).map(([k, label]) => (
            <label key={k} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={f[k]} disabled={interna} onChange={(e) => set(k, e.target.checked)} />
              {label}
            </label>
          ))}
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }} title="La versión publicada incluye /tools/ctc-bridge.js: la concha ofrece trabajos guardados">
            <input
              type="checkbox"
              checked={f.soportaMemoria}
              disabled={interna}
              onChange={(e) => set("soportaMemoria", e.target.checked)}
            />
            Con memoria (puente)
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
            Nivel
            <select
              value={f.tier}
              disabled={interna}
              onChange={(e) => set("tier", e.target.value as ToolTier)}
              style={input}
            >
              <option value="default">Default</option>
              <option value="plus">Plus</option>
            </select>
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button
          className="btn btn-sm btn-solid"
          disabled={pending}
          onClick={() => correr(() => guardarFicha(tool.id, f), "Ficha guardada ✓")}
        >
          Guardar ficha
        </button>
        <button
          className="btn btn-sm"
          disabled={pending}
          onClick={() => correr(() => archivarTool(tool.id, true), `«${tool.nombre}» archivada.`)}
        >
          Archivar
        </button>
      </div>

      {/* ── Versiones ── */}
      <h4 style={{ margin: "20px 0 6px", fontSize: 13.5 }}>Versiones</h4>
      <p className={styles.meta} style={{ marginTop: 0 }}>
        Subir y publicar son dos gestos: se sube, se mira, y se publica cuando convence. Volver atrás es publicar la
        anterior — nada se borra.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
        <tbody>
          {tool.versiones.map((v) => {
            const viva = v.id === tool.versionPublicadaId;
            return (
              <tr key={v.id}>
                <td style={{ ...td, width: 52 }}>
                  <b>v{v.numero}</b>
                </td>
                <td style={{ ...td, width: 96 }}>
                  <span style={{ ...chip, background: v.origen === "repo" ? "#F1F5F9" : "#EFF6FF", color: "#334155" }}>
                    {v.origen === "repo" ? "repositorio" : "subida"}
                  </span>
                </td>
                <td style={{ ...td, width: 90 }}>{pesoLegible(v.bytes)}</td>
                <td style={{ ...td, width: 110 }}>{fecha(v.subidoAt)}</td>
                <td style={td}>{v.notas || <span className={styles.meta}>—</span>}</td>
                <td style={{ ...td, width: 130, textAlign: "right" }}>
                  {viva ? (
                    <span style={{ ...chip, background: "#DCFCE7", color: "#166534" }}>publicada</span>
                  ) : (
                    <button
                      className="btn btn-sm"
                      disabled={pending}
                      onClick={() => correr(() => publicarVersion(tool.id, v.id), `Publicada la v${v.numero}.`)}
                    >
                      Publicar
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <form
        style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
        action={(fd) => {
          fd.set("toolId", tool.id);
          correr(() => subirVersion(fd), "Versión subida. Publíquela cuando quiera encenderla.");
        }}
      >
        <label style={campo}>
          <span style={etiqueta}>Archivo HTML (máx. {MAX_TOOL_MB} MB)</span>
          <input type="file" name="archivo" accept={TOOL_ACCEPT} required style={{ fontSize: 12.5 }} />
        </label>
        <label style={campo}>
          <span style={etiqueta}>Nota (qué cambió)</span>
          <input name="notas" placeholder="Actualiza la tarifa de 2026" style={{ ...input, minWidth: 240 }} />
        </label>
        <button className="btn btn-sm btn-solid" type="submit" disabled={pending}>
          Subir versión
        </button>
      </form>
    </div>
  );
}

const caja: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  padding: 20,
  marginBottom: 26,
};
const subcaja: React.CSSProperties = {
  background: "var(--bg, transparent)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  padding: 16,
};
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "2px solid var(--line)",
  fontFamily: "var(--font-spline-mono), monospace",
  fontSize: 10.5,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--muted)",
};
const td: React.CSSProperties = { padding: "8px", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
const chip: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 7px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
};
const campo: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3 };
const etiqueta: React.CSSProperties = {
  fontFamily: "var(--font-spline-mono), monospace",
  fontSize: 10.5,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--muted)",
};
const input: React.CSSProperties = {
  padding: "6px 8px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  background: "var(--card)",
  color: "inherit",
};
