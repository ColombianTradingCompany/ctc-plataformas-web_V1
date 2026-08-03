"use client";

import { useState } from "react";

// ── Estructura del sistema (V4 · revisión 2026-08-03) ────────────────────────
// El diagrama de la reestructura V4 aprobado por el owner (2026-07-31) más las
// revisiones de la sesión de identidad (2026-08-02/03): Terratalento en las dos
// puntas (login del recolector + matching en el ECP), Coffeed y Herramientas
// colgados como módulos de las tres plataformas mayores, Plus por solicitud,
// la matriz de membresías y la Red de Socios con su landing como puerta de
// credenciales (§5.2 resuelto). SVG autocontenido con la paleta corporativa; si
// la estructura de la red cambia, este dibujo se actualiza a mano igual que el
// mapa interactivo.

const INK = "#232323";
const MUTED = "#6B6459";
const HOOK_TOOLS = "#D96F1E"; // naranja: panel de Herramientas montado
const HOOK_COFFEED = "#C9A227"; // dorado: muro Coffeed montado

function Box({ x, y, w, h, kind, title, sub, titleY, subY }: {
  x: number; y: number; w: number; h: number;
  kind: "hub" | "bi" | "cap" | "dif" | "int";
  title: string; sub?: string; titleY: number; subY?: number;
}) {
  const palette: Record<string, { fill: string; stroke: string; dash?: string }> = {
    hub: { fill: "#F0E7FD", stroke: "#3C0A86" },
    bi: { fill: "#E7EFFB", stroke: "#003087" },
    cap: { fill: "#FBF3DE", stroke: "#A87A14" },
    dif: { fill: "#F1F0EE", stroke: "#6B6459" },
    int: { fill: "#FFFFFF", stroke: "#B9B3A9", dash: "4 3" },
  };
  const p = palette[kind];
  const cx = x + w / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={p.fill} stroke={p.stroke} strokeWidth={1.4} strokeDasharray={p.dash} />
      <text x={cx} y={titleY} textAnchor="middle" fontSize={13.5} fontWeight={600} fill={INK}>{title}</text>
      {sub && <text x={cx} y={subY} textAnchor="middle" fontSize={11.5} fill={MUTED}>{sub}</text>}
    </g>
  );
}

// Los cinco nodos socios en fila: misma familia azul, tipografía más compacta.
function SocioBox({ x, y, title }: { x: number; y: number; title: string }) {
  return (
    <g>
      <rect x={x} y={y} width={128} height={44} rx={8} fill="#E7EFFB" stroke="#003087" strokeWidth={1.4} />
      <text x={x + 64} y={y + 18} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={INK}>{title}</text>
      <text x={x + 64} y={y + 33} textAnchor="middle" fontSize={10} fill={MUTED}>solo login</text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#55504A" strokeWidth={1.5} markerEnd="url(#estr-arrow)" />;
}

// Gancho de módulo: curva de color desde una plataforma azul hacia el módulo
// compartido que lleva montado (naranja = Herramientas, dorado = Coffeed).
function Hook({ d, color, marker }: { d: string; color: string; marker: string }) {
  return <path d={d} fill="none" stroke={color} strokeWidth={1.6} markerEnd={`url(#${marker})`} />;
}

export function EstructuraDiagram() {
  return (
    <svg width="100%" viewBox="0 0 760 1030" role="img" aria-label="Diagrama de la estructura V4 de la red CTC, revisión del 2026-08-03" style={{ display: "block" }}>
      <defs>
        <marker id="estr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#55504A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="estr-hook-o" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke={HOOK_TOOLS} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="estr-hook-y" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke={HOOK_COFFEED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      <Box x={40} y={34} w={680} h={50} kind="hub" title="CTC Home · ctcexport.com" sub="enrutador: puerta e índice de toda la red" titleY={55} subY={73} />
      <Arrow x1={380} y1={84} x2={380} y2={106} />
      <Box x={240} y={110} w={280} h={52} kind="hub" title="CTC Control Panel" sub="landing pública + login maestro" titleY={132} subY={150} />

      <rect x={36} y={188} width={452} height={66} rx={8} fill="none" stroke="#B9B3A9" strokeWidth={1} strokeDasharray="5 4" />

      <Arrow x1={320} y1={162} x2={144} y2={192} />
      <Arrow x1={380} y1={162} x2={380} y2={192} />
      <Arrow x1={440} y1={162} x2={616} y2={192} />

      <Box x={44} y={196} w={200} h={50} kind="hub" title="BCP · Base" sub="el negocio núcleo" titleY={218} subY={235} />
      <Box x={280} y={196} w={200} h={50} kind="hub" title="OCP · Operación" sub="rama operativa real" titleY={218} subY={235} />
      <Box x={516} y={196} w={200} h={50} kind="hub" title="ECP · Dirección" sub="negocio estratégico" titleY={218} subY={235} />

      <Arrow x1={144} y1={246} x2={144} y2={258} />
      <Arrow x1={380} y1={246} x2={380} y2={258} />
      <Arrow x1={616} y1={246} x2={616} y2={258} />

      <Box x={44} y={262} w={200} h={40} kind="int" title="Black Stock" sub="compras Black · embudo KRA" titleY={279} subY={294} />
      <Box x={44} y={308} w={200} h={40} kind="int" title="CRM Co-Create" sub="form → kanban → Black Stock" titleY={325} subY={340} />
      <Box x={280} y={262} w={200} h={40} kind="int" title="Leads · general" sub="recepción de la red" titleY={279} subY={294} />
      <text x={262} y={362} textAnchor="middle" fontSize={11.5} fill={MUTED}>BCP + OCP = orquestación operacional</text>

      <Box x={516} y={262} w={200} h={40} kind="int" title="Gestión de Coffeed" sub="publica; el mundo lee" titleY={279} subY={294} />
      <Box x={516} y={308} w={200} h={40} kind="int" title="CRM Tech · Varietales" sub="form → kanban · contexto" titleY={325} subY={340} />
      <Box x={516} y={354} w={200} h={40} kind="int" title="Terratalento · matching" sub="jornadas del KR × recolectores" titleY={371} subY={386} />
      <Box x={516} y={400} w={200} h={40} kind="int" title="Gestión de Herramientas" sub="Default/Plus · solicitudes" titleY={417} subY={432} />
      <Box x={516} y={446} w={200} h={40} kind="int" title="IT y Plataforma" sub="+ Back Office (después)" titleY={463} subY={478} />

      <Box x={44} y={520} w={200} h={46} kind="bi" title="Kaffetal Regal" sub="catálogo: Specialty + Black" titleY={541} subY={557} />
      <Box x={44} y={574} w={200} h={46} kind="bi" title="Cherry Picked" sub="Green · Roast · X" titleY={595} subY={611} />
      <Box x={44} y={628} w={200} h={46} kind="bi" title="Terratalento" sub="landing · login con Google" titleY={649} subY={665} />
      <Box x={44} y={682} w={200} h={46} kind="cap" title="Co-Create" sub="form → CRM en BCP" titleY={703} subY={719} />
      <text x={144} y={746} textAnchor="middle" fontSize={11.5} fill={MUTED}>
        ambas clases de café se ofrecen
        <tspan x={144} dy="1.35em">a los dos outlets</tspan>
      </text>

      <Box x={516} y={520} w={200} h={46} kind="bi" title="Directorio del Café" sub="landing · login" titleY={541} subY={557} />
      <Box x={516} y={574} w={200} h={46} kind="cap" title="CTC Tech" sub="form → CRM en ECP" titleY={595} subY={611} />
      <Box x={516} y={628} w={200} h={46} kind="cap" title="Varietales" sub="form → CRM en ECP" titleY={649} subY={665} />

      <Box x={280} y={556} w={200} h={46} kind="dif" title="Herramientas del Café" sub="Default libre · Plus por solicitud" titleY={577} subY={593} />
      <Box x={280} y={618} w={200} h={46} kind="dif" title="Coffeed" sub="home propia · publica el ECP" titleY={639} subY={655} />

      <Hook d="M244 537 Q268 542 278 570" color={HOOK_TOOLS} marker="estr-hook-o" />
      <Hook d="M244 591 Q262 589 278 584" color={HOOK_TOOLS} marker="estr-hook-o" />
      <Hook d="M516 537 Q494 542 482 570" color={HOOK_TOOLS} marker="estr-hook-o" />
      <Hook d="M244 547 Q266 560 278 632" color={HOOK_COFFEED} marker="estr-hook-y" />
      <Hook d="M244 601 Q264 612 278 638" color={HOOK_COFFEED} marker="estr-hook-y" />
      <Hook d="M516 547 Q496 560 482 632" color={HOOK_COFFEED} marker="estr-hook-y" />

      <text x={380} y={790} textAnchor="middle" fontSize={11.5} fill={MUTED}>Red de Socios — credenciales por nodo</text>
      <SocioBox x={44} y={800} title="Centro de Calidad" />
      <SocioBox x={182} y={800} title="Agente de Carga" />
      <SocioBox x={320} y={800} title="Nacionalización" />
      <SocioBox x={458} y={800} title="Master Roaster" />
      <SocioBox x={596} y={800} title="Estudio de Contenido" />
      <text x={380} y={862} textAnchor="middle" fontSize={11} fill={MUTED}>
        la landing de cada socio queda como su puerta de credenciales (decisión 2026-08-03);
        <tspan x={380} dy="1.3em">evoluciona cuando se trabaje la funcionalidad de cada perfil</tspan>
      </text>

      <rect x={40} y={896} width={680} height={64} rx={8} fill="#FBFAF8" stroke="#B9B3A9" strokeWidth={1} strokeDasharray="5 4" />
      <text x={380} y={916} textAnchor="middle" fontSize={11.5} fill={INK}>Una identidad · varias membresías: productor ⊕ comprador · el Directorio compone con cualquiera</text>
      <text x={380} y={933} textAnchor="middle" fontSize={11.5} fill={INK}>Terratalento nunca productor/comprador · socios solo entre sí y con el Directorio · el bloqueo se explica</text>
      <text x={380} y={950} textAnchor="middle" fontSize={11.5} fill={MUTED}>conmutador «Mi red» en las cabeceras de las cuatro plataformas azules principales</text>

      <rect x={44} y={976} width={10} height={10} rx={2} fill="#E7EFFB" stroke="#003087" />
      <text x={60} y={985} fontSize={11.5} fill={MUTED}>bidireccional (login propio)</text>
      <rect x={260} y={976} width={10} height={10} rx={2} fill="#FBF3DE" stroke="#A87A14" />
      <text x={276} y={985} fontSize={11.5} fill={MUTED}>captación (form → CRM)</text>
      <rect x={470} y={976} width={10} height={10} rx={2} fill="#F1F0EE" stroke="#6B6459" />
      <text x={486} y={985} fontSize={11.5} fill={MUTED}>módulo compartido</text>
      <rect x={44} y={1000} width={10} height={10} rx={2} fill="#FFFFFF" stroke="#B9B3A9" strokeDasharray="3 2" />
      <text x={60} y={1009} fontSize={11.5} fill={MUTED}>módulo interno de consola</text>
      <line x1={260} y1={1005} x2={286} y2={1005} stroke={HOOK_TOOLS} strokeWidth={1.6} />
      <text x={292} y={1009} fontSize={11.5} fill={MUTED}>panel de Herramientas + Plus</text>
      <line x1={470} y1={1005} x2={496} y2={1005} stroke={HOOK_COFFEED} strokeWidth={1.6} />
      <text x={502} y={1009} fontSize={11.5} fill={MUTED}>muro Coffeed montado</text>
    </svg>
  );
}

export function EstructuraModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-sm" type="button" onClick={() => setOpen(true)}>
        Estructura del sistema
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 860 }} onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            <h3>Estructura del sistema · la red V4</h3>
            <p style={{ fontSize: 12.5, color: "var(--muted, #6B6459)", margin: "4px 0 12px" }}>
              El board del 2026-07-31 con las revisiones del 2026-08-02/03: Terratalento en las dos puntas
              (login del recolector + matching en el ECP), Coffeed y Herramientas colgados de las tres
              plataformas mayores, Plus por solicitud, la matriz de membresías y la Red de Socios con su
              landing como puerta. Construido completo (V2.28–V2.41).
            </p>
            <EstructuraDiagram />
          </div>
        </div>
      )}
    </>
  );
}
