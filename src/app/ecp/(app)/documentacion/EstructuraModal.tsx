"use client";

import { useState } from "react";

// ── Estructura del sistema (V4) ──────────────────────────────────────────────
// El diagrama de la reestructura V4 aprobado por el owner en la sesión del
// 2026-07-31 (la versión CORREGIDA: CTC Home como enrutador, módulos internos
// por consola — Black Stock, CRMs, Coffeed en el ECP — y las tres clases de
// E/S). SVG autocontenido con la paleta corporativa; si la estructura de la
// red cambia, este dibujo se actualiza a mano igual que el mapa interactivo.

const INK = "#232323";
const MUTED = "#6B6459";

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

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#55504A" strokeWidth={1.5} markerEnd="url(#estr-arrow)" />;
}

export function EstructuraDiagram() {
  return (
    <svg width="100%" viewBox="0 0 680 770" role="img" aria-label="Diagrama de la estructura V4 de la red CTC" style={{ display: "block" }}>
              <defs>
                <marker id="estr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M2 1L8 5L2 9" fill="none" stroke="#55504A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              </defs>

              <Box x={40} y={40} w={600} h={50} kind="hub" title="CTC Home · ctcexport.com" sub="enrutador: puerta e índice de toda la red" titleY={61} subY={79} />
              <Arrow x1={340} y1={90} x2={340} y2={112} />
              <Box x={200} y={116} w={280} h={52} kind="hub" title="CTC Control Panel" sub="landing pública + login maestro" titleY={138} subY={156} />

              <rect x={34} y={186} width={410} height={92} rx={8} fill="none" stroke="#B9B3A9" strokeWidth={1} strokeDasharray="5 4" />
              <text x={239} y={268} textAnchor="middle" fontSize={11.5} fill={MUTED}>BCP + OCP = orquestación operacional</text>

              <Arrow x1={300} y1={168} x2={150} y2={198} />
              <Arrow x1={340} y1={168} x2={342} y2={198} />
              <Arrow x1={380} y1={168} x2={536} y2={198} />

              <Box x={44} y={198} w={180} h={50} kind="hub" title="BCP · Base" sub="el negocio núcleo" titleY={220} subY={237} />
              <Box x={252} y={198} w={180} h={50} kind="hub" title="OCP · Operación" sub="rama operativa real" titleY={220} subY={237} />
              <Box x={460} y={198} w={180} h={50} kind="hub" title="ECP · Dirección" sub="negocio estratégico" titleY={220} subY={237} />

              <Arrow x1={134} y1={278} x2={134} y2={288} />
              <Arrow x1={342} y1={278} x2={342} y2={288} />
              <Arrow x1={550} y1={248} x2={550} y2={288} />

              <Box x={44} y={292} w={180} h={40} kind="int" title="Black Stock" sub="compras Black · embudo KRA" titleY={309} subY={324} />
              <Box x={44} y={338} w={180} h={40} kind="int" title="CRM Co-Create" sub="form → kanban → Black Stock" titleY={355} subY={370} />
              <Box x={252} y={292} w={180} h={40} kind="int" title="Leads · general" sub="recepción de la red" titleY={309} subY={324} />
              <Box x={460} y={292} w={180} h={40} kind="int" title="Gestión de Coffeed" sub="pipeline editorial v2" titleY={309} subY={324} />
              <Box x={460} y={338} w={180} h={40} kind="int" title="CRM Tech · Varietales" sub="form → kanban · contexto" titleY={355} subY={370} />
              <Box x={460} y={384} w={180} h={40} kind="int" title="IT y Plataforma" sub="+ Back Office (después)" titleY={401} subY={416} />

              <Box x={44} y={386} w={180} h={46} kind="bi" title="Kaffetal Regal" sub="catálogo: Specialty + Black" titleY={407} subY={423} />
              <Box x={44} y={440} w={180} h={46} kind="bi" title="Cherry Picked" sub="Green · Roast · X" titleY={461} subY={477} />
              <Box x={44} y={494} w={180} h={46} kind="cap" title="Co-Create" sub="form → CRM en BCP" titleY={515} subY={531} />
              <text x={134} y={558} textAnchor="middle" fontSize={11.5} fill={MUTED}>
                ambas clases de café se ofrecen
                <tspan x={134} dy="1.35em">a los dos outlets</tspan>
              </text>

              <Box x={252} y={340} w={180} h={46} kind="bi" title="Centro de Calidad" sub="solo login" titleY={361} subY={377} />
              <Box x={252} y={394} w={180} h={46} kind="bi" title="Agente de Carga" sub="solo login" titleY={415} subY={431} />
              <Box x={252} y={448} w={180} h={46} kind="bi" title="Nacionalización" sub="solo login" titleY={469} subY={485} />
              <Box x={252} y={502} w={180} h={46} kind="bi" title="Master Roaster" sub="solo login" titleY={523} subY={539} />
              <Box x={252} y={556} w={180} h={46} kind="bi" title="Estudio de Contenido" sub="solo login" titleY={577} subY={593} />

              <Box x={460} y={432} w={180} h={46} kind="bi" title="Directorio del Café" sub="landing · login" titleY={453} subY={469} />
              <Box x={460} y={486} w={180} h={46} kind="bi" title="Herramientas del Café" sub="landing + reparto web" titleY={507} subY={523} />
              <Box x={460} y={540} w={180} h={46} kind="dif" title="Coffeed" sub="home propia · solo difusión" titleY={561} subY={577} />
              <Box x={460} y={594} w={180} h={46} kind="cap" title="CTC Tech" sub="form → CRM en ECP" titleY={615} subY={631} />
              <Box x={460} y={648} w={180} h={46} kind="cap" title="Varietales" sub="form → CRM en ECP" titleY={669} subY={685} />

              <rect x={44} y={708} width={10} height={10} rx={2} fill="#E7EFFB" stroke="#003087" />
              <text x={60} y={717} fontSize={11.5} fill={MUTED}>bidireccional (login propio)</text>
              <rect x={260} y={708} width={10} height={10} rx={2} fill="#FBF3DE" stroke="#A87A14" />
              <text x={276} y={717} fontSize={11.5} fill={MUTED}>solo captación (form → CRM)</text>
              <rect x={470} y={708} width={10} height={10} rx={2} fill="#F1F0EE" stroke="#6B6459" />
              <text x={486} y={717} fontSize={11.5} fill={MUTED}>solo difusión</text>
              <rect x={44} y={732} width={10} height={10} rx={2} fill="#FFFFFF" stroke="#B9B3A9" strokeDasharray="3 2" />
              <text x={60} y={741} fontSize={11.5} fill={MUTED}>módulo interno de consola</text>
              <text x={276} y={741} fontSize={11.5} fill={MUTED}>azules: una sola cuenta · navegación cruzada fácil</text>
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
              El board aprobado el 2026-07-31: CTC Home como enrutador, cada consola con su dominio y sus módulos
              internos, y los satélites codificados por su clase de datos. Construido completo (V2.28–V2.33).
            </p>
            <EstructuraDiagram />
          </div>
        </div>
      )}
    </>
  );
}
