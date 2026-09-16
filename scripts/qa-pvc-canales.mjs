// Guardián de programas × incoterm × región (V5.47; reemplaza la matriz de V5.46).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-pvc-canales.mjs
//
// LO QUE PROTEGE — decisión del CEO del 2026-09-16 (docs/PVC_BCP_PLAN.md §12.1–§12.4):
//
//   · CHERRY PICKED SOLO SE ENTREGA DDP. Es consolidado a través del master
//     roaster; no tiene FOB ni puerto. Es la regla más fácil de «corregir» por
//     simetría con CaaS — y la de V5.46 ya se equivocó exactamente así.
//   · CaaS tiene tres tramos: FOB Colombia, puerto de destino y DDP.
//   · Las dos habilitaciones NO son intercambiables: master roaster abre Cherry
//     Picked; regional enablement abre el puerto y el DDP de CaaS.
//   · FOB está siempre disponible, en cualquier parte del mundo.
//   · La escalera de acceso del comprador, en su orden.
//
// Y el mapeo tramo → columna de la pila: invertirlo cotiza FOB al precio de DDP
// sin que nada chille.

import { readFileSync } from "node:fs";
import {
  HABILITACIONES, PROGRAMAS, TRAMOS, accesoDelComprador, habilitacionRequerida,
  precioDeTramo, programa, puedeCotizar, tramo,
} from "../src/lib/pvc/canales.ts";

const raiz = new URL("../", import.meta.url);
const lee = (r) => readFileSync(new URL(r, raiz), "utf8");

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));

const TODO = { masterRoaster: true, regionalEnablement: true };
const NADA = { masterRoaster: false, regionalEnablement: false };
const SOLO_MR = { masterRoaster: true, regionalEnablement: false };
const SOLO_RE = { masterRoaster: false, regionalEnablement: true };

// ── 1 · los tramos y su columna de la pila ────────────────────────────────
check("hay tres tramos", TRAMOS.length === 3);
check("los tramos son FOB, puerto de destino y DDP", JSON.stringify(TRAMOS.map((t) => t.id)) === JSON.stringify(["fob", "puerto", "ddp"]));
check("ya no existe un tramo «cif»", !TRAMOS.some((t) => t.id === "cif"));
check("FOB sale de n2", tramo("fob").campo === "n2");
check("puerto sale de n3 (aproximación aérea, anotada)", tramo("puerto").campo === "n3");
check("DDP sale de n4", tramo("ddp").campo === "n4");
check("FOB no depende del destino", tramo("fob").dependeDelDestino === false);
const f = { n2: 14.43, n3: 19.11, n4: 20.66 };
check("precioDeTramo(fob) = n2", precioDeTramo(f, "fob") === 14.43);
check("precioDeTramo(puerto) = n3", precioDeTramo(f, "puerto") === 19.11);
check("precioDeTramo(ddp) = n4", precioDeTramo(f, "ddp") === 20.66);

// ── 2 · Cherry Picked: solo DDP ───────────────────────────────────────────
check("Cherry Picked solo tiene DDP", JSON.stringify(programa("cherry-picked").tramos) === JSON.stringify(["ddp"]));
check("Cherry Picked es consolidado", /onsolidado/.test(programa("cherry-picked").envio));
check("CP FOB NO se cotiza ni con todo habilitado", puedeCotizar("cherry-picked", "fob", TODO).puede === false);
check("CP puerto NO se cotiza ni con todo habilitado", puedeCotizar("cherry-picked", "puerto", TODO).puede === false);
const cpFob = puedeCotizar("cherry-picked", "fob", TODO);
check("el motivo dice que un envío propio es CaaS", !cpFob.puede && /CaaS/.test(cpFob.motivo));
check("CP DDP con master roaster SÍ", puedeCotizar("cherry-picked", "ddp", SOLO_MR).puede === true);
check("CP DDP sin master roaster NO", puedeCotizar("cherry-picked", "ddp", SOLO_RE).puede === false);

// ── 3 · CaaS: FOB siempre, puerto y DDP con regional enablement ───────────
check("CaaS tiene los tres tramos", JSON.stringify(programa("caas").tramos) === JSON.stringify(["fob", "puerto", "ddp"]));
check("CaaS es dedicado", /edicado/.test(programa("caas").envio));
check("CaaS FOB SIN ninguna habilitación", puedeCotizar("caas", "fob", NADA).puede === true);
check("CaaS puerto con regional enablement SÍ", puedeCotizar("caas", "puerto", SOLO_RE).puede === true);
check("CaaS DDP con regional enablement SÍ", puedeCotizar("caas", "ddp", SOLO_RE).puede === true);
check("CaaS puerto sin regional enablement NO", puedeCotizar("caas", "puerto", SOLO_MR).puede === false);
check("CaaS DDP sin regional enablement NO", puedeCotizar("caas", "ddp", SOLO_MR).puede === false);

// ── 4 · las habilitaciones no son intercambiables ─────────────────────────
check("CP exige master roaster", habilitacionRequerida("cherry-picked", "ddp") === "master-roaster");
check("CaaS puerto exige regional enablement", habilitacionRequerida("caas", "puerto") === "regional-enablement");
check("CaaS DDP exige regional enablement", habilitacionRequerida("caas", "ddp") === "regional-enablement");
check("CaaS FOB no exige nada", habilitacionRequerida("caas", "fob") === null);
check("el master roaster NO abre el DDP de CaaS", puedeCotizar("caas", "ddp", SOLO_MR).puede === false);
check("el regional enablement NO abre Cherry Picked", puedeCotizar("cherry-picked", "ddp", SOLO_RE).puede === false);
check("regional enablement es un operador logístico contratado", /operador log/i.test(HABILITACIONES["regional-enablement"].queEs));
check("el master roaster es un cliente tipo partner", /partner/i.test(HABILITACIONES["master-roaster"].queEs));

// ── 5 · FOB está siempre disponible: nadie queda fuera ────────────────────
for (const [nombre, r] of [["todo", TODO], ["nada", NADA], ["solo MR", SOLO_MR], ["solo RE", SOLO_RE]]) {
  const opciones = accesoDelComprador(r);
  check(`región «${nombre}»: siempre hay al menos una opción`, opciones.length >= 1);
  check(`región «${nombre}»: CaaS FOB siempre está`, opciones.some((o) => o.programa === "caas" && o.tramos.includes("fob")));
}

// ── 6 · la escalera de acceso del comprador ───────────────────────────────
const conMR = accesoDelComprador(TODO);
check("con master roaster, Cherry Picked va primero", conMR[0].programa === "cherry-picked");
check("con master roaster, Cherry Picked es el preferido", conMR[0].preferida === true);
check("con master roaster, CaaS es segunda opción", conMR[1]?.programa === "caas" && conMR[1].preferida === false);
check("la nota de CaaS dice volumen o periodicidad", /volumen|periodicidad/i.test(conMR[1]?.nota ?? ""));
const soloRE = accesoDelComprador(SOLO_RE);
check("solo regional enablement: no hay Cherry Picked", !soloRE.some((o) => o.programa === "cherry-picked"));
check("solo regional enablement: CaaS con puerto y DDP", soloRE[0].tramos.includes("puerto") && soloRE[0].tramos.includes("ddp"));
const nada = accesoDelComprador(NADA);
check("sin habilitación: solo CaaS FOB", nada.length === 1 && JSON.stringify(nada[0].tramos) === JSON.stringify(["fob"]));
check("sin habilitación: la nota dice que el comprador asume la logística", /log[ií]stica/.test(nada[0].nota));

// ── 7 · la doctrina y la pantalla ─────────────────────────────────────────
check("hay dos programas", PROGRAMAS.length === 2);
const plan = lee("docs/PVC_BCP_PLAN.md");
check("el plan tiene el §12", plan.includes("## 12. Correcciones del CEO"));
check("el plan dice que Cherry Picked solo es DDP", /Cherry Picked\*{0,2}\s+\*{0,2}solo (se entrega )?DDP/i.test(plan));
check("el §9.6 viejo está marcado como superado", /9\.6[\s\S]{0,400}SUPERAD/.test(plan));
const board = lee("src/components/panel/pvc/LecturaBoard.tsx");
for (const fn of ["accesoDelComprador", "habilitacionRequerida", "precioDeTramo", "TRAMOS"]) {
  check(`LecturaBoard usa ${fn}`, board.includes(fn));
}
check("la pantalla ya no importa la matriz de V5.46", !/moqKgVerde|CANALES\b/.test(board));

console.log(`qa-pvc-canales: ${ok} comprobaciones OK${fallos.length ? `, ${fallos.length} FALLOS: ${fallos.join(", ")}` : ""}`);
if (fallos.length) process.exit(1);
