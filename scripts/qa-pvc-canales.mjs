// Guardián de la matriz comercial: canales × tramos de incoterm (V5.46).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-pvc-canales.mjs
//
// LO QUE PROTEGE. El motor calcula n2 (FCA ≈ FOB), n3 (CIP ≈ CIF) y n4 (DDP)
// para TODOS los grados y para cualquier destino de la tabla de parámetros. Sin
// la regla de arriba, nada impide que una superficie pinte un DDP a un país
// donde CTCx no tiene con quién entregarlo — y eso no es un número mal puesto,
// es una entrega prometida que la casa no puede sostener.
//
// Dos cosas son fáciles de romper sin que se note:
//   · el MAPEO tramo → columna de la pila (fob=n2, cif=n3, ddp=n4). Cambiarlo
//     por error cotiza FOB al precio de DDP, o al revés.
//   · que FOB sea el ÚNICO incondicional. Si alguien «simplifica» quitando la
//     habilitación, el catálogo promete lo que no puede cumplir.
//
// Además: el MOQ de Cherry Picked vive en DOS sitios (lectura.ts, que lo dice en
// cargas por la regla de la mezcla, y canales.ts, que lo dice para la matriz).
// Aquí se comprueba que no se separen.

import { readFileSync } from "node:fs";
import {
  CANALES, MOQ_CAAS_KG, MOQ_CHERRY_CARGAS, TRAMOS,
  canal, moqKgVerde, precioDeTramo, puedeCotizar, tramo,
} from "../src/lib/pvc/canales.ts";
import { moqCargas } from "../src/lib/pvc/lectura.ts";
import { PARAMS_V211, escalaDe, fleteKg } from "../src/lib/pvc/motor.ts";

const raiz = new URL("../", import.meta.url);
const lee = (r) => readFileSync(new URL(r, raiz), "utf8");

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));

// ── 1 · los tres tramos y su mapeo a la pila ──────────────────────────────
check("hay exactamente tres tramos", TRAMOS.length === 3);
check("FOB sale de n2 (FCA Bogotá)", tramo("fob").campo === "n2");
check("CIF sale de n3 (CIP aeropuerto)", tramo("cif").campo === "n3");
check("DDP sale de n4", tramo("ddp").campo === "n4");
check("el nivel de FOB es FCA", tramo("fob").nivel === "FCA");
check("el nivel de CIF es CIP", tramo("cif").nivel === "CIP");
check("el nivel de DDP es DDP", tramo("ddp").nivel === "DDP");

const filaDemo = { n2: 14.43, n3: 19.11, n4: 20.66 };
check("precioDeTramo(fob) devuelve n2", precioDeTramo(filaDemo, "fob") === 14.43);
check("precioDeTramo(cif) devuelve n3", precioDeTramo(filaDemo, "cif") === 19.11);
check("precioDeTramo(ddp) devuelve n4", precioDeTramo(filaDemo, "ddp") === 20.66);
check("los tres tramos suben de precio en orden", filaDemo.n2 < filaDemo.n3 && filaDemo.n3 < filaDemo.n4);

// ── 2 · FOB es la base: sin destino y sin habilitación ────────────────────
check("FOB no depende del destino", tramo("fob").dependeDelDestino === false);
check("CIF sí depende del destino", tramo("cif").dependeDelDestino === true);
check("DDP sí depende del destino", tramo("ddp").dependeDelDestino === true);
check("FOB no exige habilitación", tramo("fob").exigeHabilitacion === false);
check("CIF exige habilitación", tramo("cif").exigeHabilitacion === true);
check("DDP exige habilitación", tramo("ddp").exigeHabilitacion === true);
check("FOB es el ÚNICO incondicional", TRAMOS.filter((t) => !t.exigeHabilitacion).length === 1);

// ── 3 · la puerta ─────────────────────────────────────────────────────────
for (const c of ["cherry-picked", "caas"]) {
  check(`${c}: FOB se cotiza siempre`, puedeCotizar(c, "fob", false).puede === true);
  check(`${c}: CIF NO se cotiza sin habilitación`, puedeCotizar(c, "cif", false).puede === false);
  check(`${c}: DDP NO se cotiza sin habilitación`, puedeCotizar(c, "ddp", false).puede === false);
  check(`${c}: CIF se cotiza CON habilitación`, puedeCotizar(c, "cif", true).puede === true);
  check(`${c}: DDP se cotiza CON habilitación`, puedeCotizar(c, "ddp", true).puede === true);
}
const negado = puedeCotizar("cherry-picked", "ddp", false);
check("el motivo nombra al Master Roaster", !negado.puede && /Master Roaster/.test(negado.motivo));
const negadoCaas = puedeCotizar("caas", "cif", false);
check("el motivo de CaaS nombra el Operation Enablement", !negadoCaas.puede && /Operation Enablement/.test(negadoCaas.motivo));

// ── 4 · los dos canales y sus habilitaciones distintas ────────────────────
check("hay dos canales", CANALES.length === 2);
check("Cherry Picked mide su MOQ en cargas", canal("cherry-picked").unidadMoq === "cargas");
check("CaaS mide su MOQ en kilos", canal("caas").unidadMoq === "kg");
check("las dos habilitaciones son distintas", canal("cherry-picked").habilitacion !== canal("caas").habilitacion);

// ── 5 · los MOQ de la lámina del owner ────────────────────────────────────
check("CP Black son 3 o 4 cargas", JSON.stringify(MOQ_CHERRY_CARGAS.Black) === JSON.stringify([3, 4]));
check("CP Red igual que Black", JSON.stringify(MOQ_CHERRY_CARGAS.Red) === JSON.stringify(MOQ_CHERRY_CARGAS.Black));
check("CP Blue son 2 cargas", JSON.stringify(MOQ_CHERRY_CARGAS.Blue) === JSON.stringify([2]));
check("CP Gold es 1 carga", JSON.stringify(MOQ_CHERRY_CARGAS.Gold) === JSON.stringify([1]));
check("CP Tyrian es media carga", JSON.stringify(MOQ_CHERRY_CARGAS.Tyrian) === JSON.stringify([0.5]));
check("CaaS Black son 1000 kg", MOQ_CAAS_KG.Black === 1000);
check("CaaS Red son 1000 kg", MOQ_CAAS_KG.Red === 1000);
check("CaaS Blue son 500 kg", MOQ_CAAS_KG.Blue === 500);
check("CaaS Gold son 100 kg", MOQ_CAAS_KG.Gold === 100);
check("CaaS Tyrian son 100 kg", MOQ_CAAS_KG.Tyrian === 100);
check("CaaS siempre pide más volumen que CP en Black", MOQ_CAAS_KG.Black > moqKgVerde("cherry-picked", "Black", 78).kg);

// ── 6 · los dos sitios que dicen el MOQ de Cherry Picked no se separan ────
// lectura.ts lo dice por la regla de la mezcla; canales.ts para la matriz.
check("Black: la mezcla de 3 y la de 4 son las dos opciones de la matriz",
  MOQ_CHERRY_CARGAS.Black.includes(moqCargas("Black", 3)) && MOQ_CHERRY_CARGAS.Black.includes(moqCargas("Black", 4)));
check("Blue coincide en los dos módulos", MOQ_CHERRY_CARGAS.Blue[0] === moqCargas("Blue"));
check("Gold coincide en los dos módulos", MOQ_CHERRY_CARGAS.Gold[0] === moqCargas("Gold"));

// ── 7 · «el precio base depende del MOQ» es literal ───────────────────────
// La pila calcula el flete con fleteKg(moq) sobre la tabla de escalas, así que
// el volumen del canal decide el escalón. Si esto deja de ser cierto, la frase
// de la lámina se vuelve decorativa.
const kgCpBlack = moqKgVerde("cherry-picked", "Black", 78).kg;
const kgCaasBlack = moqKgVerde("caas", "Black", 78).kg;
const fleteCp = fleteKg(PARAMS_V211, kgCpBlack);
const fleteCaas = fleteKg(PARAMS_V211, kgCaasBlack);
check("el flete de CaaS es MÁS BARATO que el de CP en Black", fleteCaas < fleteCp);
check("y la diferencia es material (más de 1 US$/kg)", fleteCp - fleteCaas > 1);
check("CaaS Black cae en el último escalón", escalaDe(PARAMS_V211, kgCaasBlack).includes("1000"));
check("el flete nunca sube al subir el volumen", (() => {
  let prev = Infinity;
  for (const kg of [10, 50, 150, 350, 600, 1200]) {
    const f = fleteKg(PARAMS_V211, kg);
    if (f > prev) return false;
    prev = f;
  }
  return true;
})());

// ── 8 · la doctrina está escrita y la pantalla la usa ─────────────────────
const plan = lee("docs/PVC_BCP_PLAN.md");
check("el plan tiene el §9.6", plan.includes("### 9.6"));
check("el plan nombra al Master Roaster", /Master Roaster/.test(plan));
check("el plan nombra el Regional Operation Enablement", /Regional Operation Enablement/.test(plan));
check("el plan dice que FOB no depende del destino", /no depende del destino/.test(plan));
check("el plan deja abierto el nombre del tercer tramo", /DDP\/\?\?\?|DAP/.test(plan));

const board = lee("src/components/panel/pvc/LecturaBoard.tsx");
for (const f of ["CANALES", "TRAMOS", "puedeCotizar", "precioDeTramo", "moqKgVerde", "fleteKg"]) {
  check(`LecturaBoard usa ${f}`, board.includes(f));
}

console.log(`qa-pvc-canales: ${ok} comprobaciones OK${fallos.length ? `, ${fallos.length} FALLOS: ${fallos.join(", ")}` : ""}`);
if (fallos.length) process.exit(1);
