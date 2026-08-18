// Guardián del acceso a Herramientas del Café (paso (iv), V4.33).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-herramientas-acceso-check.mjs
//
// La regla vive en un módulo PURO (`lib/tools/accesoHerramienta.ts`) justamente
// para poder comprobarse aquí: la alternativa sería conducir KR y CP con
// cuentas de prueba en un navegador, que es lento y no cubre los casos raros.
//
// LO QUE PROTEGE, y por qué cada cosa importa:
//   · Que una herramienta Plus NO se abra sin permiso. Es la razón de existir
//     del nivel Plus; si se cuela, no falla nada — simplemente se regala.
//   · Que el COMODÍN heredado siga funcionando. Hay tres personas cuyo acceso
//     depende de él; si deja de leerse, lo pierden sin que nadie se entere.
//   · Que el veredicto diga POR QUÉ se abrió. `via: "permiso"` frente a
//     `via: "comodin-heredado"` es lo que permitirá saber a quién falta migrar
//     antes de retirar la tabla vieja.
//   · Que los rechazos sigan siendo TRES y distintos. Colapsarlos en un «no
//     puede» genérico deja a la persona sin saber qué hacer: entrar, registrarse
//     o solicitar son tres salidas diferentes.

import { readFileSync } from "node:fs";
import { esMiembroHC, puedeAbrir, MOTIVO_COPY } from "../src/lib/tools/accesoHerramienta.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

const base = {
  autenticado: true,
  esProductor: false,
  esComprador: false,
  permisosPorHerramienta: [],
  comodinPlusHeredado: false,
};
const productor = { ...base, esProductor: true };
const comprador = { ...base, esComprador: true };
const anonimo = { ...base, autenticado: false };

// ── 1. La membresía: productor O comprador ────────────────────────────────
check("un productor es miembro", esMiembroHC(productor));
check("un comprador es miembro", esMiembroHC(comprador));
check("una cuenta sin ninguna de las dos NO es miembro", !esMiembroHC(base));
check("y sin sesión tampoco", !esMiembroHC({ ...productor, autenticado: false }));

// ── 2. Las `default` se abren con ser miembro ─────────────────────────────
check("productor abre una default", puedeAbrir(productor, "agtron", "default").abre === true);
check("comprador abre una default", puedeAbrir(comprador, "agtron", "default").abre === true);
check("anónimo NO abre ni una default", puedeAbrir(anonimo, "agtron", "default").abre === false);
check(
  "y el motivo es que no tiene cuenta",
  puedeAbrir(anonimo, "agtron", "default").motivo === "sin-cuenta"
);
check(
  "una cuenta sin membresía recibe su propio motivo",
  puedeAbrir(base, "agtron", "default").motivo === "sin-membresia"
);

// ── 3. Las `plus` exigen permiso ──────────────────────────────────────────
check(
  "un productor SIN permiso no abre una plus",
  puedeAbrir(productor, "cogs-verde", "plus").abre === false
);
check(
  "y se le ofrece solicitarla",
  puedeAbrir(productor, "cogs-verde", "plus").motivo === "sin-permiso"
);
{
  const conPermiso = { ...productor, permisosPorHerramienta: ["cogs-verde"] };
  const v = puedeAbrir(conPermiso, "cogs-verde", "plus");
  check("con permiso propio, abre", v.abre === true);
  check("y el veredicto lo atribuye al permiso", v.via === "permiso");
  check(
    "el permiso es POR HERRAMIENTA, no un paquete",
    puedeAbrir(conPermiso, "otra-plus", "plus").abre === false
  );
}

// ── 4. El comodín heredado sigue abriendo, y se distingue ─────────────────
{
  const legado = { ...productor, comodinPlusHeredado: true };
  const v = puedeAbrir(legado, "cogs-verde", "plus");
  check("el comodín heredado abre una plus", v.abre === true);
  check("y el veredicto lo dice, para poder migrar a esa gente", v.via === "comodin-heredado");

  const ambos = { ...legado, permisosPorHerramienta: ["cogs-verde"] };
  check(
    "si tiene las dos cosas, gana el permiso propio (el camino nuevo)",
    puedeAbrir(ambos, "cogs-verde", "plus").via === "permiso"
  );
  check(
    "el comodín no salta la membresía",
    puedeAbrir({ ...base, comodinPlusHeredado: true }, "cogs-verde", "plus").abre === false
  );
}

// ── 5. Los tres rechazos siguen teniendo texto propio ─────────────────────
for (const motivo of ["sin-cuenta", "sin-membresia", "sin-permiso"]) {
  check(`el motivo «${motivo}» tiene su copy`, (MOTIVO_COPY[motivo] ?? "").length > 20);
}
check(
  "y los tres textos son distintos entre sí",
  new Set(Object.values(MOTIVO_COPY)).size === Object.keys(MOTIVO_COPY).length
);

// ── 6. La tabla vieja se sigue leyendo (no se retiró por accidente) ───────
{
  const grants = lee("src/lib/tools/toolGrants.ts");
  check("el contexto lee los permisos por herramienta", grants.includes("tool_user_grants"));
  check("y sigue leyendo el comodín heredado", grants.includes("tools_plus_grants"));
  check(
    "la caducidad se filtra en código, no con un .lt() que se comería los NULL",
    grants.includes("expires_at") && !grants.includes('.lt("expires_at"')
  );
  check("hay forma de saber quién depende del legado", grants.includes("quienDependeDelComodin"));
}

if (fallos.length) {
  console.error(`✗ qa-herramientas-acceso: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-herramientas-acceso: ${ok} comprobaciones OK, 0 fallos`);
