"use client";

import { useEffect, useState } from "react";
import { loadToolAccess } from "@/lib/tools/toolAccess";
import {
  DEFAULT_TOOLS_CONFIG,
  toolsForSurface,
  type ToolId,
  type ToolSurface,
} from "@/lib/tools/catalog";

// El reparto de herramientas vive en platform_settings (service-role-only), así
// que la superficie lo pide con una server action. Se ARRANCA con el reparto por
// defecto de esa superficie en vez de con una lista vacía: así no hay parpadeo
// (lo normal es que el usuario vea justo eso) y, si llega algo distinto, se
// corrige al instante.
//
// El setState va encadenado a la promesa —nunca sincrónico en el cuerpo del
// efecto— por la regla react-hooks/set-state-in-effect (gotcha #3 del repo).
export function useToolAccess(surface: ToolSurface): { ids: ToolId[]; isPlus: boolean; lockedCount: number } {
  const [access, setAccess] = useState(() => ({
    ids: toolsForSurface(DEFAULT_TOOLS_CONFIG, surface, false),
    isPlus: false,
    lockedCount: 0,
  }));

  useEffect(() => {
    let alive = true;
    loadToolAccess(surface)
      .then((res) => {
        if (alive) setAccess(res);
      })
      .catch(() => {
        // Sin configuración accesible se queda con el reparto por defecto:
        // una herramienta de cálculo nunca debe desaparecer por un fallo de red.
      });
    return () => {
      alive = false;
    };
  }, [surface]);

  return access;
}
