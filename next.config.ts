import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El SHA del commit desplegado, visible en la insignia de versión de cada
  // superficie (src/lib/version.ts). Vercel define VERCEL_GIT_COMMIT_SHA en el
  // build; se copia al espacio NEXT_PUBLIC_ para que también lo vean los
  // componentes de cliente. `env` se incrusta en tiempo de build — no se lee en
  // caliente, que es justo lo que se quiere: identifica ESE build.
  env: {
    NEXT_PUBLIC_BUILD_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || "dev",
  },
  // El módulo ECP · Documentación lee docs/architecture/ del disco en tiempo de
  // ejecución. Next solo empaqueta lo que se IMPORTA, así que sin esto la carpeta
  // no existiría en el servidor de producción y el módulo saldría vacío.
  // Se declara solo para las dos rutas que la leen — no infla el resto.
  outputFileTracingIncludes: {
    "/ecp/documentacion": ["./docs/architecture/**"],
    "/ecp/documentacion/[file]": ["./docs/architecture/**"],
    // NOTA histórica: las herramientas "internas" (leídas del disco y luego
    // embebidas) ya no existen — desde 2026-07-24 TODAS las herramientas viven
    // en public/tools/ y se sirven estáticas, así que no hay nada que trazar.
  },
};

export default nextConfig;
