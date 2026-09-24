// Guardián de ASISTENCIA A PROVEEDORES y PROVEEDOR DESACOPLADO (V5.75, owner 2026-09-23).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-asistencia-check.mjs
//
// GRATIS y sin red: ejercita el módulo puro y lee las fuentes.
//
// QUÉ VIGILA. Los dos módulos son UN mecanismo —la sesión asistida: el OCP abre Kaffetal Regal COMO un
// productor— y tocan el contrato de Identidad (ALINEACION §1), que el owner autorizó con dos condiciones
// escritas en el brief `consolas-rutas-del-proveedor.md`: (1) solo para cuentas de PRODUCTOR y (2) siempre
// con rastro. Y el desacoplado vive con un correo-etiqueta sin buzón al que NADA debe enviarse.
// Cada comprobación cita la condición de la que sale; ninguna copia el código que vigila.

import { readFileSync } from "node:fs";
import {
  correoEtiquetaDesacoplado,
  correoRealValido,
  esCorreoEtiquetaDesacoplado,
  slugDesacoplado,
  GESTION_LABEL,
  GESTION_CORTA,
} from "../src/lib/asistencia/desacoplado.ts";
import { CONSOLES, consolaDelModulo } from "../src/lib/panel/consoles.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// ── 1. El módulo puro: la etiqueta se reconoce y un correo real no es una etiqueta ──
{
  const slug = slugDesacoplado(() => 0.5);
  check("el slug tiene 8 caracteres [a-z0-9]", /^[a-z0-9]{8}$/.test(slug), slug);
  check("y es determinista con el azar inyectado", slug === slugDesacoplado(() => 0.5));
  check("dos azares distintos dan slugs distintos", slugDesacoplado(() => 0.1) !== slugDesacoplado(() => 0.9));
  const etiqueta = correoEtiquetaDesacoplado(slug);
  check("la etiqueta vive en ctcexport.com", etiqueta.endsWith("@ctcexport.com"), etiqueta);
  check("la etiqueta se reconoce como tal", esCorreoEtiquetaDesacoplado(etiqueta));
  check("y también en mayúsculas o con espacios", esCorreoEtiquetaDesacoplado(`  ${etiqueta.toUpperCase()} `));
  check("un correo real NO es etiqueta", !esCorreoEtiquetaDesacoplado("maria@gmail.com"));
  check("ni el buzón de la casa", !esCorreoEtiquetaDesacoplado("info@ctcexport.com"));
  check("ni una etiqueta de socio o del equipo", !esCorreoEtiquetaDesacoplado("estudio-contenido@ctcexport.com"));
  check("ni un slug demasiado corto", !esCorreoEtiquetaDesacoplado("desacoplado-abc@ctcexport.com"));
  check("correoRealValido acepta un correo normal", correoRealValido("maria.perez@gmail.com"));
  check("y rechaza la etiqueta (entregar a una etiqueta no es entregar)", !correoRealValido(etiqueta));
  check("y rechaza lo que no tiene forma de correo", !correoRealValido("maria") && !correoRealValido("") && !correoRealValido("a@b"));
  check("los dos rótulos existen para los dos estados", ["desacoplado", "entregado"].every((g) => GESTION_LABEL[g] && GESTION_CORTA[g]));
}

// ── 2. El rail: dos entradas del OCP, un módulo declarado ──────────────────
{
  const hrefs = CONSOLES.ocp.nav.flatMap((g) => g.links.map((l) => l.href));
  check("el rail del OCP tiene «Asistencia a Proveedores»", hrefs.includes("/ocp/asistencia"));
  check("y «Proveedor Desacoplado»", hrefs.includes("/ocp/desacoplado"));
  check("los dos cuelgan del grupo Kaffetal Regal (el origen del lote)", CONSOLES.ocp.nav.some((g) => g.label.includes("Kaffetal Regal") && g.links.some((l) => l.href === "/ocp/asistencia") && g.links.some((l) => l.href === "/ocp/desacoplado")));
  check("consolaDelModulo resuelve los dos al OCP", consolaDelModulo("asistencia") === "ocp" && consolaDelModulo("desacoplado") === "ocp");
  const rutas = lee("scripts/qa-rutas-consolas.mjs");
  check("qa-rutas-consolas declara el módulo en MODULOS_LIB", /"src\/lib\/asistencia\/actions\.ts": \{ rail: \["asistencia", "desacoplado"\] \}/.test(rutas));
}

// ── 3. Las acciones: condición (1) solo productores, condición (2) siempre con rastro ──
{
  const acciones = lee("src/lib/asistencia/actions.ts");
  const fn = (nombre) => {
    const i = acciones.indexOf(`export async function ${nombre}(`);
    if (i < 0) return "";
    const j = acciones.indexOf("\nexport async function ", i + 1);
    return acciones.slice(i, j < 0 ? undefined : j);
  };
  for (const nombre of ["abrirSesionAsistida", "cerrarSesionAsistida", "crearProveedorDesacoplado", "entregarCuentaDesacoplada"]) {
    check(`${nombre} existe y pide OCP · emite`, fn(nombre).includes('permisoDeEscritura("ocp", "emite")'));
  }
  const abrir = fn("abrirSesionAsistida");
  const iRol = abrir.indexOf('p.role !== "producer"');
  const iLink = abrir.indexOf('generateLink({ type: "magiclink"');
  check("(1) la sesión asistida exige role = producer ANTES de generar el enlace", iRol > -1 && iLink > iRol);
  check("el enlace se canjea en la cookie COMPARTIDA, no en la del panel", abrir.includes("createSessionClient()") && abrir.includes("verifyOtp(") && !abrir.includes("createPanelSessionClient"));
  check("(2) abrir deja su fila en audit_log", abrir.includes('action: "assisted_session_opened"'));
  check("(2) y una nota que el productor VE (producer_comm_log)", abrir.includes('from("producer_comm_log")'));
  const cerrar = fn("cerrarSesionAsistida");
  check("cerrar limpia SOLO este navegador (scope local): no revoca la sesión del productor en su teléfono", cerrar.includes('signOut({ scope: "local" })'));
  check("(2) y también deja rastro", cerrar.includes('action: "assisted_session_closed"'));
  const crear = fn("crearProveedorDesacoplado");
  check("el desacoplado nace como PRODUCTOR (handle_new_user lee el rol de los metadatos)", /user_metadata: \{ role: "producer"/.test(crear));
  check("con la etiqueta generada aquí, no un correo tecleado", crear.includes("correoEtiquetaDesacoplado(slugDesacoplado())") && !/formData\.get\("email"\)/.test(crear));
  check("con el correo marcado confirmado (no habrá quien confirme)", crear.includes("email_confirm: true"));
  check("con contraseña que nadie ve", /password: `\$\{crypto\.randomUUID\(\)\}/.test(crear));
  check("y queda marcado gestion = desacoplado con su fecha", crear.includes('"desacoplado"') && crear.includes("gestion_desde"));
  const entregar = fn("entregarCuentaDesacoplada");
  check("entregar exige un correo REAL (no otra etiqueta)", entregar.includes("correoRealValido(correo)"));
  check("solo se entrega lo que hoy es desacoplado", entregar.includes('pp.gestion !== "desacoplado"'));
  check("una identidad, una cuenta: rechaza un correo que ya existe", entregar.includes('.eq("email", correo)') && entregar.includes("if (ocupado)"));
  check("cambia el correo en Auth Y en profiles", entregar.includes("updateUserById(producerId, { email: correo") && entregar.includes('from("profiles").update({ email: correo })'));
  check("queda entregado con fecha", entregar.includes('gestion: "entregado", entregado_at'));
  check("y la contraseña la elige la persona por el flujo de Recuperar acceso (vale de un solo uso)", entregar.includes('emitirVale(producerId, "kaffetal-regal", correo)') && entregar.includes("enviarCorreoRecuperacion("));
  check("si el correo no sale, el vale se anula (no se cuenta contra el tope)", entregar.includes("anularVale(emision.token)"));
}

// ── 4. Nada sale hacia una etiqueta: el remitente único lo filtra ──────────
{
  const emails = lee("src/lib/email/leadEmails.ts");
  const iSend = emails.indexOf("async function send(");
  const iGuard = emails.indexOf("esCorreoEtiquetaDesacoplado(to)");
  const iResend = emails.indexOf("resend.emails.send(");
  check("el remitente compartido filtra las etiquetas ANTES de llamar a Resend", iSend > -1 && iGuard > iSend && iResend > iGuard);
  check("y es el ÚNICO sitio que llama a Resend (los demás pasan por él)", (emails.match(/resend\.emails\.send\(/g) ?? []).length === 1);
  const otros = ["src/lib/email/recuperacionEmails.ts", "src/lib/email/terratalentoEmails.ts"].map(lee).join("\n");
  check("ningún otro remitente instancia Resend por su cuenta", !/new Resend\(/.test(otros));
}

// ── 5. El OCP enseña la gestión donde mira al productor ────────────────────
{
  const carga = lee("src/app/ocp/(app)/kr/carga.ts");
  const tabla = lee("src/app/ocp/(app)/kr/KrTabla.tsx");
  const seccion = lee("src/app/ocp/(app)/kr/ProductorSeccion.tsx");
  const panel = lee("src/app/ocp/(app)/kr/ProducerPanel.tsx");
  check("la tabla única lee `gestion` de producer_profiles", /producer_profiles"\)\.select\("[^"]*gestion/.test(carga));
  check("y la pinta bajo el nombre con el rótulo corto (de la fuente, no a mano)", tabla.includes("GESTION_CORTA[f.gestion]"));
  check("la vista completa del productor lee `gestion`", /club_member_since, gestion"/.test(seccion));
  check("el panel del productor pinta la insignia y el botón de sesión asistida", panel.includes("GESTION_LABEL[data.gestion]") && panel.includes("<SesionAsistidaBoton producerId={data.id}"));
}

// ── 6. La evaluación asumida por CTCx (Ruta Desacoplada: «CTCx bears the cost») ──
{
  const nominados = lee("src/app/ocp/(app)/nominadosActions.ts");
  const i = nominados.indexOf("export async function asumirEvaluacion(");
  const cuerpo = i < 0 ? "" : nominados.slice(i, nominados.indexOf("\nexport async function ", i + 1));
  check("asumirEvaluacion existe y es emite", cuerpo.includes('permisoDeEscritura("ocp", "emite")'));
  check("deja la inscripción exenta al 100 % con la razón escrita", cuerpo.includes('discount_pct: 100, status: "exento", payment_ref: "Asumida por CTCx"'));
  check("solo sobre un pago pendiente", cuerpo.includes('ins.status !== "pendiente"'));
  check("con rastro y nota al productor, y avanza a la fila si la muestra ya llegó", cuerpo.includes('action: "assumed_by_ctcx"') && cuerpo.includes('from("producer_comm_log")') && cuerpo.includes("avanzarAFilaSiCompleta(service, lotId)"));
  const cliente = lee("src/app/ocp/(app)/nominados/NominadosClient.tsx");
  check("y tiene su botón junto a «Confirmar pago», con confirmación", cliente.includes("asumirEvaluacion(lotId)") && /confirm\("¿CTCx asume el costo/.test(cliente));
}

// ── 7. El acta de la migración y el HANDOFF nombran el guard ───────────────
{
  const sql = lee("docs/migraciones/2026-09-23_producer_profiles_gestion_desacoplado.sql");
  check("la migración añade las tres columnas", ["gestion text", "gestion_desde timestamptz", "entregado_at timestamptz"].every((c) => sql.includes(c)));
  check("y el guard impide que el productor las toque al INSERTAR y al ACTUALIZAR", (sql.match(/solo puede escribirla CTC/g) ?? []).length === 2);
  check("el CHECK solo admite desacoplado · entregado", sql.includes("check (gestion in ('desacoplado', 'entregado'))"));
  const handoff = lee("docs/HANDOFF.md");
  check("HANDOFF · la tabla de guards nombra `gestion`", /guard_producer_protected_columns[^\n]*`gestion`/.test(handoff));
}

if (fallos.length) {
  console.error(`✗ qa-asistencia: ${fallos.length} fallo(s), ${ok} OK`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-asistencia: ${ok} comprobaciones OK, 0 fallos`);
