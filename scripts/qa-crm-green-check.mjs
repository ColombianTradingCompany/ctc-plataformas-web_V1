// Guardián del CRM CP Green — la regla de etapa y su anulado (D3.2).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-crm-green-check.mjs
//
// Nació el 2026-08-18 con el paso (iii)-2. La regla vive en un módulo PURO
// (`lib/crm/etapaComprador.ts`) precisamente para poder comprobarse aquí: el
// tablero está detrás del login maestro con 2FA y no se puede conducir en un
// navegador automatizado.
//
// LO QUE ESTE GUARDIÁN PROTEGE DE VERDAD no son los tres umbrales —esos se ven
// leyendo— sino la decisión de diseño que los rodea: **la etapa deducida NO se
// guarda**. En la base solo vive el anulado manual. Si alguien «optimiza» esto
// persistiendo la etapa calculada, el tablero mentirá en silencio en cuanto
// entre un pedido nuevo: la fila conservará la etapa vieja y nada fallará.

import { readFileSync } from "node:fs";
import {
  etapaPorPedidos,
  resuelveEtapa,
  esEtapaValida,
  ETAPAS_CRM,
} from "../src/lib/crm/etapaComprador.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond) => (cond ? ok++ : fallos.push(nombre));
const lee = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");

// ── 1. La regla, en sus tres tramos y en sus bordes ────────────────────────
check("0 pedidos → nuevo", etapaPorPedidos(0) === "nuevo");
check("1 pedido → activo", etapaPorPedidos(1) === "activo");
check("2 pedidos → recurrente", etapaPorPedidos(2) === "recurrente");
check("3 pedidos siguen siendo recurrente", etapaPorPedidos(3) === "recurrente");
check("50 pedidos siguen siendo recurrente", etapaPorPedidos(50) === "recurrente");
check("la escala no tiene huecos", ETAPAS_CRM.every((e) => esEtapaValida(e)));
check("una etapa inventada no cuela", !esEtapaValida("vip"));

// ── 2. El anulado manual ───────────────────────────────────────────────────
{
  const sinAnular = resuelveEtapa(0, null);
  check("sin anulado, manda la regla", sinAnular.etapa === "nuevo" && !sinAnular.anulada);

  const anulado = resuelveEtapa(0, "recurrente");
  check("con anulado, manda el anulado", anulado.etapa === "recurrente");
  check("y se marca como anulada", anulado.anulada === true);
  check("pero la sugerida sigue visible", anulado.sugerida === "nuevo");

  // El caso sutil: fijar a mano LO MISMO que dice la regla no es una excepción.
  // Si contara como anulada, el tablero se llenaría de avisos que no informan.
  const coincide = resuelveEtapa(1, "activo");
  check("fijar a mano lo mismo que la regla NO cuenta como anulada", coincide.anulada === false);
  check("y la etapa es la misma", coincide.etapa === "activo");

  // Basura en la columna: la regla gana en vez de romper el tablero.
  const basura = resuelveEtapa(2, "loquesea");
  check("un valor inválido en la columna no rompe: gana la regla", basura.etapa === "recurrente");
  check("y no se reporta como anulada", basura.anulada === false);
}

// ── 3. La decisión de diseño: la etapa deducida NO se persiste ─────────────
{
  const acciones = lee("src/app/ocp/(app)/crm/green/crmGreenActions.ts");
  const pagina = lee("src/app/ocp/(app)/crm/green/page.tsx");

  check(
    "la única escritura del módulo es sobre crm_stage",
    (acciones.match(/\.update\(/g) ?? []).length === 1 && acciones.includes("crm_stage")
  );
  check(
    "la acción acepta null para devolver el comprador a la regla",
    acciones.includes("etapa: string | null") && acciones.includes("etapa !== null")
  );
  check(
    "la página NO escribe la etapa deducida en la base",
    !pagina.includes(".update(") && !pagina.includes(".upsert(")
  );
  check(
    "la página resuelve la etapa al LEER, con el módulo puro",
    pagina.includes("resuelveEtapa(")
  );
  check(
    "la acción valida la etapa antes de guardarla",
    acciones.includes("esEtapaValida")
  );
  check(
    "y deja rastro en audit_log",
    acciones.includes("audit_log")
  );
}

if (fallos.length) {
  console.error(`✗ qa-crm-green: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-crm-green: ${ok} comprobaciones OK, 0 fallos`);
