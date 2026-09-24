// Guardián de GESTIÓN DE MUESTRAS (V5.80, 1.ª tanda del brief `docs/componentes/briefs/consolas-gestion-de-muestras.md`).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-muestras-check.mjs
//
// GRATIS y sin red: ejercita el módulo puro y lee las fuentes.
//
// QUÉ VIGILA — los cinco puntos que el brief le encargó a este guardián, tal como los escribió:
//   (1) el saldo es derivado y nunca negativo;
//   (2) la acción de recibo escribe la marca Y la fila, o ninguna;
//   (3) toda muestra pertenece a un lote;
//   (4) la alerta de los 90 días sale de la fecha de la evaluación, no de un campo aparte;
//   (5) las acciones están en la lista blanca con su clase.
// Más lo que el folio 7 fijó después (la partición) y la regla de la casa: solo UNA puerta escribe la marca que lee
// el circuito (`lots.sample_2kg_confirmed_at`).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { particionDeMuestra, saldoDe, salidaValida, MOTIVO_LABEL, TIPO_LABEL } from "../src/lib/muestras/particion.ts";
import { CONSOLES } from "../src/lib/panel/consoles.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const raiz = new URL("../", import.meta.url);

const migracion = lee("docs/migraciones/2026-09-24_solicitudes_muestras_baches.sql");
const recibo = lee("src/lib/muestras/recibo.ts");
const acciones = lee("src/app/ocp/(app)/muestrasActions.ts");
const particion = lee("src/lib/muestras/particion.ts");

// ── (1) El saldo es derivado y nunca negativo ───────────────────────────────
{
  check("la base NO guarda un saldo", !/saldo/.test(migracion));
  const suma = (kg) => particionDeMuestra(kg).reduce((s, p) => s + p.kg, 0);
  for (const kg of [2, 1.2, 0.4, 2.35, 0.5]) check(`la partición de ${kg} kg suma lo recibido`, Math.abs(suma(kg) - kg) < 1e-9, `${suma(kg)}`);
  check("con menos de 2 kg el testeo es el que se encoge", JSON.stringify(particionDeMuestra(1.2)) === JSON.stringify([{ tipo: "evaluacion", kg: 0.5 }, { tipo: "contramuestra", kg: 0.5 }, { tipo: "testeo", kg: 0.2 }]));
  check("con 400 g solo hay evaluación (no hay porciones de 0 g)", JSON.stringify(particionDeMuestra(0.4)) === JSON.stringify([{ tipo: "evaluacion", kg: 0.4 }]));
  check("con cero no hay muestra", particionDeMuestra(0).length === 0 && particionDeMuestra(-1).length === 0);
  check("saldo = recibido − Σ salidas", saldoDe(0.5, [{ kg: 0.2 }, { kg: "0.1" }]) === 0.2);
  check("una salida que cabe vale", salidaValida(0.3, 0.3) && salidaValida(0.5, 0.2));
  check("una salida mayor que el saldo NO vale, ni una de cero, ni una negativa", !salidaValida(0.3, 0.31) && !salidaValida(0.3, 0) && !salidaValida(0.3, -1));
  check("anotar una salida pasa por salidaValida", acciones.includes("salidaValida(saldo, kg)"));
  const codigo = particion.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  check("particion.ts es puro (no importa nada)", !/^\s*import\s/m.test(codigo));
  check("la página deriva el saldo al pintarlo", lee("src/app/ocp/(app)/muestras/page.tsx").includes("saldoDe("));
}

// ── (2) El recibo escribe la marca Y la fila, o ninguna ─────────────────────
{
  const filas = recibo.indexOf('from("muestras")');
  const marca = recibo.indexOf("update({ sample_2kg_confirmed_at: now })");
  check("el recibo inserta las filas antes de poner la marca", filas > 0 && marca > filas);
  check("si la marca falla, deshace las filas", recibo.includes('from("muestras").delete()'));
  check("si las filas fallan, no pone la marca", /if \(e1 \|\| !filas\) return \{ ok: false/.test(recibo));
  check("y avanza la solicitud a la fila cuando pago y muestra están", recibo.includes("avanzarAFilaSiCompleta(service, r.lotId)"));
  check("con rastro y nota al productor", recibo.includes('action: "sample_received"') && recibo.includes('from("producer_comm_log")'));
  // Solo UNA puerta escribe la marca que lee el circuito.
  const escritores = [];
  const camina = (dir) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) camina(p);
      else if (/\.(ts|tsx)$/.test(n) && /(update|insert)\(\{[^}]*sample_2kg_confirmed_at/.test(readFileSync(p, "utf8"))) escritores.push(p.replace(/\\/g, "/").split("/src/")[1]);
    }
  };
  camina(new URL("../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  check("solo recibo.ts escribe `sample_2kg_confirmed_at`", escritores.length === 1 && escritores[0] === "lib/muestras/recibo.ts", escritores.join(", "));
  check("las dos puertas del OCP pasan por él", lee("src/app/ocp/(app)/actions.ts").includes("recibirMuestra(service, { lotId, adminId })") && lee("src/app/ocp/(app)/solicitudesActions.ts").includes("recibirMuestra(service, {"));
  check("la puerta vieja de Nominados se retiró", !lee("src/app/ocp/(app)/nominadosActions.ts").includes("confirmSampleReceivedNom"));
}

// ── (3) Toda muestra pertenece a un lote ────────────────────────────────────
{
  check("lot_id es NOT NULL con FK a lots", migracion.includes("lot_id uuid not null references public.lots(id) on delete cascade"));
  check("los kilos son positivos", migracion.includes("kg numeric(8,3) not null check (kg > 0)"));
  const tipos = migracion.match(/tipo text not null check \(tipo in \(([^)]+)\)\)/)?.[1].replace(/'/g, "").split(", ") ?? [];
  check("los tipos de la base son los de TIPO_LABEL", JSON.stringify(tipos) === JSON.stringify(Object.keys(TIPO_LABEL)), tipos.join(","));
  const motivos = migracion.match(/motivo text not null check \(motivo in \(([^)]+)\)\)/)?.[1].replace(/'/g, "").split(", ") ?? [];
  check("los motivos de salida de la base son los de MOTIVO_LABEL", JSON.stringify(motivos) === JSON.stringify(Object.keys(MOTIVO_LABEL)), motivos.join(","));
  check("cada movimiento pertenece a una muestra", migracion.includes("muestra_id uuid not null references public.muestras(id) on delete cascade"));
  check("las dos tablas tienen RLS y cero políticas (solo service role)", (migracion.match(/enable row level security/g) ?? []).length === 2 && !/create policy/.test(migracion));
}

// ── (4) La alerta de los 90 días se DERIVA (segunda tanda): sin campo aparte ──
{
  check("la base no tiene un campo de alerta ni de revisión programada", !/alerta|revision_at|dias_90|revisar_en/.test(migracion));
  check("la página lo declara como segunda tanda derivada", /90 días como tarea derivada/.test(lee("src/app/ocp/(app)/muestras/page.tsx")));
}

// ── (5) Las acciones, en la lista blanca con su clase ───────────────────────
{
  const plan = lee("docs/BCP_USER_ADMIN_PLAN.md");
  const blanca = plan.slice(plan.indexOf("**La lista blanca de borradores**"), plan.indexOf("**Lo que parece un borrador"));
  for (const fn of ["ubicarMuestra", "anotarSalidaDeMuestra"]) {
    const i = acciones.indexOf(`export async function ${fn}(`);
    const cuerpo = i < 0 ? "" : acciones.slice(i, acciones.indexOf("\nexport async function ", i + 1) < 0 ? undefined : acciones.indexOf("\nexport async function ", i + 1));
    check(`${fn} es borrador en el código (cuaderno interno)`, cuerpo.includes('permisoDeEscritura("ocp", "borrador")'));
    check(`y está en la lista blanca del plan`, blanca.includes(`\`${fn}\``));
  }
  check("el recibo es emite (el productor lo ve)", lee("src/app/ocp/(app)/solicitudesActions.ts").includes('permisoDeEscritura("ocp", "emite")'));
  check("anotar una salida deja rastro", acciones.includes('entity_type: "muestra"') && acciones.includes('action: "salida"'));
}

// ── 6. El módulo existe y está en el rail ───────────────────────────────────
{
  const pagina = lee("src/app/ocp/(app)/muestras/page.tsx");
  check("la página ya no dice que el módulo no existe", !pagina.includes("Este módulo todavía no existe"));
  check("y enseña los pedidos de muestra de los compradores", pagina.includes('from("sample_pack_orders")'));
  const stock = CONSOLES.ocp.nav.find((g) => g.label === "OCP · Manejo de Stock Físico");
  check("el rail sigue teniendo Gestión de Muestras en Stock Físico", !!stock?.links.some((l) => l.href === "/ocp/muestras" && l.label === "Gestión de Muestras"));
  check("enviar un bache al Centro anota la salida de la muestra de evaluación", /motivo: "a_centro"/.test(lee("src/app/ocp/(app)/nominadosActions.ts")));
}

if (fallos.length) {
  console.error(`✗ qa-muestras: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-muestras: ${ok} comprobaciones OK, 0 fallos`);
