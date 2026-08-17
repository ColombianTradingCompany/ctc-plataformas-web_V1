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
  // El moodboard de ECP · Direccionamiento guarda sus imágenes como data-URI
  // dentro de UN solo objeto `assets` (todas las unidades y piezas juntas), y
  // ese objeto viaja entero en cada guardado por Server Action. El tope por
  // defecto es 1 MB — que con tres o cuatro referencias JPEG a 1100 px ya se
  // pasa, y el fallo sería un guardado que revienta sin decir por qué. 8 MB da
  // aire de sobra sin abrir la puerta de par en par.
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  // El módulo ECP · Documentación lee docs/architecture/ del disco en tiempo de
  // ejecución. Next solo empaqueta lo que se IMPORTA, así que sin esto la carpeta
  // no existiría en el servidor de producción y el módulo saldría vacío.
  // Se declara solo para las dos rutas que la leen — no infla el resto.
  outputFileTracingIncludes: {
    "/ecp/documentacion": ["./docs/architecture/**"],
    "/ecp/documentacion/[file]": ["./docs/architecture/**"],
    // El botón «Descargar el transcriptor» del OCP arma el ZIP leyendo esta
    // carpeta del disco en tiempo de ejecución. Sin esta línea la carpeta no
    // existiría en el servidor y la descarga saldría vacía.
    "/api/transcripciones/descargar": ["./tools/transcriptor/**"],
    // NOTA histórica: las herramientas "internas" (leídas del disco y luego
    // embebidas) ya no existen — desde 2026-07-24 TODAS las herramientas viven
    // en public/tools/ y se sirven estáticas, así que no hay nada que trazar.
  },
};

export default nextConfig;
