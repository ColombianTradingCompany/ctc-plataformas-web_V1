"use client";

// ── Mapa de Trabajo · lienzo interactivo (SVG a mano, sin librerías) ─────────
// Tres modos: Ver (solo lectura), Editar (cosmético: arrastrar, etiquetar,
// agregar/borrar nodos y flechas) y Exportar (PDF por impresión del navegador).
// Colores concretos (no variables CSS) para que la exportación a una ventana
// nueva conserve el color. Coordenadas = centro del nodo.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveWorkMap } from "../workmapActions";
import {
  DEFAULT_WORK_MAP,
  NODE_W,
  NODE_H,
  DECISION_SIZE,
  CANVAS_W,
  CANVAS_H,
  BAND_Y,
  UI_CATALOG,
  type WorkMapConfig,
  type MapNode,
  type MapEdge,
  type EdgeTone,
} from "@/lib/workmap/schema";

const STOP_W = 196;
const STOP_H = 52;
import styles from "./mapa.module.css";

const C = {
  bg: "#FBF9F2",
  band: "#ECE7D8",
  bandLine: "#D8D2C0",
  bandText: "#7C7660",
  card: "#FFFFFF",
  cardBorder: "#C4BEAC",
  ink: "#1C2620",
  muted: "#6B7268",
  primary: "#17402B",
  decisionFill: "#FBF2E1",
  decisionBorder: "#C9A45C",
  decisionText: "#7A5A16",
  chipBg: "#EEF3EC",
  chipText: "#3A5A46",
  sel: "#17402B",
  edge: "#7C7C74",
  ok: "#2E7D52",
  bad: "#B01F24",
  info: "#9A9484",
  stopFill: "#FBE9E7",
  stopBorder: "#C9827C",
  stopText: "#7A2A24",
};

const toneColor = (t?: EdgeTone) => (t === "ok" ? C.ok : t === "bad" ? C.bad : t === "info" ? C.info : C.edge);

type Mode = "view" | "edit";
type ViewBox = { x: number; y: number; w: number; h: number };
type Sel = { t: "node" | "edge"; id: string } | null;

function nodeHalf(n: MapNode) {
  if (n.kind === "decision") return { hw: DECISION_SIZE / 2, hh: DECISION_SIZE / 2 };
  if (n.kind === "stop") return { hw: (n.w ?? STOP_W) / 2, hh: (n.h ?? STOP_H) / 2 };
  return { hw: (n.w ?? NODE_W) / 2, hh: (n.h ?? NODE_H) / 2 };
}

/** Punto de anclaje en el borde del nodo, según hacia dónde va la flecha. */
function anchor(n: MapNode, tx: number, ty: number) {
  const { hw, hh } = nodeHalf(n);
  const dx = tx - n.x;
  const dy = ty - n.y;
  if (Math.abs(dx) >= Math.abs(dy)) return { x: n.x + Math.sign(dx) * hw, y: n.y, horiz: true };
  return { x: n.x, y: n.y + Math.sign(dy) * hh, horiz: false };
}

function contentBounds(cfg: WorkMapConfig): ViewBox {
  if (!cfg.nodes.length) return { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of cfg.nodes) {
    const { hw, hh } = nodeHalf(n);
    minX = Math.min(minX, n.x - hw);
    minY = Math.min(minY, n.y - hh);
    maxX = Math.max(maxX, n.x + hw);
    maxY = Math.max(maxY, n.y + hh);
  }
  const pad = 80;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2.4 };
}

export function WorkMapCanvas({ initial, canEdit }: { initial: WorkMapConfig; canEdit: boolean }) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  // Contador para ids nuevos (prefijo "u" para no chocar con la semilla).
  const idSeq = useRef(1000);
  const newId = (prefix: string) => `${prefix}u${(idSeq.current += 1)}`;
  const [config, setConfig] = useState<WorkMapConfig>(initial);
  const [mode, setMode] = useState<Mode>("view");
  const [view, setView] = useState<ViewBox>(() => ({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H }));
  const [sel, setSel] = useState<Sel>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [customUi, setCustomUi] = useState("");

  const nodeById = useMemo(() => new Map(config.nodes.map((n) => [n.id, n])), [config.nodes]);
  const selNode = sel?.t === "node" ? nodeById.get(sel.id) ?? null : null;
  const selEdge = sel?.t === "edge" ? config.edges.find((e) => e.id === sel.id) ?? null : null;

  const drag = useRef<
    | { kind: "pan"; sx: number; sy: number; vx: number; vy: number; sc: number }
    | { kind: "node"; id: string; sx: number; sy: number; nx: number; ny: number; sc: number; moved: boolean }
    | null
  >(null);

  const scaleX = () => {
    const r = svgRef.current?.getBoundingClientRect();
    // Guarda contra ancho 0 (p. ej. panel oculto): evita divisiones a Infinity.
    return r && r.width > 0 ? view.w / r.width : 1;
  };
  const toSvg = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: view.x + ((cx - r.left) / r.width) * view.w, y: view.y + ((cy - r.top) / r.height) * view.h };
  };

  // ── Interacción de puntero (pan + arrastre de nodo) ──
  function capture(el: Element, pointerId: number) {
    try {
      el.setPointerCapture?.(pointerId);
    } catch {
      // puntero sintético o ya liberado — el arrastre sigue por drag.current
    }
  }
  function onPointerDownBg(e: React.PointerEvent) {
    if (connectFrom) return;
    drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, sc: scaleX() };
    capture(e.target as Element, e.pointerId);
    setSel(null);
  }
  function onPointerDownNode(e: React.PointerEvent, n: MapNode) {
    e.stopPropagation();
    if (connectFrom === "__pick__") {
      setConnectFrom(n.id); // origen elegido; el próximo toque es el destino
      return;
    }
    if (connectFrom) {
      if (connectFrom !== n.id) {
        const eid = newId("e");
        setConfig((c) => ({ ...c, edges: [...c.edges, { id: eid, from: connectFrom, to: n.id }] }));
        setSel({ t: "edge", id: eid }); // abre el panel para escribir el resultado
      }
      setConnectFrom(null);
      return;
    }
    setSel({ t: "node", id: n.id });
    if (mode !== "edit") return;
    drag.current = { kind: "node", id: n.id, sx: e.clientX, sy: e.clientY, nx: n.x, ny: n.y, sc: scaleX(), moved: false };
    capture(e.currentTarget as Element, e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "pan") {
      const dx = (e.clientX - d.sx) * d.sc;
      const dy = (e.clientY - d.sy) * d.sc;
      setView((v) => ({ ...v, x: d.vx - dx, y: d.vy - dy }));
    } else {
      const dx = (e.clientX - d.sx) * d.sc;
      const dy = (e.clientY - d.sy) * d.sc;
      if (Math.abs(dx) + Math.abs(dy) > 1) d.moved = true;
      setConfig((c) => ({
        ...c,
        nodes: c.nodes.map((n) => (n.id === d.id ? { ...n, x: Math.round(d.nx + dx), y: Math.round(d.ny + dy) } : n)),
      }));
    }
  }
  function onPointerUp() {
    drag.current = null;
  }

  // Zoom con rueda (listener no pasivo para poder prevenir el scroll).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    function onWheel(ev: WheelEvent) {
      ev.preventDefault();
      const factor = ev.deltaY > 0 ? 1.12 : 0.89;
      const p = toSvg(ev.clientX, ev.clientY);
      setView((v) => {
        const nw = Math.min(Math.max(v.w * factor, 320), CANVAS_W * 2.2);
        const ratio = nw / v.w;
        const nh = v.h * ratio;
        return { x: p.x - (p.x - v.x) * ratio, y: p.y - (p.y - v.y) * ratio, w: nw, h: nh };
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  function zoom(factor: number) {
    setView((v) => {
      const nw = Math.min(Math.max(v.w * factor, 320), CANVAS_W * 2.2);
      const ratio = nw / v.w;
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      const nh = v.h * ratio;
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    });
  }
  function fit() {
    setView(contentBounds(config));
  }

  // ── Edición ──
  function patchNode(id: string, patch: Partial<MapNode>) {
    setConfig((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  }
  function patchEdge(id: string, patch: Partial<MapEdge>) {
    setConfig((c) => ({ ...c, edges: c.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }
  function addNode(kind: MapNode["kind"]) {
    const id = newId("n");
    const label = kind === "decision" ? "Nueva decisión" : kind === "stop" ? "Alto del proceso" : "nueva_tabla";
    const n: MapNode = {
      id,
      kind,
      label,
      uis: [],
      x: Math.round(view.x + view.w / 2),
      y: Math.round(view.y + view.h / 2),
    };
    setConfig((c) => ({ ...c, nodes: [...c.nodes, n] }));
    setSel({ t: "node", id });
  }
  function deleteSel() {
    if (!sel) return;
    if (sel.t === "node") {
      setConfig((c) => ({
        ...c,
        nodes: c.nodes.filter((n) => n.id !== sel.id),
        edges: c.edges.filter((e) => e.from !== sel.id && e.to !== sel.id),
      }));
    } else {
      setConfig((c) => ({ ...c, edges: c.edges.filter((e) => e.id !== sel.id) }));
    }
    setSel(null);
  }
  function resetToDefault() {
    if (window.confirm("¿Restablecer al mapa base? Se pierden los cambios no guardados.")) {
      setConfig(DEFAULT_WORK_MAP);
      setSel(null);
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await saveWorkMap(config);
    setSaving(false);
    if (res.ok) {
      setMsg("Guardado ✓");
      router.refresh();
    } else setMsg(res.error);
  }

  // ── Exportar (PDF por impresión EN LA MISMA página, sin ventana nueva) ──
  // Se clona el SVG vivo (conserva el namespace SVG y los colores concretos)
  // dentro de un contenedor fijo que solo se ve al imprimir (CSS @media print).
  // Esto evita el bloqueador de pop-ups y el SVG en blanco de la ventana nueva.
  function exportPdf(kind: "view" | "full") {
    const vb = kind === "full" ? contentBounds(config) : view;
    const svg = svgRef.current;
    const host = printRef.current;
    if (!svg || !host) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    clone.removeAttribute("style");
    clone.setAttribute("width", "100%");
    clone.setAttribute("height", "100%");
    clone.style.cursor = "default";
    host.replaceChildren(clone);
    const cleanup = () => {
      host.replaceChildren();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 2000); // respaldo si afterprint no dispara
  }

  const stageOf = (id?: string) => config.stages.find((s) => s.id === id)?.label ?? "—";

  return (
    <div className={styles.root}>
      {/* Barra de herramientas */}
      <div className={styles.toolbar}>
        <div className={styles.segmented}>
          <button className={mode === "view" ? styles.segOn : styles.seg} onClick={() => { setMode("view"); setConnectFrom(null); }}>
            Ver
          </button>
          {canEdit && (
            <button className={mode === "edit" ? styles.segOn : styles.seg} onClick={() => setMode("edit")}>
              Editar
            </button>
          )}
        </div>

        {mode === "edit" && canEdit && (
          <div className={styles.group}>
            <button className={styles.tbtn} onClick={() => addNode("table")}>＋ Tabla</button>
            <button className={styles.tbtn} onClick={() => addNode("decision")}>＋ Decisión</button>
            <button className={styles.tbtn} onClick={() => addNode("stop")}>＋ Alto</button>
            <button
              className={connectFrom ? styles.tbtnOn : styles.tbtn}
              onClick={() => setConnectFrom(connectFrom ? null : sel?.t === "node" ? sel.id : "__pick__")}
              title="Conectar: toque el nodo origen y luego el destino"
            >
              {connectFrom ? "Conectando…" : "↳ Conectar"}
            </button>
            <button className={styles.tbtn} disabled={!sel} onClick={deleteSel}>🗑 Borrar</button>
            <button className={styles.tbtn} onClick={resetToDefault}>Mapa base</button>
            <button className={styles.tbtnSolid} disabled={saving} onClick={save}>{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        )}

        <div className={styles.group} style={{ marginLeft: "auto" }}>
          <button className={styles.tbtn} onClick={() => zoom(0.85)} title="Acercar">＋</button>
          <button className={styles.tbtn} onClick={() => zoom(1.18)} title="Alejar">－</button>
          <button className={styles.tbtn} onClick={fit}>Ajustar</button>
          <button className={styles.tbtn} onClick={() => exportPdf("view")}>PDF · vista</button>
          <button className={styles.tbtn} onClick={() => exportPdf("full")}>PDF · completo</button>
        </div>
        {msg && <span className={styles.msg}>{msg}</span>}
      </div>

      <div className={styles.hint}>
        {connectFrom === "__pick__" || connectFrom
          ? "Conectar: toque el nodo ORIGEN, luego el DESTINO (o vuelva a «Conectar» para cancelar)."
          : mode === "edit"
            ? "Arrastre para mover · rueda/＋－ para zoom · toque un nodo para editarlo · fondo para desplazar."
            : "Arrastre el fondo para desplazar · rueda o ＋－ para zoom · toque un nodo para ver sus UIs."}
      </div>

      <div className={styles.canvasWrap} ref={wrapRef}>
        <svg
          ref={svgRef}
          className={styles.svg}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          onPointerDown={onPointerDownBg}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ cursor: connectFrom ? "crosshair" : "grab" }}
        >
          <defs>
            <marker id="wm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
            </marker>
          </defs>

          {/* fondo */}
          <rect x={-5000} y={-5000} width={20000} height={20000} fill={C.bg} onPointerDown={onPointerDownBg} />

          {/* bandas de etapa (al fondo) */}
          {config.stages.map((s) => (
            <g key={s.id}>
              <rect x={s.x0} y={BAND_Y} width={Math.max(0, s.x1 - s.x0)} height={CANVAS_H - BAND_Y} fill={C.band} stroke={C.bandLine} />
              <text x={(s.x0 + s.x1) / 2} y={BAND_Y + 34} textAnchor="middle" fontSize={20} fontWeight={800} fill={C.bandText} style={{ letterSpacing: 1 }}>
                {s.label}
              </text>
            </g>
          ))}

          {/* aristas */}
          {config.edges.map((e) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;
            const pa = anchor(a, b.x, b.y);
            const pb = anchor(b, a.x, a.y);
            const col = toneColor(e.tone);
            const c1 = pa.horiz ? { x: (pa.x + pb.x) / 2, y: pa.y } : { x: pa.x, y: (pa.y + pb.y) / 2 };
            const c2 = pb.horiz ? { x: (pa.x + pb.x) / 2, y: pb.y } : { x: pb.x, y: (pa.y + pb.y) / 2 };
            const path = `M${pa.x},${pa.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${pb.x},${pb.y}`;
            const isSel = sel?.t === "edge" && sel.id === e.id;
            return (
              <g key={e.id}>
                {/* zona de toque ancha */}
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ cursor: mode === "edit" ? "pointer" : "default" }}
                  onPointerDown={(ev) => {
                    ev.stopPropagation();
                    setSel({ t: "edge", id: e.id });
                  }}
                />
                <path d={path} fill="none" stroke={col} strokeWidth={isSel ? 3.5 : 2} markerEnd="url(#wm-arrow)" />
                {e.label && (
                  <text x={(pa.x + pb.x) / 2} y={(pa.y + pb.y) / 2 - 6} textAnchor="middle" fontSize={12} fill={col} fontWeight={600}>
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* nodos */}
          {config.nodes.map((n) => {
            const isSel = sel?.t === "node" && sel.id === n.id;
            const isFrom = connectFrom === n.id;
            if (n.kind === "decision") {
              const s = DECISION_SIZE / 2;
              const pts = `${n.x},${n.y - s} ${n.x + s},${n.y} ${n.x},${n.y + s} ${n.x - s},${n.y}`;
              return (
                <g key={n.id} onPointerDown={(e) => onPointerDownNode(e, n)} style={{ cursor: mode === "edit" ? "move" : "pointer" }}>
                  <polygon points={pts} fill={C.decisionFill} stroke={isSel || isFrom ? C.sel : C.decisionBorder} strokeWidth={isSel || isFrom ? 3 : 2} />
                  <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={C.decisionText}>
                    {wrap(n.label, 14).map((ln, i, arr) => (
                      <tspan key={i} x={n.x} dy={i === 0 ? -(arr.length - 1) * 7 : 14}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            }
            if (n.kind === "stop") {
              const w = n.w ?? STOP_W;
              const h = n.h ?? STOP_H;
              return (
                <g key={n.id} onPointerDown={(e) => onPointerDownNode(e, n)} style={{ cursor: mode === "edit" ? "move" : "pointer" }}>
                  <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={h / 2} fill={C.stopFill} stroke={isSel || isFrom ? C.sel : C.stopBorder} strokeWidth={isSel || isFrom ? 3 : 2} />
                  <text x={n.x} y={n.y} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={C.stopText}>
                    {wrap(n.label, 26).map((ln, i, arr) => (
                      <tspan key={i} x={n.x} dy={i === 0 ? -(arr.length - 1) * 7 + 4 : 14}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            }
            const w = n.w ?? NODE_W;
            const h = n.h ?? NODE_H;
            const uiLine = (n.uis ?? []).join(" · ");
            return (
              <g key={n.id} onPointerDown={(e) => onPointerDownNode(e, n)} style={{ cursor: mode === "edit" ? "move" : "pointer" }}>
                <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={9} fill={C.card} stroke={isSel || isFrom ? C.sel : C.cardBorder} strokeWidth={isSel || isFrom ? 3 : 1.5} />
                <text x={n.x} y={n.y - 6} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.ink} style={{ fontFamily: "var(--font-spline-mono), monospace" }}>
                  {clip(n.label, 22)}
                </text>
                {uiLine && (
                  <text x={n.x} y={n.y + 15} textAnchor="middle" fontSize={9} fill={C.muted}>
                    {clip(uiLine, 34)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Panel lateral: nodo o conector seleccionado */}
        {(selNode || selEdge) && (
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <b>{selEdge ? "Conector" : selNode!.kind === "decision" ? "Decisión" : selNode!.kind === "stop" ? "Alto del proceso" : "Tabla"}</b>
              <button className={styles.x} onClick={() => setSel(null)} aria-label="Cerrar">×</button>
            </div>

            {/* ── Conector (arista) ── */}
            {selEdge ? (
              <>
                <p className={styles.pMeta}>
                  {nodeById.get(selEdge.from)?.label ?? "?"} → {nodeById.get(selEdge.to)?.label ?? "?"}
                </p>
                {mode === "edit" && canEdit ? (
                  <>
                    <label className={styles.field}>
                      <span>Resultado (rótulo de la flecha)</span>
                      <input
                        value={selEdge.label ?? ""}
                        placeholder="p. ej. Apto · No Apto · apta"
                        onChange={(e) => patchEdge(selEdge.id, { label: e.target.value || undefined })}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Tono</span>
                      <select
                        value={selEdge.tone ?? ""}
                        onChange={(e) => patchEdge(selEdge.id, { tone: (e.target.value || undefined) as EdgeTone | undefined })}
                      >
                        <option value="">Neutro (gris)</option>
                        <option value="ok">Verde · continúa</option>
                        <option value="bad">Rojo · se detiene</option>
                        <option value="info">Gris · informativo</option>
                      </select>
                    </label>
                    <button className={styles.del} onClick={deleteSel}>Borrar conector</button>
                  </>
                ) : (
                  <p className={styles.pLabel} style={{ marginTop: 8 }}>{selEdge.label || "(sin resultado)"}</p>
                )}
              </>
            ) : mode === "edit" && canEdit ? (
              /* ── Nodo · edición ── */
              <>
                <label className={styles.field}>
                  <span>Etiqueta</span>
                  <input value={selNode!.label} onChange={(e) => patchNode(selNode!.id, { label: e.target.value })} />
                </label>
                <label className={styles.field}>
                  <span>Tipo</span>
                  <select value={selNode!.kind} onChange={(e) => patchNode(selNode!.id, { kind: e.target.value as MapNode["kind"] })}>
                    <option value="table">Schema / Table</option>
                    <option value="decision">Decisión</option>
                    <option value="stop">Alto del proceso</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Etapa</span>
                  <select value={selNode!.stageId ?? ""} onChange={(e) => patchNode(selNode!.id, { stageId: e.target.value || undefined })}>
                    <option value="">(ninguna)</option>
                    {config.stages.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </label>
                <div className={styles.field}>
                  <span>Se muestra en (UIs)</span>
                  {(selNode!.uis ?? []).length > 0 && (
                    <div className={styles.chips}>
                      {selNode!.uis!.map((u, i) => (
                        <span key={i} className={styles.chip}>
                          {u}
                          <button onClick={() => patchNode(selNode!.id, { uis: selNode!.uis!.filter((_, j) => j !== i) })} aria-label="Quitar">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <select
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && !(selNode!.uis ?? []).includes(v)) patchNode(selNode!.id, { uis: [...(selNode!.uis ?? []), v] });
                    }}
                  >
                    <option value="">＋ agregar UI…</option>
                    {UI_CATALOG.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.items.map((it) => (
                          <option key={it} value={it}>{it}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input
                      placeholder="otra UI…"
                      value={customUi}
                      onChange={(e) => setCustomUi(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = customUi.trim();
                          if (v && !(selNode!.uis ?? []).includes(v)) patchNode(selNode!.id, { uis: [...(selNode!.uis ?? []), v] });
                          setCustomUi("");
                        }
                      }}
                    />
                  </div>
                </div>
                <button className={styles.del} onClick={deleteSel}>Borrar nodo</button>
              </>
            ) : (
              /* ── Nodo · lectura ── */
              <>
                <p className={styles.pLabel}>{selNode!.label}</p>
                {selNode!.tableName && <p className={styles.pMeta}>Tabla: <span className="mono">{selNode!.tableName}</span></p>}
                <p className={styles.pMeta}>Etapa: {stageOf(selNode!.stageId)}</p>
                <p className={styles.pMeta} style={{ marginTop: 8, fontWeight: 700, color: C.ink }}>Se muestra en:</p>
                {(selNode!.uis ?? []).length ? (
                  <ul className={styles.uiList}>
                    {selNode!.uis!.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.pMeta}>—</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Solo visible al imprimir (CSS @media print): el mapa clonado a página completa. */}
      <div className={styles.printArea} ref={printRef} aria-hidden />
    </div>
  );
}

// ── helpers de texto ──
function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
function wrap(s: string, max: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}
