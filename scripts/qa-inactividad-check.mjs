// QA de la inactividad de las cuentas «Marchitando» (V5.103, owner 2026-09-30): la regla pura contra el código real
// (via --experimental-strip-types) y los hilos que la conectan al cron, al OCP y a la única rutina de borrado.
// Correr con: node --experimental-strip-types --no-warnings --import ./scripts/ts-resolve.mjs scripts/qa-inactividad-check.mjs

import { readFileSync } from "node:fs";
import { decidirPasoDeInactividad, proximoPaso, DIAS_ENTRE_PASOS, DIA_MS } from "../src/lib/inactividad/reglas.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

// ── 1. La regla pura: recordatorio → (30 días) aviso → (30 días) borrado; nunca a protegidas, de prueba ni de CTCx ──
const NOW = Date.parse("2026-10-05T12:00:00Z");
const hace = (dias) => new Date(NOW - dias * DIA_MS).toISOString();
const base = { segmento: "marchitando", tieneFincas: false, tieneLotes: false, protegida: false, esPrueba: false, laLlevaCtcx: false, recordatorioAt: null, avisoAt: null };
check("un mes entre pasos", DIAS_ENTRE_PASOS === 30);
check("marchitando sin nada → recordatorio", decidirPasoDeInactividad(base, NOW) === "recordatorio");
check("con recordatorio de hace 10 días → nada", decidirPasoDeInactividad({ ...base, recordatorioAt: hace(10) }, NOW) === "nada");
check("con recordatorio de hace 30 días → aviso", decidirPasoDeInactividad({ ...base, recordatorioAt: hace(30) }, NOW) === "aviso");
check("con aviso de hace 20 días → nada", decidirPasoDeInactividad({ ...base, recordatorioAt: hace(50), avisoAt: hace(20) }, NOW) === "nada");
check("con aviso de hace 30 días → borrado", decidirPasoDeInactividad({ ...base, recordatorioAt: hace(60), avisoAt: hace(30) }, NOW) === "borrado");
check("protegida: nunca (ni con aviso vencido)", decidirPasoDeInactividad({ ...base, protegida: true, recordatorioAt: hace(60), avisoAt: hace(30) }, NOW) === "reinicio");
check("cuenta de prueba: nunca", decidirPasoDeInactividad({ ...base, esPrueba: true }, NOW) === "nada");
check("la lleva CTCx (desacoplado): nunca", decidirPasoDeInactividad({ ...base, laLlevaCtcx: true }, NOW) === "nada");
check("con finca → nada (y reinicia si tenía sellos)", decidirPasoDeInactividad({ ...base, tieneFincas: true }, NOW) === "nada" && decidirPasoDeInactividad({ ...base, tieneFincas: true, recordatorioAt: hace(40) }, NOW) === "reinicio");
check("con lote → nada aunque siga Marchitando", decidirPasoDeInactividad({ ...base, tieneLotes: true }, NOW) === "nada");
check("primíparo / nuevo / establecido / activo → nada", ["primiparos", "nuevos", "establecidos", "activos"].every((s) => decidirPasoDeInactividad({ ...base, segmento: s }, NOW) === "nada"));
const prox = proximoPaso({ ...base, recordatorioAt: hace(10) });
check("el OCP sabe el próximo paso y su fecha", prox?.paso === "aviso" && Math.round((prox.en.getTime() - (NOW - 10 * DIA_MS)) / DIA_MS) === 30);
check("protegida no tiene próximo paso", proximoPaso({ ...base, protegida: true }) === null);

// ── 2. El barrido: los mismos hechos que /ocp/kr, sello solo si el correo salió, la única rutina de borrado ──
{
  const barrido = lee("src/lib/inactividad/barrido.ts");
  check("decide con la regla pura y segmenta como /ocp/kr", barrido.includes("decidirPasoDeInactividad(hechos") && barrido.includes("segmentProducer(") && barrido.includes("infoGeneralComplete("));
  check("salta protegidas, de prueba y las de CTCx por los hechos", barrido.includes("protegida: !!e?.protegida") && barrido.includes("esPrueba: esCorreoDePrueba(p.email)") && barrido.includes("laLlevaCtcx: !!perfil?.gestion"));
  check("el correo sale por el remitente único y el sello se escribe SOLO si salió", barrido.includes("sendTransactionalEmail(p.correo") && barrido.includes("if (!envio.ok) {") && barrido.indexOf("if (!envio.ok) {") < barrido.indexOf("recordatorio_at: ahora.toISOString()"));
  check("cada paso deja rastro en audit_log y el correo queda en el feed del productor", barrido.includes('"inactividad_recordatorio_enviado"') && barrido.includes('"inactividad_aviso_enviado"') && barrido.includes('"cuenta_borrada_por_inactividad"') && barrido.includes('from("producer_comm_log").insert'));
  check("el borrado es la rutina compartida", barrido.includes("borrarCuentaDeProductor(service, p.id)"));
  const borrar = lee("src/lib/inactividad/borrarCuenta.ts");
  check("la rutina vuelve a comprobar cero fincas, cero lotes y no protegida con datos frescos", borrar.includes('(fincas ?? 0) > 0 || (lotes ?? 0) > 0') && borrar.includes("estado?.protegida"));
  check("limpia lo que no cae en cascada (comm_log, comm_ack, media_assets) y conserva audit_log sin autor", borrar.includes('from("producer_comm_log").delete()') && borrar.includes('from("producer_comm_ack").delete()') && borrar.includes('from("media_assets").delete()') && borrar.includes('from("audit_log").update({ performed_by: null })') && borrar.includes("auth.admin.deleteUser(profileId)"));
}

// ── 3. El cron semanal corre TRES barridos; el OCP protege y borra con clase emite ──
{
  const cron = lee("src/app/api/cron/recordatorios/route.ts");
  check("el cron corre el barrido de inactividad junto a los otros dos", cron.includes("correrBarridoDeInactividad(service)") && (cron.match(/await correr/g) ?? []).length === 3);
  const acciones = lee("src/app/ocp/(app)/kr/inactividadActions.ts");
  check("protegerCuenta y borrarCuentaInactiva son emite y dejan rastro", (acciones.match(/permisoDeEscritura\("ocp", "emite"\)/g) ?? []).length === 2 && acciones.includes('"cuenta_protegida"') && acciones.includes('"cuenta_borrada_por_owner"') && acciones.includes("borrarCuentaDeProductor(service, producerId)"));
  const panel = lee("src/app/ocp/(app)/kr/InactividadPanel.tsx");
  check("el botón del OCP borra con la frase escrita «Borrar Cuenta» y solo si es borrable", panel.includes('const FRASE = "Borrar Cuenta"') && panel.includes("disabled={!coincide || pending}") && panel.includes("data.borrable && !borrando"));
  const seccion = lee("src/app/ocp/(app)/kr/ProductorSeccion.tsx");
  check("la vista del productor lee producer_inactividad y calcula el próximo paso con la regla", seccion.includes('from("producer_inactividad")') && seccion.includes("proximoPaso("));
  const acta = lee("docs/migraciones/2026-09-30_inactividad_marchitando.sql");
  check("la tabla es service-role-only y las cuentas protegidas del owner van en el acta", acta.includes("enable row level security") && ["20A85D62", "57EB7B93", "4AF96C32", "067907FB"].every((c) => acta.includes(c)));
}

if (fallos.length) {
  console.error(`✗ qa-inactividad: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-inactividad: ${ok} comprobaciones OK, 0 fallos`);
