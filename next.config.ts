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
  // ⚠️ EL TOPE VOLVIÓ A SU SITIO EN V4.32, y conviene saber por qué estuvo alto.
  // El moodboard de Direccionamiento guardaba sus imágenes como data-URI dentro
  // de UN solo objeto `assets` que viajaba entero en cada guardado por Server
  // Action, así que el tope de 1 MB por defecto se quedaba corto y el fallo era
  // un guardado que reventaba sin decir por qué. Se subió a 8 MB por eso.
  //
  // El rework de F7 retiró el moodboard —nunca llegó a guardar una sola imagen:
  // la fila `assets` pesaba 28 bytes— así que ya no hay nada que mande megas
  // por una Server Action. Se vuelve al DEFECTO de Next (1 MB) simplemente no
  // declarándolo: un tope alto que ningún caso necesita es superficie de más.
  //
  // Si algún módulo futuro vuelve a necesitar subir binarios, el camino no es
  // volver a levantar esto: es Storage, que para eso está.
  // El módulo ECP · Documentación lee docs/architecture/ del disco en tiempo de
  // ejecución. Next solo empaqueta lo que se IMPORTA, así que sin esto la carpeta
  // no existiría en el servidor de producción y el módulo saldría vacío.
  // Se declara solo para las dos rutas que la leen — no infla el resto.
  outputFileTracingIncludes: {
    // ⚠️ ESTAS CLAVES SON RUTAS, y se mudaron con el módulo: Documentación pasó
    // del ECP al BCP el 2026-08-18 (PR-B del paso (ii), V4.25). Si se quedan
    // apuntando a la ruta vieja, `docs/architecture/**` no se traza dentro de la
    // función y el módulo sale VACÍO en producción — sin error, sin aviso, y sin
    // reproducirse en local, donde el disco entero está ahí.
    "/bcp/documentacion": ["./docs/architecture/**"],
    "/bcp/documentacion/[file]": ["./docs/architecture/**"],
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
