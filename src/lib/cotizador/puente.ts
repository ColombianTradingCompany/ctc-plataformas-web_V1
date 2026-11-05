// ── El puente con las calculadoras embebidas · leer una global de la app (2026-11-05) ──────────────────────────────────
// `AppFrame.tsx` lee de las dos apps del owner (Mermas V15, CoGS V19) su estado. Hasta hoy lo hacía con `win[nombre]`, y eso
// solo ve lo que es PROPIEDAD de `window`: una `function` o un `var` de primer nivel. Un `let`/`const` de primer nivel vive en
// el ámbito léxico global del iframe y `window` no lo ve — comprobado en Chromium: en Mermas `typeof window.state` es
// «undefined» y `eval("typeof state")` es «object».
//
// Módulo PURO y sin DOM propio (recibe la ventana): lo prueba `qa-cotizador-puente-check` y lo ejercitó un navegador contra
// las dos apps. Se evalúa EN el reino del iframe —es del mismo origen— y SOLO con un identificador escrito en el código que
// llama: nunca con texto que venga de la app ni de la base (de ahí la expresión regular, que no admite nada más).

/** Una global de la app por su nombre, esté en `window` o en el ámbito léxico global del iframe; `undefined` si no existe. */
export function globalDeLaApp(win: Window, nombre: string): unknown {
  // Autocontenida a propósito (sin constantes del módulo): así un navegador puede ejercitar ESTA función, no una copia.
  if (!/^[A-Za-z_$][\w$]*$/.test(nombre)) return undefined;
  const w = win as unknown as Record<string, unknown> & { eval?: (codigo: string) => unknown };
  if (nombre in w) return w[nombre];
  try {
    return w.eval?.(`typeof ${nombre} === "undefined" ? undefined : ${nombre}`);
  } catch {
    return undefined;
  }
}
