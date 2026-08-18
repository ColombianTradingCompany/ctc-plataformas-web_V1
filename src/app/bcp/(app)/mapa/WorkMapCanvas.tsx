"use client";

// ── Mapa de Trabajo · lienzo interactivo (SVG a mano, sin librerías) ─────────
// BASE = el sistema real (solo lectura). PROPUESTAS = iteraciones que el owner
// diseña para proponer cambios (Guardar crea/actualiza una propuesta; nunca
// toca el Base). Colores concretos (no variables CSS) para que la exportación a
// PDF conserve el color. Coordenadas = centro del nodo.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { saveProposal, getProposal, deleteProposal, listProposals } from "../workmapActions";
import {
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
  type StageTint,
  type ProposalMeta,
} from "@/lib/workmap/schema";
import styles from "./mapa.module.css";

const STOP_W = 196;
const STOP_H = 52;
const MILE_W = 226;
const MILE_H = 72;
const ART_W = 188;
const ART_H = 60;

const C = {
  bg: "#FBF9F2",
  band: "#ECE7D8",
  bandLine: "#D8D2C0",
  bandText: "#7C7660",
  tintFree: "#E7F0E6",
  tintPaid: "#F6EEDA",
  tintSupport: "#ECE7D8",
  card: "#FFFFFF",
  cardBorder: "#C4BEAC",
  ink: "#1C2620",
  muted: "#6B7268",
  decisionFill: "#FBF2E1",
  decisionBorder: "#C9A45C",
  decisionText: "#7A5A16",
  mileFill: "#FBF1DC",
  mileBorder: "#B98A2A",
  mileText: "#6E4E10",
  sel: "#17402B",
  edge: "#7C7C74",
  ok: "#2E7D52",
  bad: "#B01F24",
  info: "#9A9484",
  stopFill: "#FBE9E7",
  stopBorder: "#C9827C",
  stopText: "#7A2A24",
  artFill: "#E8F0F3",
  artBorder: "#5E7A88",
  artText: "#28414B",
};
const tintColor = (t?: StageTint) => (t === "free" ? C.tintFree : t === "paid" ? C.tintPaid : t === "support" ? C.tintSupport : C.band);
const toneColor = (t?: EdgeTone) => (t === "ok" ? C.ok : t === "bad" ? C.bad : t === "info" ? C.info : C.edge);

type Mode = "view" | "edit";
type ViewBox = { x: number; y: number; w: number; h: number };
type Sel = { t: "node" | "edge"; id: string } | null;
type Source = { kind: "base" } | { kind: "draft" } | { kind: "proposal"; id: string; name: string; note: string | null };

function nodeHalf(n: MapNode) {
  if (n.kind === "decision") return { hw: DECISION_SIZE / 2, hh: DECISION_SIZE / 2 };
  if (n.kind === "stop") return { hw: (n.w ?? STOP_W) / 2, hh: (n.h ?? STOP_H) / 2 };
  if (n.kind === "milestone") return { hw: (n.w ?? MILE_W) / 2, hh: (n.h ?? MILE_H) / 2 };
  if (n.kind === "artifact") return { hw: (n.w ?? ART_W) / 2, hh: (n.h ?? ART_H) / 2 };
  return { hw: (n.w ?? NODE_W) / 2, hh: (n.h ?? NODE_H) / 2 };
}

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

const clone = (c: WorkMapConfig): WorkMapConfig => JSON.parse(JSON.stringify(c));

export function WorkMapCanvas({ base, proposals, canEdit }: { base: WorkMapConfig; proposals: ProposalMeta[]; canEdit: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const idSeq = useRef(1000);
  const newId = (prefix: string) => `${prefix}u${(idSeq.current += 1)}`;

  const [source, setSource] = useState<Source>({ kind: "base" });
  const [config, setConfig] = useState<WorkMapConfig>(base);
  const [propList, setPropList] = useState<ProposalMeta[]>(proposals);
  const [mode, setMode] = useState<Mode>("view");
  const [view, setView] = useState<ViewBox>(() => ({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H }));
  const [sel, setSel] = useState<Sel>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [customUi, setCustomUi] = useState("");
  const [saveDlg, setSaveDlg] = useState<{ name: string; note: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const editable = canEdit && source.kind !== "base";
  const editing = editable && mode === "edit";
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
    return r && r.width > 0 ? view.w / r.width : 1;
  };
  const toSvg = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: view.x + ((cx - r.left) / r.width) * view.w, y: view.y + ((cy - r.top) / r.height) * view.h };
  };

  // ── Fuente: Base / propuesta / borrador ──
  function showBase() {
    setSource({ kind: "base" });
    setConfig(base);
    setMode("view");
    setSel(null);
    setConnectFrom(null);
    setMsg(null);
  }
  async function loadProposal(meta: ProposalMeta) {
    setBusy(true);
    setMsg(null);
    const cfg = await getProposal(meta.id);
    setBusy(false);
    if (!cfg) return setMsg("No se pudo cargar la propuesta.");
    setConfig(cfg);
    setSource({ kind: "proposal", id: meta.id, name: meta.name, note: meta.note });
    setMode("view");
    setSel(null);
    setConnectFrom(null);
  }
  function newDraft() {
    setConfig(clone(config)); // parte de lo que se está viendo (Base o propuesta)
    setSource({ kind: "draft" });
    setMode("edit");
    setSel(null);
    setMsg("Borrador nuevo — edite y Guarde como propuesta.");
  }
  async function refreshList() {
    setPropList(await listProposals());
  }

  // ── Guardar propuesta ──
  async function saveExisting() {
    if (source.kind !== "proposal") return;
    setBusy(true);
    setMsg(null);
    const res = await saveProposal({ id: source.id, name: source.name, note: source.note ?? undefined, config });
    setBusy(false);
    if (res.ok) {
      setMsg("Propuesta guardada ✓");
      refreshList();
    } else setMsg(res.error);
  }
  async function confirmSaveNew() {
    if (!saveDlg) return;
    setBusy(true);
    setMsg(null);
    const res = await saveProposal({ name: saveDlg.name, note: saveDlg.note || undefined, config });
    setBusy(false);
    if (!res.ok) return setMsg(res.error);
    setSource({ kind: "proposal", id: res.id, name: saveDlg.name.trim(), note: saveDlg.note.trim() || null });
    setSaveDlg(null);
    setMsg("Propuesta guardada ✓");
    refreshList();
  }
  async function removeProposal() {
    if (source.kind !== "proposal") return;
    if (!window.confirm(`¿Borrar la propuesta «${source.name}»?`)) return;
    setBusy(true);
    const res = await deleteProposal(source.id);
    setBusy(false);
    if (!res.ok) return setMsg(res.error);
    await refreshList();
    showBase();
  }

  // ── Puntero (pan + arrastre) ──
  function capture(el: Element, pointerId: number) {
    try {
      el.setPointerCapture?.(pointerId);
    } catch {}
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
      setConnectFrom(n.id);
      return;
    }
    if (connectFrom) {
      if (connectFrom !== n.id) {
        const eid = newId("e");
        setConfig((c) => ({ ...c, edges: [...c.edges, { id: eid, from: connectFrom, to: n.id }] }));
        setSel({ t: "edge", id: eid });
      }
      setConnectFrom(null);
      return;
    }
    setSel({ t: "node", id: n.id });
    if (!editing) return;
    drag.current = { kind: "node", id: n.id, sx: e.clientX, sy: e.clientY, nx: n.x, ny: n.y, sc: scaleX(), moved: false };
    capture(e.currentTarget as Element, e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "pan") {
      setView((v) => ({ ...v, x: d.vx - (e.clientX - d.sx) * d.sc, y: d.vy - (e.clientY - d.sy) * d.sc }));
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
        return { x: p.x - (p.x - v.x) * ratio, y: p.y - (p.y - v.y) * ratio, w: nw, h: v.h * ratio };
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
  const fit = () => setView(contentBounds(config));

  // ── Edición ──
  function patchNode(id: string, patch: Partial<MapNode>) {
    setConfig((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  }
  function patchEdge(id: string, patch: Partial<MapEdge>) {
    setConfig((c) => ({ ...c, edges: c.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }
  function addNode(kind: MapNode["kind"]) {
    const id = newId("n");
    const label =
      kind === "decision"
        ? "Nueva decisión"
        : kind === "stop"
          ? "Alto del proceso"
          : kind === "milestone"
            ? "Hito / entrega"
            : kind === "artifact"
              ? "Documento"
              : "nueva_tabla";
    const n: MapNode = { id, kind, label, uis: [], x: Math.round(view.x + view.w / 2), y: Math.round(view.y + view.h / 2) };
    setConfig((c) => ({ ...c, nodes: [...c.nodes, n] }));
    setSel({ t: "node", id });
  }
  function deleteSel() {
    if (!sel) return;
    if (sel.t === "node") {
      setConfig((c) => ({ ...c, nodes: c.nodes.filter((n) => n.id !== sel.id), edges: c.edges.filter((e) => e.from !== sel.id && e.to !== sel.id) }));
    } else {
      setConfig((c) => ({ ...c, edges: c.edges.filter((e) => e.id !== sel.id) }));
    }
    setSel(null);
  }

  // ── Exportar (PDF por impresión en la misma página; contenedor en <body>) ──
  function exportPdf(kind: "view" | "full") {
    const vb = kind === "full" ? contentBounds(config) : view;
    const svg = svgRef.current;
    const host = printRef.current;
    if (!svg || !host) return;
    const c = svg.cloneNode(true) as SVGSVGElement;
    c.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    c.removeAttribute("style");
    c.setAttribute("width", "100%");
    c.setAttribute("height", "100%");
    c.style.cursor = "default";
    host.replaceChildren(c);
    const cleanup = () => {
      host.replaceChildren();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 2000);
  }

  const stageOf = (id?: string) => config.stages.find((s) => s.id === id)?.label ?? "—";
  const kindLabel = (k: MapNode["kind"]) =>
    k === "decision"
      ? "Decisión"
      : k === "stop"
        ? "Alto del proceso"
        : k === "milestone"
          ? "Hito / entrega"
          : k === "artifact"
            ? "Documento / artefacto"
            : "Tabla";

  return (
    <div className={styles.root}>
      {/* Barra de FUENTE: Base vs propuestas */}
      <div className={styles.sourceBar}>
        <span className={styles.sourceLabel}>Viendo:</span>
        <select
          className={styles.sourceSel}
          value={source.kind === "proposal" ? source.id : "base"}
          onChange={(e) => (e.target.value === "base" ? showBase() : loadProposal(propList.find((p) => p.id === e.target.value)!))}
        >
          <option value="base">Base · sistema real (solo lectura)</option>
          {propList.length > 0 && (
            <optgroup label="Propuestas">
              {propList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
          )}
        </select>
        {source.kind === "draft" && <span className={styles.draftTag}>Borrador sin guardar</span>}
        {canEdit && <button className={styles.tbtn} onClick={newDraft} disabled={busy}>＋ Nueva propuesta</button>}
        {source.kind === "proposal" && canEdit && (
          <button className={styles.tbtn} onClick={removeProposal} disabled={busy} style={{ borderColor: "var(--red)", color: "var(--red)" }}>
            Borrar propuesta
          </button>
        )}
        {msg && <span className={styles.msg}>{msg}</span>}
      </div>

      {/* Barra de herramientas */}
      <div className={styles.toolbar}>
        {editable && (
          <div className={styles.segmented}>
            <button className={mode === "view" ? styles.segOn : styles.seg} onClick={() => { setMode("view"); setConnectFrom(null); }}>Ver</button>
            <button className={mode === "edit" ? styles.segOn : styles.seg} onClick={() => setMode("edit")}>Editar</button>
          </div>
        )}
        {source.kind === "base" && <span className={styles.roLabel}>El Base es el sistema real — solo lectura. Cree una propuesta para editar.</span>}

        {editing && (
          <div className={styles.group}>
            <button className={styles.tbtn} onClick={() => addNode("table")}>＋ Tabla</button>
            <button className={styles.tbtn} onClick={() => addNode("decision")}>＋ Decisión</button>
            <button className={styles.tbtn} onClick={() => addNode("stop")}>＋ Alto</button>
            <button className={styles.tbtn} onClick={() => addNode("milestone")}>＋ Hito</button>
            <button className={styles.tbtn} onClick={() => addNode("artifact")}>＋ Documento</button>
            <button
              className={connectFrom ? styles.tbtnOn : styles.tbtn}
              onClick={() => setConnectFrom(connectFrom ? null : sel?.t === "node" ? sel.id : "__pick__")}
            >
              {connectFrom ? "Conectando…" : "↳ Conectar"}
            </button>
            <button className={styles.tbtn} disabled={!sel} onClick={deleteSel}>🗑 Borrar</button>
            {source.kind === "proposal" && <button className={styles.tbtnSolid} disabled={busy} onClick={saveExisting}>{busy ? "…" : "Guardar"}</button>}
            <button className={styles.tbtn} disabled={busy} onClick={() => setSaveDlg({ name: source.kind === "proposal" ? `${source.name} (copia)` : "", note: source.kind === "proposal" ? source.note ?? "" : "" })}>
              {source.kind === "proposal" ? "Guardar como…" : "Guardar propuesta"}
            </button>
          </div>
        )}

        <div className={styles.group} style={{ marginLeft: "auto" }}>
          <button className={styles.tbtn} onClick={() => zoom(0.85)} title="Acercar">＋</button>
          <button className={styles.tbtn} onClick={() => zoom(1.18)} title="Alejar">－</button>
          <button className={styles.tbtn} onClick={fit}>Ajustar</button>
          <button className={styles.tbtn} onClick={() => exportPdf("view")}>PDF · vista</button>
          <button className={styles.tbtn} onClick={() => exportPdf("full")}>PDF · completo</button>
        </div>
      </div>

      <div className={styles.hint}>
        {connectFrom
          ? "Conectar: toque el nodo ORIGEN, luego el DESTINO (o vuelva a «Conectar» para cancelar)."
          : editing
            ? "Arrastre para mover · rueda/＋－ zoom · toque un nodo/flecha para editarlo."
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

          <rect x={-5000} y={-5000} width={20000} height={20000} fill={C.bg} onPointerDown={onPointerDownBg} />

          {config.stages.map((s) => (
            <g key={s.id}>
              <rect x={s.x0} y={BAND_Y} width={Math.max(0, s.x1 - s.x0)} height={CANVAS_H - BAND_Y} fill={tintColor(s.tint)} stroke={C.bandLine} />
              <text x={(s.x0 + s.x1) / 2} y={BAND_Y + 34} textAnchor="middle" fontSize={19} fontWeight={800} fill={C.bandText} style={{ letterSpacing: 0.5 }}>
                {s.label}
              </text>
            </g>
          ))}

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
                <path d={path} fill="none" stroke="transparent" strokeWidth={16} style={{ cursor: editing ? "pointer" : "default" }} onPointerDown={(ev) => { ev.stopPropagation(); setSel({ t: "edge", id: e.id }); }} />
                <path d={path} fill="none" stroke={col} strokeWidth={isSel ? 3.5 : 2} markerEnd="url(#wm-arrow)" />
                {e.label && (
                  <text x={(pa.x + pb.x) / 2} y={(pa.y + pb.y) / 2 - 6} textAnchor="middle" fontSize={12} fill={col} fontWeight={600}>{e.label}</text>
                )}
              </g>
            );
          })}

          {config.nodes.map((n) => {
            const isSel = sel?.t === "node" && sel.id === n.id;
            const isFrom = connectFrom === n.id;
            const cur = editing ? "move" : "pointer";
            if (n.kind === "decision") {
              const s = DECISION_SIZE / 2;
              return (
                <g key={n.id} onPointerDown={(e) => onPointerDownNode(e, n)} style={{ cursor: cur }}>
                  <polygon points={`${n.x},${n.y - s} ${n.x + s},${n.y} ${n.x},${n.y + s} ${n.x - s},${n.y}`} fill={C.decisionFill} stroke={isSel || isFrom ? C.sel : C.decisionBorder} strokeWidth={isSel || isFrom ? 3 : 2} />
                  <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={C.decisionText}>
                    {wrap(n.label, 14).map((ln, i, arr) => (<tspan key={i} x={n.x} dy={i === 0 ? -(arr.length - 1) * 7 : 14}>{ln}</tspan>))}
                  </text>
                </g>
              );
            }
            if (n.kind === "milestone") {
              const w = n.w ?? MILE_W;
              const h = n.h ?? MILE_H;
              const uiLine = (n.uis ?? []).join(" · ");
              return (
                <g key={n.id} onPointerDown={(e) => onPointerDownNode(e, n)} style={{ cursor: cur }}>
                  <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={12} fill={C.mileFill} stroke={isSel || isFrom ? C.sel : C.mileBorder} strokeWidth={isSel || isFrom ? 3.5 : 2.5} />
                  <text x={n.x} y={n.y - (uiLine ? 6 : -2)} textAnchor="middle" fontSize={13} fontWeight={800} fill={C.mileText}>★ {clip(n.label, 26)}</text>
                  {uiLine && (<text x={n.x} y={n.y + 16} textAnchor="middle" fontSize={9.5} fill={C.mileText} opacity={0.85}>{clip(uiLine, 40)}</text>)}
                </g>
              );
            }
            if (n.kind === "stop") {
              const w = n.w ?? STOP_W;
              const h = n.h ?? STOP_H;
              return (
                <g key={n.id} onPointerDown={(e) => onPointerDownNode(e, n)} style={{ cursor: cur }}>
                  <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={h / 2} fill={C.stopFill} stroke={isSel || isFrom ? C.sel : C.stopBorder} strokeWidth={isSel || isFrom ? 3 : 2} />
                  <text x={n.x} y={n.y} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={C.stopText}>
                    {wrap(n.label, 26).map((ln, i, arr) => (<tspan key={i} x={n.x} dy={i === 0 ? -(arr.length - 1) * 7 + 4 : 14}>{ln}</tspan>))}
                  </text>
                </g>
              );
            }
            if (n.kind === "artifact") {
              const w = n.w ?? ART_W;
              const h = n.h ?? ART_H;
              const uiLine = (n.uis ?? []).join(" · ");
              const left = n.x - w / 2;
              const top = n.y - h / 2;
              const fold = 14;
              return (
                <g key={n.id} onPointerDown={(e) => onPointerDownNode(e, n)} style={{ cursor: cur }}>
                  {/* Hoja con esquina doblada: un documento/entregable, no una tabla. */}
                  <path
                    d={`M${left},${top} H${left + w - fold} L${left + w},${top + fold} V${top + h} H${left} Z`}
                    fill={C.artFill}
                    stroke={isSel || isFrom ? C.sel : C.artBorder}
                    strokeWidth={isSel || isFrom ? 3 : 1.8}
                  />
                  <path d={`M${left + w - fold},${top} V${top + fold} H${left + w} Z`} fill={C.artBorder} opacity={0.28} />
                  <text x={n.x} y={n.y - (uiLine ? 6 : -2)} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.artText}>▤ {clip(n.label, 22)}</text>
                  {uiLine && (<text x={n.x} y={n.y + 15} textAnchor="middle" fontSize={9} fill={C.artText} opacity={0.8}>{clip(uiLine, 34)}</text>)}
                </g>
              );
            }
            const w = n.w ?? NODE_W;
            const h = n.h ?? NODE_H;
            const uiLine = (n.uis ?? []).join(" · ");
            return (
              <g key={n.id} onPointerDown={(e) => onPointerDownNode(e, n)} style={{ cursor: cur }}>
                <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={9} fill={C.card} stroke={isSel || isFrom ? C.sel : C.cardBorder} strokeWidth={isSel || isFrom ? 3 : 1.5} />
                <text x={n.x} y={n.y - 6} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.ink} style={{ fontFamily: "var(--font-spline-mono), monospace" }}>{clip(n.label, 22)}</text>
                {uiLine && (<text x={n.x} y={n.y + 15} textAnchor="middle" fontSize={9} fill={C.muted}>{clip(uiLine, 34)}</text>)}
              </g>
            );
          })}
        </svg>

        {/* Panel del nodo/conector seleccionado */}
        {(selNode || selEdge) && (
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <b>{selEdge ? "Conector" : kindLabel(selNode!.kind)}</b>
              <button className={styles.x} onClick={() => setSel(null)} aria-label="Cerrar">×</button>
            </div>

            {selEdge ? (
              <>
                <p className={styles.pMeta}>{nodeById.get(selEdge.from)?.label ?? "?"} → {nodeById.get(selEdge.to)?.label ?? "?"}</p>
                {editing ? (
                  <>
                    <label className={styles.field}>
                      <span>Resultado (rótulo de la flecha)</span>
                      <input value={selEdge.label ?? ""} placeholder="p. ej. Apto · No Apto · apta" onChange={(e) => patchEdge(selEdge.id, { label: e.target.value || undefined })} />
                    </label>
                    <label className={styles.field}>
                      <span>Tono</span>
                      <select value={selEdge.tone ?? ""} onChange={(e) => patchEdge(selEdge.id, { tone: (e.target.value || undefined) as EdgeTone | undefined })}>
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
            ) : editing ? (
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
                    <option value="milestone">Hito / entrega</option>
                    <option value="artifact">Documento / artefacto</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Etapa</span>
                  <select value={selNode!.stageId ?? ""} onChange={(e) => patchNode(selNode!.id, { stageId: e.target.value || undefined })}>
                    <option value="">(ninguna)</option>
                    {config.stages.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
                  </select>
                </label>
                <div className={styles.field}>
                  <span>Se muestra en (UIs)</span>
                  {(selNode!.uis ?? []).length > 0 && (
                    <div className={styles.chips}>
                      {selNode!.uis!.map((u, i) => (
                        <span key={i} className={styles.chip}>{u}<button onClick={() => patchNode(selNode!.id, { uis: selNode!.uis!.filter((_, j) => j !== i) })} aria-label="Quitar">×</button></span>
                      ))}
                    </div>
                  )}
                  <select value="" onChange={(e) => { const v = e.target.value; if (v && !(selNode!.uis ?? []).includes(v)) patchNode(selNode!.id, { uis: [...(selNode!.uis ?? []), v] }); }}>
                    <option value="">＋ agregar UI…</option>
                    {UI_CATALOG.map((g) => (<optgroup key={g.group} label={g.group}>{g.items.map((it) => (<option key={it} value={it}>{it}</option>))}</optgroup>))}
                  </select>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input placeholder="otra UI…" value={customUi} onChange={(e) => setCustomUi(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { const v = customUi.trim(); if (v && !(selNode!.uis ?? []).includes(v)) patchNode(selNode!.id, { uis: [...(selNode!.uis ?? []), v] }); setCustomUi(""); } }} />
                  </div>
                </div>
                <button className={styles.del} onClick={deleteSel}>Borrar nodo</button>
              </>
            ) : (
              <>
                <p className={styles.pLabel}>{selNode!.label}</p>
                {selNode!.tableName && <p className={styles.pMeta}>Tabla: <span className="mono">{selNode!.tableName}</span></p>}
                <p className={styles.pMeta}>Etapa: {stageOf(selNode!.stageId)}</p>
                <p className={styles.pMeta} style={{ marginTop: 8, fontWeight: 700, color: C.ink }}>Se muestra en:</p>
                {(selNode!.uis ?? []).length ? (
                  <ul className={styles.uiList}>{selNode!.uis!.map((u, i) => (<li key={i}>{u}</li>))}</ul>
                ) : (
                  <p className={styles.pMeta}>—</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Diálogo Guardar propuesta */}
        {saveDlg && (
          <div className={styles.dlgBg} onPointerDown={() => setSaveDlg(null)}>
            <div className={styles.dlg} onPointerDown={(e) => e.stopPropagation()}>
              <b>Guardar como propuesta</b>
              <p className={styles.pMeta}>Una propuesta es un cambio que usted diseña para que CTC lo implemente. El Base no cambia.</p>
              <label className={styles.field}><span>Nombre</span>
                <input autoFocus value={saveDlg.name} onChange={(e) => setSaveDlg({ ...saveDlg, name: e.target.value })} placeholder="p. ej. Separar EVA de la ficha" />
              </label>
              <label className={styles.field}><span>Nota (opcional)</span>
                <textarea rows={3} value={saveDlg.note} onChange={(e) => setSaveDlg({ ...saveDlg, note: e.target.value })} placeholder="Qué propone cambiar y por qué…" />
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className={styles.tbtnSolid} disabled={busy || !saveDlg.name.trim()} onClick={confirmSaveNew}>{busy ? "Guardando…" : "Guardar propuesta"}</button>
                <button className={styles.tbtn} onClick={() => setSaveDlg(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {mounted && createPortal(<div className={styles.printArea} ref={printRef} aria-hidden />, document.body)}
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
