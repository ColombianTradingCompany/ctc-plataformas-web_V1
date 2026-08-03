"use client";

import { useState } from "react";

// ── Estructura del sistema · dos diagramas que se complementan ───────────────
// 1. LA RED PÚBLICA — el board del owner (2026-08-03): las plataformas con
//    login, las superficies de captación, los dos módulos compartidos y el
//    Control Panel al centro haciendo Posting / Manage / Screening.
// 2. DENTRO DEL CONTROL PANEL — el árbol de las tres consolas con sus módulos
//    REALES (espejo de src/lib/panel/consoles.ts; si cambia el nav, cambia
//    este dibujo).
// La bisagra entre los dos es la caja "CTC Control Panel", que aparece en
// ambos. En el segundo, el cuadrito de color de cada módulo dice a qué bloque
// del primero atiende — mismo código de color en los dos.

const INK = "#232323";
const MUTED = "#6B6459";
const LINE = "#55504A";

const AZUL = "#003087"; // plataforma con login propio
const AMBAR = "#A87A14"; // captación (form → CRM)
const GRIS = "#6B6459"; // módulo compartido
const MORADO = "#3C0A86"; // enrutador y consolas

const HOOK_TOOLS = "#D96F1E"; // lazo naranja: monta el panel de Herramientas
const HOOK_COFFEED = "#C9A227"; // lazo dorado: monta el muro de Coffeed
const SCREENING = "#6B4FC9"; // la línea del screening del ECP

const FILL = {
  hub: "#F0E7FD",
  bi: "#E7EFFB",
  cap: "#FBF3DE",
  dif: "#F1F0EE",
} as const;

type Kind = keyof typeof FILL;

const STROKE: Record<Kind, string> = { hub: MORADO, bi: AZUL, cap: AMBAR, dif: GRIS };

function Box({ x, y, w, h, kind, title, sub }: {
  x: number; y: number; w: number; h: number; kind: Kind; title: string; sub?: string;
}) {
  const cx = x + w / 2;
  const ty = sub ? y + h / 2 - 3 : y + h / 2 + 5;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={FILL[kind]} stroke={STROKE[kind]} strokeWidth={1.4} />
      <text x={cx} y={ty} textAnchor="middle" fontSize={14} fontWeight={500} fill={INK}>{title}</text>
      {sub && <text x={cx} y={ty + 18} textAnchor="middle" fontSize={12} fill={MUTED}>{sub}</text>}
    </g>
  );
}

// ── Diagrama 1 · la red pública ──────────────────────────────────────────────
export function RedPublicaDiagram() {
  return (
    <svg width="100%" viewBox="0 0 1200 730" role="img" aria-label="La red pública de CTC: plataformas, superficies de captación y módulos compartidos" style={{ display: "block" }}>
      <defs>
        <marker id="red-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="red-hook-o" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke={HOOK_TOOLS} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="red-hook-y" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke={HOOK_COFFEED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      <path d="M403 76 C300 56 170 62 120 140 C70 220 50 400 105 500 C150 580 350 600 500 570 C555 558 590 535 613 512" fill="none" stroke={HOOK_TOOLS} strokeWidth={1.6} markerEnd="url(#red-hook-o)" />
      <path d="M962 76 C1095 56 1180 130 1192 260 C1204 400 1200 530 1130 592 C1060 650 880 615 829 518" fill="none" stroke={HOOK_TOOLS} strokeWidth={1.6} markerEnd="url(#red-hook-o)" />
      <line x1={958} y1={496} x2={829} y2={496} stroke={HOOK_TOOLS} strokeWidth={1.6} markerEnd="url(#red-hook-o)" />

      <path d="M540 104 C570 160 610 210 645 228" fill="none" stroke={HOOK_COFFEED} strokeWidth={1.6} markerEnd="url(#red-hook-y)" />
      <path d="M840 104 C810 160 770 205 750 228" fill="none" stroke={HOOK_COFFEED} strokeWidth={1.6} markerEnd="url(#red-hook-y)" />
      <path d="M1060 468 C1120 340 990 262 829 257" fill="none" stroke={HOOK_COFFEED} strokeWidth={1.6} markerEnd="url(#red-hook-y)" />

      <line x1={220} y1={356} x2={598} y2={356} stroke={SCREENING} strokeWidth={2.5} />
      <line x1={412} y1={143} x2={455} y2={106} stroke={LINE} strokeWidth={1.5} markerEnd="url(#red-arr)" />
      <line x1={412} y1={199} x2={470} y2={106} stroke={LINE} strokeWidth={1.5} markerEnd="url(#red-arr)" />
      <line x1={412} y1={255} x2={485} y2={106} stroke={LINE} strokeWidth={1.5} markerEnd="url(#red-arr)" />
      <line x1={905} y1={102} x2={950} y2={128} stroke={LINE} strokeWidth={1.5} markerEnd="url(#red-arr)" />
      <line x1={310} y1={466} x2={310} y2={282} stroke={LINE} strokeWidth={1.5} markerEnd="url(#red-arr)" />
      <line x1={720} y1={326} x2={720} y2={284} stroke={LINE} strokeWidth={1.5} markerEnd="url(#red-arr)" />
      <line x1={720} y1={386} x2={720} y2={466} stroke={LINE} strokeWidth={1.5} markerEnd="url(#red-arr)" />

      <text x={340} y={380} fontSize={14} fontWeight={500} fill={INK}>Screening</text>
      <text x={734} y={310} fontSize={14} fontWeight={500} fill={INK}>Posting</text>
      <text x={734} y={420} fontSize={14} fontWeight={500} fill={INK}>Manage<tspan x={734} dy="1.2em">Default/Plus</tspan></text>

      <Box x={405} y={50} w={210} h={52} kind="bi" title="Kaffetal Regal" sub="catálogo: Specialty + Black" />
      <Box x={760} y={50} w={200} h={52} kind="bi" title="Cherry Picked" sub="Green · Roast · X" />
      <Box x={880} y={130} w={200} h={46} kind="cap" title="Co-Create" sub="form → CRM en BCP" />
      <Box x={210} y={120} w={200} h={46} kind="cap" title="Varietales" sub="form → CRM en ECP" />
      <Box x={210} y={176} w={200} h={46} kind="cap" title="CTC Tech" sub="form → CRM en ECP" />
      <Box x={210} y={232} w={200} h={46} kind="cap" title="Terratalento" sub="form → CRM en ECP" />
      <Box x={615} y={230} w={210} h={52} kind="dif" title="Coffeed" sub="home propia · solo difusión" />
      <Box x={600} y={328} w={240} h={56} kind="hub" title="CTC Control Panel" sub="landing pública + login maestro" />
      <Box x={210} y={470} w={200} h={52} kind="bi" title="Terratalento" sub="landing · login" />
      <Box x={615} y={470} w={210} h={52} kind="dif" title="Herramientas del Café" sub="home propia · solo difusión" />
      <Box x={960} y={470} w={200} h={52} kind="bi" title="Directorio del Café" sub="landing · login" />

      <Box x={60} y={640} w={200} h={46} kind="bi" title="Centro de Calidad" sub="solo login" />
      <Box x={290} y={640} w={200} h={46} kind="bi" title="Agente de Carga" sub="solo login" />
      <Box x={520} y={640} w={200} h={46} kind="bi" title="Nacionalización" sub="solo login" />
      <Box x={750} y={640} w={200} h={46} kind="bi" title="Master Roaster" sub="solo login" />
      <Box x={980} y={640} w={200} h={46} kind="bi" title="Estudio de Contenido" sub="solo login" />

      <line x1={60} y1={708} x2={88} y2={708} stroke={HOOK_TOOLS} strokeWidth={1.6} />
      <text x={96} y={712} fontSize={12} fill={MUTED}>monta el panel de Herramientas</text>
      <line x1={380} y1={708} x2={408} y2={708} stroke={HOOK_COFFEED} strokeWidth={1.6} />
      <text x={416} y={712} fontSize={12} fill={MUTED}>monta el muro Coffeed</text>
      <line x1={640} y1={708} x2={668} y2={708} stroke={SCREENING} strokeWidth={2.5} />
      <text x={676} y={712} fontSize={12} fill={MUTED}>screening del ECP</text>
    </svg>
  );
}

// ── Diagrama 2 · dentro del Control Panel ────────────────────────────────────
function Modulo({ x, y, label, dot }: { x: number; y: number; label: string; dot?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={300} height={30} rx={4} fill="#FFFFFF" stroke="#CFC9BF" strokeWidth={1} />
      {dot && <rect x={x + 12} y={y + 10} width={10} height={10} rx={2} fill={dot} />}
      <text x={x + 34} y={y + 20} fontSize={14} fill={INK}>{label}</text>
    </g>
  );
}

function Grupo({ x, y, h, label }: { x: number; y: number; h: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={324} height={h} rx={8} fill="none" stroke="#B9B3A9" strokeWidth={1} strokeDasharray="5 4" />
      <text x={x + 16} y={y + 18} fontSize={12} fill={MUTED}>{label}</text>
    </g>
  );
}

export function PanelDiagram() {
  return (
    <svg width="100%" viewBox="0 0 1200 890" role="img" aria-label="Contenidos del CTC Control Panel: las tres consolas internas y sus módulos" style={{ display: "block" }}>
      <defs>
        <marker id="pan-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      <Box x={370} y={16} w={460} h={52} kind="hub" title="CTC Home · ctcexport.com" sub="enrutador: puerta e índice de toda la red" />
      <line x1={600} y1={68} x2={600} y2={94} stroke={LINE} strokeWidth={1.5} markerEnd="url(#pan-arr)" />

      <rect x={430} y={98} width={340} height={72} rx={8} fill={FILL.hub} stroke={MORADO} strokeWidth={1.4} />
      <text x={600} y={122} textAnchor="middle" fontSize={14} fontWeight={500} fill={INK}>CTC Control Panel</text>
      <text x={600} y={140} textAnchor="middle" fontSize={12} fill={MUTED}>landing pública + login maestro</text>
      <text x={600} y={158} textAnchor="middle" fontSize={12} fill={MUTED}>la misma caja del diagrama de la red</text>

      <line x1={560} y1={170} x2={234} y2={200} stroke={LINE} strokeWidth={1.5} markerEnd="url(#pan-arr)" />
      <line x1={600} y1={170} x2={600} y2={200} stroke={LINE} strokeWidth={1.5} markerEnd="url(#pan-arr)" />
      <line x1={640} y1={170} x2={966} y2={200} stroke={LINE} strokeWidth={1.5} markerEnd="url(#pan-arr)" />

      <Box x={60} y={204} w={340} h={56} kind="hub" title="BCP · Base" sub="identidad y pasaporte del lote" />
      <Box x={430} y={204} w={340} h={56} kind="hub" title="OCP · Operación" sub="despacho, relevos, recepción" />
      <Box x={800} y={204} w={340} h={56} kind="hub" title="ECP · Dirección" sub="precios, primas, salud de la red" />

      <Grupo x={68} y={276} h={178} label="Comercial" />
      <Modulo x={80} y={304} label="Kaffetal Club" dot={AZUL} />
      <Modulo x={80} y={340} label="Catálogo Cherry Picked" dot={AZUL} />
      <Modulo x={80} y={376} label="Black Stock" dot={AZUL} />
      <Modulo x={80} y={412} label="CRM Co-Create" dot={AMBAR} />

      <Grupo x={68} y={468} h={142} label="Cadena del lote · lo que escribe Kaffetal Regal" />
      <Modulo x={80} y={496} label="Productores" />
      <Modulo x={80} y={532} label="Fincas" />
      <Modulo x={80} y={568} label="Lotes" />

      <Grupo x={68} y={624} h={142} label="Competencia · la Arena del Club" />
      <Modulo x={80} y={652} label="Nominados" />
      <Modulo x={80} y={688} label="Arena" />
      <Modulo x={80} y={724} label="Galardonados" />

      <Grupo x={438} y={276} h={106} label="Operación" />
      <Modulo x={450} y={304} label="Leads · Recepción" dot={AMBAR} />
      <Modulo x={450} y={340} label="Socios de la red" dot={AZUL} />
      <text x={600} y={424} textAnchor="middle" fontSize={12} fill={MUTED}>BCP + OCP = orquestación operacional</text>
      <text x={600} y={444} textAnchor="middle" fontSize={12} fill={MUTED}>el ECP dirige · el OCP ejecuta</text>

      <Grupo x={808} y={276} h={286} label="Dirección" />
      <Modulo x={820} y={304} label="Buzón de entrada" />
      <Modulo x={820} y={340} label="Directorio del Café" dot={AZUL} />
      <Modulo x={820} y={376} label="Coffeed" dot={GRIS} />
      <Modulo x={820} y={412} label="CRM CTC Tech" dot={AMBAR} />
      <Modulo x={820} y={448} label="CRM Varietales" dot={AMBAR} />
      <Modulo x={820} y={484} label="Herramientas del café" dot={GRIS} />
      <Modulo x={820} y={520} label="Terratalento" dot={AZUL} />

      <Grupo x={808} y={576} h={142} label="IT y Plataforma" />
      <Modulo x={820} y={604} label="Documentación del sistema" />
      <Modulo x={820} y={640} label="Mapa de Trabajo" />
      <Modulo x={820} y={676} label="Usuarios y credenciales" />

      <Grupo x={808} y={732} h={70} label="Espacio personal del owner" />
      <Modulo x={820} y={760} label="GVG-Space" />

      <text x={60} y={838} fontSize={12} fill={MUTED}>el cuadrito dice a qué bloque del diagrama de la red atiende cada módulo</text>
      <rect x={60} y={856} width={10} height={10} rx={2} fill={AZUL} />
      <text x={80} y={865} fontSize={12} fill={MUTED}>atiende una plataforma con login</text>
      <rect x={320} y={856} width={10} height={10} rx={2} fill={AMBAR} />
      <text x={340} y={865} fontSize={12} fill={MUTED}>recibe un formulario de captación</text>
      <rect x={590} y={856} width={10} height={10} rx={2} fill={GRIS} />
      <text x={610} y={865} fontSize={12} fill={MUTED}>administra un módulo compartido</text>
    </svg>
  );
}

export function EstructuraModal() {
  const [open, setOpen] = useState(false);
  const caption: React.CSSProperties = { fontSize: 12.5, color: "var(--muted, #6B6459)", margin: "2px 0 10px" };
  const heading: React.CSSProperties = { fontSize: 15, fontWeight: 600, margin: "0 0 2px" };
  return (
    <>
      <button className="btn btn-sm" type="button" onClick={() => setOpen(true)}>
        Estructura del sistema
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: "min(1180px, 96vw)" }} onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            <h3>Estructura del sistema</h3>
            <p style={caption}>
              Dos vistas de lo mismo. La caja «CTC Control Panel» aparece en las dos: es la bisagra.
            </p>

            <h4 style={heading}>1 · La red pública</h4>
            <p style={caption}>
              Quién tiene login propio (azul), quién solo capta un formulario (ámbar) y los dos módulos
              compartidos (gris) que el Control Panel alimenta: Coffeed por Posting y Herramientas por
              Default/Plus. Los socios entran por su propia landing.
            </p>
            <RedPublicaDiagram />

            <hr style={{ border: 0, borderTop: "1px solid var(--border, #E3DFD8)", margin: "26px 0 18px" }} />

            <h4 style={heading}>2 · Dentro del Control Panel</h4>
            <p style={caption}>
              El mismo login maestro abre tres consolas con sus módulos reales (espejo del menú). El
              cuadrito de color dice a qué bloque del diagrama de arriba atiende cada módulo; los que no
              lo tienen son de uso interno.
            </p>
            <PanelDiagram />
          </div>
        </div>
      )}
    </>
  );
}
