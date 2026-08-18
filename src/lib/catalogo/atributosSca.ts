// ── Los diez atributos del formulario SCA ────────────────────────────────────
// Viven en su PROPIO archivo, sin `server-only`, y eso no es organización: es lo
// que permite que los use un componente de cliente.
//
// ⚠️ LA TRAMPA, APRENDIDA A GOLPES (2026-08-17). `lib/catalogo/sneakPeek.ts`
// empieza con `import "server-only"` porque lee la base con el cliente anónimo.
// Importar de ahí un TIPO es gratis —se borra al compilar— pero importar un
// VALOR (esta lista) arrastra el módulo entero al paquete del navegador, y con
// él `supabase/server` y `next/headers`. El resultado: la página entera en 500 y
// un error que `tsc --noEmit` NO ve, porque para TypeScript el import es válido.
// Lo cazó el servidor de desarrollo, no la compuerta.
//
// El ORDEN importa: es el que recorre la telaraña del «Análisis Intrínseco», en
// la tarjeta (`components/catalogo/RadarIntrinseco.tsx`) y en la ficha en PDF
// (`scripts/lib/analisis-intrinseco.mjs`). Cambiarlo redibuja las dos.

export const ATRIBUTOS_SCA = [
  "fragancia",
  "sabor",
  "residual",
  "acidez",
  "cuerpo",
  "balance",
  "uniformidad",
  "limpia",
  "dulzor",
  "catador",
] as const;

export type AtributoSCA = (typeof ATRIBUTOS_SCA)[number];
