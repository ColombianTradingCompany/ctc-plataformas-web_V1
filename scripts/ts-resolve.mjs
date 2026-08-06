// Resolutor para los scripts de QA que corren el CÓDIGO REAL con
// `node --experimental-strip-types`.
//
// Node resuelve como Node: exige la extensión y no sabe nada del alias `@/`
// del tsconfig. Los módulos de src/ están escritos para el empaquetador, así
// que sin esto un script de QA solo podría importar archivos que no importen a
// nadie más — justo los que menos falta hace comprobar.
//
// Hace tres cosas, todas del lado de la resolución (no toca el código):
//   · `@/loquesea`            → <repo>/src/loquesea
//   · sin extensión           → prueba .ts, .tsx, /index.ts
//   · `server-only` / `client-only` → un módulo vacío; son centinelas del
//     empaquetador de Next, no dependencias instaladas.
//
// Uso: node --experimental-strip-types --import ./scripts/ts-resolve.mjs <script>

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const SRC = resolvePath(fileURLToPath(import.meta.url), "..", "..", "src");
const EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx"];
const SENTINELS = new Set(["server-only", "client-only"]);

const firstThatExists = (base) => EXTS.map((e) => base + e).find((p) => existsSync(p));

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (SENTINELS.has(specifier)) {
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    }

    if (specifier.startsWith("@/")) {
      const hit = existsSync(resolvePath(SRC, specifier.slice(2)))
        ? resolvePath(SRC, specifier.slice(2))
        : firstThatExists(resolvePath(SRC, specifier.slice(2)));
      if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
    }

    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
      if (!existsSync(base)) {
        const hit = firstThatExists(base);
        if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
      }
    }

    return nextResolve(specifier, context);
  },
});
