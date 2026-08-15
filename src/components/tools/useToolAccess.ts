"use client";

import { useEffect, useState } from "react";
import { loadToolAccess } from "@/lib/tools/toolAccess";
import type { ToolPublico, ToolSurface } from "@/lib/tools/catalog";

// El registro de herramientas vive en la tabla `tools` (service-role-only), así
// que la superficie lo pide con una server action y recibe la lista ya filtrada
// para ESE usuario, con el `src` del iframe resuelto.
//
// (2026-08-15) ARRANCA VACÍO, y antes no. Mientras el reparto era una constante
// del código se podía sembrar el estado inicial con `DEFAULT_TOOLS_CONFIG` y no
// había parpadeo. Ahora la lista —y qué versión de cada herramienta está viva—
// solo la sabe la base, así que sembrar algo sería inventarlo: se mostraría una
// herramienta que quizá está archivada, o la versión que no es. Por eso hay
// `cargando`, y quien monta esto enseña un estado de carga en vez de una lista
// falsa que se corrige sola un instante después.
//
// El setState va encadenado a la promesa —nunca sincrónico en el cuerpo del
// efecto— por la regla react-hooks/set-state-in-effect (gotcha #3 del repo).

export type ToolAccessCliente = {
  tools: ToolPublico[];
  isPlus: boolean;
  lockedCount: number;
  cargando: boolean;
};

export function useToolAccess(surface: ToolSurface): ToolAccessCliente {
  const [access, setAccess] = useState<ToolAccessCliente>(() => ({
    tools: [],
    isPlus: false,
    lockedCount: 0,
    cargando: true,
  }));

  useEffect(() => {
    let alive = true;
    loadToolAccess(surface)
      .then((res) => {
        if (alive) setAccess({ ...res, cargando: false });
      })
      .catch(() => {
        // Un fallo de red deja la lista vacía, pero NO en estado de carga: una
        // pantalla que gira para siempre es peor que una que dice que no hay nada.
        if (alive) setAccess({ tools: [], isPlus: false, lockedCount: 0, cargando: false });
      });
    return () => {
      alive = false;
    };
  }, [surface]);

  return access;
}
