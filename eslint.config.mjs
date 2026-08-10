import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // ── Módulo vendorizado ────────────────────────────────────────────────────
  // `DefinicionDeContexto.jsx` (ECP · Direccionamiento) llega tal cual del autor
  // y se mantiene VERBATIM para poder resincronizarlo cuando lo actualice; todo
  // el cableado con la plataforma vive fuera, en DireccionamientoClient.tsx.
  // Sus dos `setState` dentro de un efecto (reiniciar la pieza al cambiar de
  // unidad, y la insignia de "Guardando…") son intencionados y sin consecuencia
  // aquí — pero son ERROR con la regla nueva de react-hooks, así que se apaga
  // solo para este archivo. Los avisos se dejan a la vista.
  {
    files: ["src/components/panel/direccionamiento/DefinicionDeContexto.jsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
]);

export default eslintConfig;
