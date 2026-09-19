"use client";

import { CONSOLES, CONSOLE_ORDER, consolaDelModulo } from "@/lib/panel/consoles";
import { useState } from "react";

// ── Estructura del sistema · dos diagramas que se complementan ───────────────
// 1. LA RED PÚBLICA — el board del owner (2026-08-03): las plataformas con
//    login, las superficies de captación, los dos módulos compartidos y el
//    Control Panel al centro haciendo Posting / Manage / Screening.
// 2. DENTRO DEL CONTROL PANEL — el árbol de las consolas con sus módulos REALES.
//    Desde la V5.60 SE GENERA de src/lib/panel/consoles.ts: si cambia el nav,
//    este dibujo cambia solo. Y en el diagrama 1, la consola que recibe cada
//    formulario se lee también del rail (`enConsola`).
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
const SCREENING = "#6B4FC9"; // la línea del screening (el match de Terratalento)

/** La sigla de la consola en cuyo rail vive un módulo — leída del rail, para que una mudanza no deje el rótulo atrás. */
const enConsola = (segmento: string) => {
  const k = consolaDelModulo(segmento);
  return k ? CONSOLES[k].code : "—";
};

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
      <Box x={880} y={130} w={200} h={46} kind="cap" title="CaaS" sub={`form → CRM en ${enConsola("crm/caas")}`} />
      <Box x={210} y={120} w={200} h={46} kind="cap" title="Varietales" sub={`form → CRM en ${enConsola("varietales")}`} />
      <Box x={210} y={176} w={200} h={46} kind="cap" title="CTC Tech" sub={`form → CRM en ${enConsola("ctc-tech")}`} />
      <Box x={210} y={232} w={200} h={46} kind="cap" title="Terratalento" sub={`form → lista en ${enConsola("terratalento")}`} />
      <Box x={615} y={230} w={210} h={52} kind="dif" title="Coffeed" sub="home propia · solo difusión" />
      <Box x={600} y={328} w={240} h={56} kind="hub" title="CTC Control Panel" sub="landing pública + login maestro" />
      <Box x={210} y={470} w={200} h={52} kind="bi" title="Terratalento" sub="landing · login" />
      <Box x={615} y={470} w={210} h={52} kind="dif" title="Herramientas del Café" sub="home propia · solo difusión" />
      <Box x={960} y={470} w={200} h={52} kind="bi" title="Directorio del Café" sub="landing · login" />

      <Box x={60} y={640} w={200} h={46} kind="bi" title="Centro de Calidad" sub="solo login" />
      <Box x={290} y={640} w={200} h={46} kind="bi" title="Agente de Carga" sub="solo login" />
      <Box x={520} y={640} w={200} h={46} kind="bi" title="Nacionalización" sub="solo login" />
      <Box x={750} y={640} w={200} h={46} kind="bi" title="Master Roaster" sub="solo login" />
      {/* El Estudio dejó de ser una puerta y pasó a ser un TALLER (2026-08-03):
          produce con varias apps y entrega a la cola del ECP. Los otros cuatro
          socios siguen siendo credencial + scaffold. */}
      <Box x={980} y={640} w={200} h={46} kind="bi" title="Estudio de Contenido" sub="taller · produce y entrega" />

      <line x1={60} y1={708} x2={88} y2={708} stroke={HOOK_TOOLS} strokeWidth={1.6} />
      <text x={96} y={712} fontSize={12} fill={MUTED}>monta el panel de Herramientas</text>
      <line x1={380} y1={708} x2={408} y2={708} stroke={HOOK_COFFEED} strokeWidth={1.6} />
      <text x={416} y={712} fontSize={12} fill={MUTED}>monta el muro Coffeed</text>
      <line x1={640} y1={708} x2={668} y2={708} stroke={SCREENING} strokeWidth={2.5} />
      <text x={676} y={712} fontSize={12} fill={MUTED}>screening del {enConsola("terratalento")}</text>
    </svg>
  );
}

// ── Diagrama 2 · dentro del Control Panel ────────────────────────────────────
// SE GENERA DEL RAIL (`CONSOLES`), no se dibuja a mano (V5.60). La versión anterior era un SVG con
// cada caja escrita a mano como «espejo del menú», y un espejo a mano no refleja: en septiembre de
// 2026 seguía pintando el reparto de ANTES de la V4.24 —el BCP con el catálogo y los lotes, tres
// consolas— después de cinco mudanzas y del nacimiento de la LCP. Ahora una consola, un grupo o un
// módulo nuevo aparecen aquí solos, en el orden del rail.
//
// Lo único que sigue escrito a mano es el CUADRITO de color —a qué bloque del diagrama de la red
// atiende cada módulo—, por SEGMENTO de ruta y no por consola, para que sobreviva a una mudanza.
const ATIENDE: Record<string, string> = {
  // una plataforma con login
  directorio: AZUL, terratalento: AZUL, arena: AZUL, club: AZUL, socios: AZUL, catalogo: AZUL, "ctc-selection": AZUL,
  productores: AZUL, fincas: AZUL, lotes: AZUL, fichas: AZUL, nominados: AZUL, galardonados: AZUL, "crm/green": AZUL,
  // un formulario de captación
  leads: AMBAR, "crm/caas": AMBAR, "crm/roast": AMBAR, "crm/x": AMBAR, "lista-espera": AMBAR, "ctc-tech": AMBAR, varietales: AMBAR,
  // un módulo compartido
  coffeed: GRIS, herramientas: GRIS,
};

const COL_W = 280;
const COL_GAP = 16;
const MOD_H = 30;
const MOD_GAP = 6;
const GRUPO_PAD_TOP = 28;
const GRUPO_PAD_BOTTOM = 12;
const GRUPO_GAP = 14;
const TOP_CONSOLAS = 204;

function ModuloRail({ x, y, label, dot }: { x: number; y: number; label: string; dot?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={COL_W - 24} height={MOD_H} rx={4} fill="#FFFFFF" stroke="#CFC9BF" strokeWidth={1} />
      {dot && <rect x={x + 10} y={y + 10} width={10} height={10} rx={2} fill={dot} />}
      <text x={x + 28} y={y + 20} fontSize={13} fill={INK}>{label.length > 32 ? label.slice(0, 31) + "…" : label}</text>
    </g>
  );
}

export function PanelDiagram() {
  const n = CONSOLE_ORDER.length;
  const ancho = n * COL_W + (n - 1) * COL_GAP;
  const x0 = (1200 - ancho) / 2;
  const colX = (i: number) => x0 + i * (COL_W + COL_GAP);

  // La altura de cada columna sale de su rail; la del lienzo, de la más alta.
  const columnas = CONSOLE_ORDER.map((k, i) => {
    let y = TOP_CONSOLAS + 56 + 16;
    const grupos = CONSOLES[k].nav.map((g) => {
      const h = GRUPO_PAD_TOP + g.links.length * (MOD_H + MOD_GAP) - MOD_GAP + GRUPO_PAD_BOTTOM;
      const caja = { y, h, label: g.label ?? "", links: g.links };
      y += h + GRUPO_GAP;
      return caja;
    });
    return { k, x: colX(i), grupos, fin: y };
  });
  const alto = Math.max(...columnas.map((c) => c.fin)) + 56;

  return (
    <svg width="100%" viewBox={`0 0 1200 ${alto}`} role="img" aria-label={`Contenidos del CTC Control Panel: las ${n} consolas internas y sus módulos`} style={{ display: "block" }}>
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

      {columnas.map((c) => (
        <line key={`l-${c.k}`} x1={600} y1={170} x2={c.x + COL_W / 2} y2={TOP_CONSOLAS - 4} stroke={LINE} strokeWidth={1.5} markerEnd="url(#pan-arr)" />
      ))}

      {columnas.map((c) => {
        const consola = CONSOLES[c.k];
        return (
          <g key={c.k}>
            <Box x={c.x} y={TOP_CONSOLAS} w={COL_W} h={56} kind="hub" title={`${consola.code} · ${consola.name}`} sub={consola.tagline.split(":")[0]} />
            <rect x={c.x} y={TOP_CONSOLAS} width={COL_W} height={4} rx={2} fill={consola.accent} />
            {c.grupos.map((g) => (
              <g key={`${c.k}-${g.label}-${g.y}`}>
                <rect x={c.x} y={g.y} width={COL_W} height={g.h} rx={8} fill="none" stroke="#B9B3A9" strokeWidth={1} strokeDasharray="5 4" />
                <text x={c.x + 12} y={g.y + 18} fontSize={12} fill={MUTED}>{g.label.replace(`${consola.code} · `, "")}</text>
                {g.links.map((l, j) => (
                  <ModuloRail
                    key={l.href}
                    x={c.x + 12}
                    y={g.y + GRUPO_PAD_TOP + j * (MOD_H + MOD_GAP)}
                    label={l.label}
                    dot={ATIENDE[l.href.split("/").slice(2).join("/")]}
                  />
                ))}
              </g>
            ))}
          </g>
        );
      })}

      <text x={x0} y={alto - 32} fontSize={12} fill={MUTED}>el cuadrito dice a qué bloque del diagrama de la red atiende cada módulo</text>
      <rect x={x0} y={alto - 20} width={10} height={10} rx={2} fill={AZUL} />
      <text x={x0 + 20} y={alto - 11} fontSize={12} fill={MUTED}>atiende una plataforma con login</text>
      <rect x={x0 + 260} y={alto - 20} width={10} height={10} rx={2} fill={AMBAR} />
      <text x={x0 + 280} y={alto - 11} fontSize={12} fill={MUTED}>recibe un formulario de captación</text>
      <rect x={x0 + 530} y={alto - 20} width={10} height={10} rx={2} fill={GRIS} />
      <text x={x0 + 550} y={alto - 11} fontSize={12} fill={MUTED}>administra un módulo compartido</text>
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
              El mismo login maestro abre las consolas con sus módulos reales. Este diagrama se genera del menú: no puede quedarse atrás. El
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
