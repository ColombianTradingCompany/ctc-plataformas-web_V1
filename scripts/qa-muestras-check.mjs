// Guardián de GESTIÓN DE MUESTRAS (V5.80, 1.ª tanda · V5.88, 2.ª tanda del brief `docs/componentes/briefs/consolas-gestion-de-muestras.md`).
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
import { particionDeMuestra, saldoDe, salidaValida, kgDelPedido, trillaDelKilo, KILO_CTCX, MOTIVO_LABEL, TIPO_LABEL, PEDIDO_STATUS_LABEL } from "../src/lib/muestras/particion.ts";
import { DIAS_REVISION_ALMACENAJE, KG_REVISION_ALMACENAJE, revisionDeAlmacenaje } from "../src/lib/muestras/almacenaje.ts";
import { CONSOLES } from "../src/lib/panel/consoles.ts";
import { TIPOS_DE_TAREA, consolasDeLaTarea } from "../src/lib/panel/tareas.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const raiz = new URL("../", import.meta.url);

const migracion = lee("docs/migraciones/2026-09-24_solicitudes_muestras_baches.sql");
const recibo = lee("src/lib/muestras/recibo.ts");
const acciones = lee("src/app/ocp/(app)/muestrasActions.ts");
const particion = lee("src/lib/muestras/particion.ts");
// V5.89: los tipos y motivos viven ahora en el CHECK más reciente (el acta de las bodegas los reescribió).
const acta89 = lee("docs/migraciones/2026-09-25_bodegas_muestras.sql");

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
  const tipos = acta89.match(/add constraint muestras_tipo_check check \(tipo in \(([^)]+)\)\)/)?.[1].replace(/'/g, "").split(", ") ?? [];
  check("los tipos de la base (CHECK vigente, V5.89) son los de TIPO_LABEL", JSON.stringify(tipos) === JSON.stringify(Object.keys(TIPO_LABEL)), tipos.join(","));
  const motivos = acta89.match(/add constraint muestra_movimientos_motivo_check check \(motivo in \(([^)]+)\)\)/)?.[1].replace(/'/g, "").split(", ") ?? [];
  check("los motivos de salida de la base (CHECK vigente, V5.89) son los de MOTIVO_LABEL", JSON.stringify(motivos) === JSON.stringify(Object.keys(MOTIVO_LABEL)), motivos.join(","));
  check("cada movimiento pertenece a una muestra", migracion.includes("muestra_id uuid not null references public.muestras(id) on delete cascade"));
  check("las dos tablas tienen RLS y cero políticas (solo service role)", (migracion.match(/enable row level security/g) ?? []).length === 2 && !/create policy/.test(migracion));
}

// ── (4) La alerta de los 90 días se DERIVA (2.ª tanda, V5.88): de la fecha de la evaluación, sin campo aparte ──
// La regla del owner está escrita en ALINEACION §3 (2026-09-16): «llamado a más de 90 días de la catación: no se recata, se hace
// revisión de almacenaje con 1 kg». Las cifras se leen de AHÍ, no del módulo.
{
  const alineacion = lee("docs/ALINEACION.md");
  const regla = alineacion.match(/llamado a más de (\d+) días de la catación: \*\*no se recata\*\*, se hace \*\*revisión de almacenaje con (\d+) kg\*\*/);
  check("la regla del owner (ALINEACION §3, 2026-09-16) fija 90 días y 1 kg", !!regla && DIAS_REVISION_ALMACENAJE === Number(regla[1]) && KG_REVISION_ALMACENAJE === Number(regla[2]));
  check("el kilo es la porción de testeo del folio 7 (no un peso inventado)", KG_REVISION_ALMACENAJE === particionDeMuestra(2).find((p) => p.tipo === "testeo").kg);
  const acta88 = lee("docs/migraciones/2026-09-25_muestras_pedidos_envio.sql");
  // (el DDL, no sus comentarios: el acta explica la alerta con esa palabra)
  check("la base no tiene un campo de alerta ni de revisión programada", !/alerta|revision_at|dias_90|revisar_en/.test(migracion) && !/revision_at|proxima_revision|alerta/.test(acta88.replace(/^--.*$/gm, "")));
  const HOY = new Date("2026-10-01T00:00:00Z");
  const hace = (d) => new Date(HOY.getTime() - d * 86_400_000).toISOString();
  check("sin evaluación que rija no hay reloj", !revisionDeAlmacenaje({ evaluadaAt: null, ultimaRevisionAt: null }, HOY).debida);
  check("a los 89 días de la catación: nada", !revisionDeAlmacenaje({ evaluadaAt: hace(89), ultimaRevisionAt: null }, HOY).debida);
  check("a los 90: toca revisar", revisionDeAlmacenaje({ evaluadaAt: hace(90), ultimaRevisionAt: null }, HOY).debida);
  check("una revisión anotada reinicia el reloj", !revisionDeAlmacenaje({ evaluadaAt: hace(200), ultimaRevisionAt: hace(10) }, HOY).debida);
  check("y a los 90 de esa revisión vuelve a tocar", revisionDeAlmacenaje({ evaluadaAt: hace(200), ultimaRevisionAt: hace(90) }, HOY).debida);
  const almacenaje = lee("src/lib/muestras/almacenaje.ts").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  check("almacenaje.ts es puro y lee el kilo de particion.ts", !/supabase|server-only/.test(almacenaje) && almacenaje.includes('from "./particion"'));
  const carga = lee("src/lib/muestras/almacenajeCarga.ts");
  check("la carga deriva de la evaluación que rige y del último movimiento revision_almacenaje", carga.includes('.eq("rige_grado", true)') && carga.includes('m.motivo === "revision_almacenaje"') && carga.includes("revisionDeAlmacenaje({ evaluadaAt, ultimaRevisionAt }, ahora)"));
  check("un lote con el último contrato cerrado ya no se revisa", /CONTRATO_CERRADO = new Set\(\["completed", "cancelled", "ruptura"\]\)/.test(carga));
  const tareas = lee("src/lib/panel/tareasCarga.ts");
  check("el Tablero de Ejecución la enseña como tarea derivada `muestra` (dueña OCP)", TIPOS_DE_TAREA.includes("muestra") && consolasDeLaTarea("muestra:x:2026-10-01").includes("ocp") && tareas.includes("revisionesDeAlmacenaje(service)") && tareas.includes("key: r.claveDeTarea"));
  check("la clave de la tarea lleva el ciclo, para que una casilla vieja no tape la siguiente", carga.includes("claveDeTarea: `muestra:${lot.id}:${(ultimaRevisionAt ?? evaluadaAt).slice(0, 10)}`"));
  check("anotar la revisión es una salida de la muestra de testeo, con resultado, que cabe en el saldo", acciones.includes('motivo: "revision_almacenaje"') && acciones.includes("if (!resultado) return") && acciones.includes("salidaValida(conSaldo.saldo, usa)") && acciones.includes('.eq("tipo", "testeo")'));
  check("y la página tiene la pestaña de almacenaje con la regla a la vista", lee("src/app/ocp/(app)/muestras/page.tsx").includes("DIAS_REVISION_ALMACENAJE") && lee("src/app/ocp/(app)/muestras/page.tsx").includes("anotarRevisionDeAlmacenaje.bind"));
}

// ── (5) Las acciones, en la lista blanca con su clase ───────────────────────
{
  const plan = lee("docs/BCP_USER_ADMIN_PLAN.md");
  const blanca = plan.slice(plan.indexOf("**La lista blanca de borradores**"), plan.indexOf("**Lo que parece un borrador"));
  for (const fn of ["ubicarMuestra", "anotarSalidaDeMuestra", "anotarRevisionDeAlmacenaje", "agregarMuestraAlPedido", "crearBodega", "guardarBodega", "trillarMuestraCtcx"]) {
    const i = acciones.indexOf(`export async function ${fn}(`);
    const cuerpo = i < 0 ? "" : acciones.slice(i, acciones.indexOf("\nexport async function ", i + 1) < 0 ? undefined : acciones.indexOf("\nexport async function ", i + 1));
    check(`${fn} es borrador en el código (cuaderno interno)`, cuerpo.includes('permisoDeEscritura("ocp", "borrador")'));
    check(`y está en la lista blanca del plan`, blanca.includes(`\`${fn}\``));
  }
  check("el recibo es emite (el productor lo ve)", lee("src/app/ocp/(app)/solicitudesActions.ts").includes('permisoDeEscritura("ocp", "emite")'));
  {
    const i = acciones.indexOf("export async function marcarPedidoEnviado(");
    check("marcar un pedido enviado es emite (el comprador ve cambiar su pedido)", i > 0 && acciones.slice(i).includes('permisoDeEscritura("ocp", "emite")'));
  }
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

// ── 7. Las muestras para comprador (2.ª tanda, V5.88): el pedido se arma con salidas y sale con guía ──
{
  const acta = lee("docs/migraciones/2026-09-25_muestras_pedidos_envio.sql");
  check("el pedido de pack gana «preparado» y «enviado», y lo que CTC escribe al despachar", acta.includes("add value if not exists 'preparado'") && acta.includes("add value if not exists 'enviado'") && ["preparado_at", "enviado_at", "enviado_por", "guia", "notas_ctc"].every((c) => acta.includes(c)));
  check("cada salida a un comprador se liga a su pedido (a quién se mandó, del mismo cuaderno que el saldo)", acta.includes("add column pedido_id uuid references public.sample_pack_orders(id)") && acciones.includes('motivo: "a_comprador"') && acciones.includes("pedido_id: pedidoId"));
  check("los estados del módulo son los de la base", JSON.stringify(Object.keys(PEDIDO_STATUS_LABEL)) === JSON.stringify(["ordered", "preparado", "enviado"]));
  check("lo que va en el pedido se deriva de sus salidas", kgDelPedido([{ kg: 0.125 }, { kg: "0.125" }]) === 0.25);
  check("añadir al pedido respeta el saldo y no admite un pedido ya enviado", acciones.includes("salidaValida(saldo, kg)") && acciones.includes('pedido.status === "enviado"'));
  check("marcar enviado exige al menos una muestra en el pedido", acciones.includes("if (!count) return"));
  const pagina = lee("src/app/ocp/(app)/muestras/page.tsx");
  check("la pestaña de pedidos arma y despacha", pagina.includes("agregarMuestraAlPedido.bind") && pagina.includes("marcarPedidoEnviado.bind") && pagina.includes("kgDelPedido("));
  check("la tienda sigue sin tocar lo que CTC escribe (solo inserta el pedido)", !/preparado|enviado_at|guia/.test(lee("src/components/cherry-picked/CherryPickedExperience.tsx")));
}

// ── 8. Las bodegas y el kilo CTCx (V5.89, owner 2026-09-25: diagrama en reference/muestras-y-sample-kits-2026-09-25) ──
{
  check("la tabla de bodegas: responsable, dirección, capacidad en muestras de 1 kg, estado; RLS y cero políticas", ["responsable text", "direccion text", "capacidad_muestras integer", "estado text not null default 'activa' check (estado in ('activa', 'pendiente', 'inactiva'))"].every((c) => acta89.includes(c)) && acta89.includes("alter table public.bodegas_muestras enable row level security") && !/create policy/.test(acta89));
  check("las cuatro sedes del owner", ["CTCx Planta de Empaque Santillana", "CTCx Oficina CCB", "CIR Bucaramanga", "Manuel Specialty Roasters"].every((n) => acta89.includes(`('${n}'`)) && /Santillana', 'GVB', '[^']+', 400, 'activa'/.test(acta89) && /Oficina CCB', 'GVB', '[^']+', 100, 'activa'/.test(acta89) && /CIR Bucaramanga', null, '[^']+', null, 'pendiente'/.test(acta89));
  check("la ocupación no se guarda (se deriva de las muestras con saldo)", !/ocupacion|ocupadas/.test(acta89.replace(/^--.*$/gm, "")));
  check("la muestra apunta a su bodega y el recibo la lleva", acta89.includes("add column bodega_id uuid references public.bodegas_muestras(id)") && recibo.includes("bodega_id: r.bodegaId") && lee("src/app/ocp/(app)/solicitudesActions.ts").includes('bodegaId: String(formData.get("bodega_id")') && lee("src/app/ocp/(app)/nominados/NominadosClient.tsx").includes('fd.set("bodega_id", bodegaId)'));
  // El kilo CTCx: 1 kg CPS → ~750 g verde = 250 g al vacío + 500 g a tostar → 400 g tostado (los números del diagrama).
  const t = trillaDelKilo(1);
  check("el kilo CTCx: 1 kg CPS → 750 g de verde", t.verdeKg === 0.75 && KILO_CTCX.rendimientoTrilla === 0.75);
  check("250 g de verde al vacío y 500 g a tostar", t.verdeVacioKg === 0.25 && t.aTostarKg === 0.5);
  check("400 g de tostado (merma del 20 %)", t.tostadoKg === 0.4 && KILO_CTCX.mermaTostion === 0.2);
  check("con menos de un kilo el vacío es lo que cabe y el resto se tuesta", trillaDelKilo(0.2).verdeVacioKg === 0.15 && trillaDelKilo(0.2).aTostarKg === 0);
  check("los tipos nuevos nacen del kilo (origen_muestra_id) y la salida es trilla_verde", acta89.includes("add column origen_muestra_id uuid references public.muestras(id)") && acciones.includes('motivo: "trilla_verde"') && acciones.includes('tipo: "verde_vacio"') && acciones.includes('tipo: "tostado_ensayo"') && acciones.includes("origen_muestra_id: muestraId"));
  check("trillar es solo del kilo CTCx, sale todo el saldo y lo derivado no puede pesar más que el kilo", acciones.includes('muestra.tipo !== "testeo"') && acciones.includes("kg: saldo,") && acciones.includes("verdeVacioKg + tostadoKg > saldo"));
  const pagina = lee("src/app/ocp/(app)/muestras/page.tsx");
  check("la página tiene la pestaña de bodegas con ocupación derivada y el trillado del kilo", pagina.includes("crearBodega") && pagina.includes("guardarBodega") && pagina.includes("trillarMuestraCtcx.bind") && pagina.includes("capacidad_muestras"));
  check("los dos kilos son de uso exclusivo de CTCx (el copy lo dice)", /uso exclusivo de CTCx/i.test(pagina));
}

if (fallos.length) {
  console.error(`✗ qa-muestras: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-muestras: ${ok} comprobaciones OK, 0 fallos`);
