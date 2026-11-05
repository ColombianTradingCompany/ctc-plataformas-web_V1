// ── CTCx OS · ¿se puede abrir la demostración? (V6.19, F2) · PURO ─────────────
// La demostración (`/os/demo`, datos inventados) sirve SOLO para las capturas de revisión de identidad
// (PLAN §7.8), en local. Se abre con `OS_DEMO=1` y nunca en producción; en Vercel no se define
// `OS_DEMO` (decisión del owner), así que allí la ruta es un 404 aunque alguien la conozca.

export function demoPermitido(): boolean {
  return process.env.OS_DEMO === "1" && process.env.VERCEL_ENV !== "production";
}
