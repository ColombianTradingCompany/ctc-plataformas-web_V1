// Where "Directorio del Café" lives, from any other surface. Kept as its own
// tiny module (instead of importing directorio/data.ts, which carries the full
// DANE municipality table) so Kaffetal Regal / Cherry Picked bundles don't pay
// for it. NODE_ENV is compile-time constant on server and client — no
// hydration mismatch (same pattern as QuickNav's HOME_HREF / FAMILY_LINKS).
export const DIRECTORIO_HREF =
  process.env.NODE_ENV === "development" ? "/directorio" : "https://directoriodelcafe.ctcexport.com";
