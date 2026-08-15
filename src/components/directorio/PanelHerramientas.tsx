"use client";

import { useEffect, useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { SolicitarPlus } from "@/components/tools/SolicitarPlus";
import { loadToolAccess, type ToolAccess } from "@/lib/tools/toolAccess";

// ── Herramientas del Café · pestaña del Directorio (2026-08-02) ─────────────
// El mismo kit embebido de KR/Cherry Picked, con el reparto `dc` de la tabla
// de Disponibilidad. El nivel Plus se solicita aquí mismo (audiencia "dc") y
// lo decide el ECP en su sub-tablero.

export function PanelHerramientas({ activo }: { activo: boolean }) {
  const [access, setAccess] = useState<ToolAccess | null>(null);

  useEffect(() => {
    if (!activo || access) return;
    let vivo = true;
    loadToolAccess("dc").then((a) => vivo && setAccess(a));
    return () => {
      vivo = false;
    };
  }, [activo, access]);

  return (
    <section className={`panel${activo ? " activo" : ""}`} role="tabpanel" aria-label="Herramientas del Café">
      <div className="panel__titulo con-cinta">
        <div>
          <p className="eyebrow">Herramientas del Café</p>
          <h2>Las calculadoras y utilidades del oficio</h2>
        </div>
        <p>El mismo kit de trabajo de la red CTC — mermas, la rueda del sabor, el disco Agtron y más. Gratis y sin instalación.</p>
      </div>
      {!access ? (
        <p style={{ color: "var(--gris, #6b6459)", fontSize: 14 }}>Cargando las herramientas…</p>
      ) : access.tools.length === 0 && access.lockedCount === 0 ? (
        <p style={{ color: "var(--gris, #6b6459)", fontSize: 14 }}>
          CTC todavía no habilitó herramientas para el Directorio — pronto.
        </p>
      ) : (
        <>
          <ToolPanel
            tools={access.tools.map((t) => ({ id: t.id, name: t.nombre, desc: t.descripcion, src: t.src, lang: t.lang }))}
            labels={{
              openInTab: "Abrir en pestaña nueva ↗",
              choose: "Elige una herramienta para abrirla aquí.",
              groupAria: "Herramientas disponibles",
              framePrefix: "Herramienta",
            }}
          />
          {access.lockedCount > 0 && (
            <p style={{ color: "var(--gris, #6b6459)", fontSize: 13.5, marginTop: 12 }}>
              Hay {access.lockedCount} herramienta{access.lockedCount === 1 ? "" : "s"} más reservada
              {access.lockedCount === 1 ? "" : "s"} para <b>Herramientas Plus</b>.
            </p>
          )}
          {!access.isPlus && <SolicitarPlus audiencia="dc" accent="var(--tinta, #a3241b)" />}
        </>
      )}
    </section>
  );
}
