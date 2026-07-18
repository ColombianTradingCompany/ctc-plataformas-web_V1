import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El módulo ECP · Documentación lee docs/architecture/ del disco en tiempo de
  // ejecución. Next solo empaqueta lo que se IMPORTA, así que sin esto la carpeta
  // no existiría en el servidor de producción y el módulo saldría vacío.
  // Se declara solo para las dos rutas que la leen — no infla el resto.
  outputFileTracingIncludes: {
    "/ecp/documentacion": ["./docs/architecture/**"],
    "/ecp/documentacion/[file]": ["./docs/architecture/**"],
    // Igual para las herramientas internas: viven fuera de public/ para que solo
    // se sirvan con sesión, así que hay que pedir explícitamente que se
    // empaqueten (Next solo incluye lo que se importa).
    "/ecp/herramientas/[tool]": ["./private-tools/**"],
  },
};

export default nextConfig;
