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
import { createRequire } from "node:module";
import { createServerClient } from "@supabase/ssr";
import { borradoHostOnly, esUsuarioInexistente, unaPorNombre } from "../src/lib/supabase/cookiesDeSesion.ts";
import { COOKIE_SESION_ASISTIDA, SEGUNDOS_DE_LA_MARCA, borradoDeLaMarca, esSesionAsistida, leerMarcaAsistida } from "../src/lib/asistencia/marca.ts";
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
  // V5.98: las cuentas de auditoría (@ctc-qa-test.co) tampoco reciben correo — misma puerta, mismo sitio.
  check("el remitente único salta también las cuentas de prueba (@ctc-qa-test.co), antes de Resend", emails.includes("esCorreoDePrueba(to)") && emails.indexOf("esCorreoDePrueba(to)") < emails.indexOf("RESEND_API_KEY") && lee("src/lib/email/cuentasDePrueba.ts").includes('DOMINIO_PRUEBAS = "ctc-qa-test.co"'));
  check("qa-guard y qa-checkout solo aceptan cuentas de prueba y limpian lo que escriben", lee("scripts/qa-guard-check.mjs").includes("deshacer.reverse()") && lee("scripts/qa-guard-check.mjs").includes("process.env.QA_PRODUCER_EMAIL") && lee("scripts/qa-checkout-check.mjs").includes('from("orders").delete()') && lee("scripts/qa-checkout-check.mjs").includes("process.env.QA_BUYER_EMAIL"));
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

// ── 5a. V5.106 (owner, 2026-09-30) · las pestañas del productor traen un buen vistazo, de la MISMA fuente que la tabla ──
{
  const carga = lee("src/app/ocp/(app)/kr/carga.ts");
  const seccion = lee("src/app/ocp/(app)/kr/ProductorSeccion.tsx");
  const panel = lee("src/app/ocp/(app)/kr/ProducerPanel.tsx");
  check("cargarKr carga UN productor (filtra perfiles, fincas, lotes, inscripciones y ofertas)", carga.includes("opciones: { productorId?: string } = {}") && (carga.match(/soloDe\(/g) ?? []).length >= 6);
  check("la vista del productor deriva Pasaporte, circuito, muestra, oferta y trato con cargarKr, no a mano", seccion.includes("cargarKr(service, { productorId })") && seccion.includes("pasaporte: fila?.visa ?? null") && seccion.includes("circuito: fila?.circuito") && seccion.includes("trato: fila?.trato ?? null"));
  check("las tarjetas: finca con ubicación, ha, lotes y certificaciones; lote con ficha, grado, muestra, oferta y trato; arena con pago; contrato con kg y precio", panel.includes("certificacionesCorroboradas") && panel.includes("PASOS_DE_LA_FICHA.map((p, i)") && panel.includes('prefijo="Muestra"') && panel.includes("PAGO_LABEL[a.pago]") && panel.includes("`${cop(c.copKg)}/kg`"));
}

// ── 5c. V5.111 (owner, 2026-09-30) · Proveedor Desacoplado: el departamento de un selector (la lista de KR) con «Otro…» ──
{
  const selector = lee("src/app/ocp/(app)/desacoplado/SelectorDepartamento.tsx");
  const pagina = lee("src/app/ocp/(app)/desacoplado/page.tsx");
  const acciones = lee("src/lib/asistencia/actions.ts");
  check("el selector usa la lista completa de departamentos (V5.127) y ofrece «Otro…» con campo libre", selector.includes("const DEPARTAMENTOS = DEPARTAMENTOS_DE_COLOMBIA;") && !selector.includes("DEP_MUNI)") && selector.includes("<option value={OTRO}>Otro…</option>") && selector.includes('name="department_otro"'));
  check("el formulario lo monta y la acción resuelve selector u «Otro»", pagina.includes("<SelectorDepartamento />") && acciones.includes('departmentSel === "__otro__" ? String(formData.get("department_otro")'));
}

// ── 5b. V5.105 (owner, 2026-09-30) · Asistencia a Proveedores: filtros y buscador con búsqueda profunda en fincas y lotes ──
{
  const pagina = lee("src/app/ocp/(app)/asistencia/page.tsx");
  const tabla = lee("src/app/ocp/(app)/asistencia/AsistenciaTabla.tsx");
  check("la página carga nombres y códigos de fincas y lotes y el estado del productor como /ocp/kr", pagina.includes("fincaCode(f.id)") && pagina.includes("ctcLotReference(l.id)") && pagina.includes("segmentProducer(") && pagina.includes("<AsistenciaTabla filas={filas} />"));
  check("el buscador directo mira al productor y la búsqueda profunda (toggle) a sus fincas y lotes, diciendo dónde coincidió", tabla.includes('role="switch"') && tabla.includes("if (!profunda) return null;") && tabla.includes("f.fincas.filter((x) => [x.nombre, x.codigo, x.lugar]") && tabla.includes("f.lotes.filter((x) => [x.nombre, x.codigo]") && tabla.includes("Coincide en:"));
  check("los filtros: cuenta (de GESTION_LABEL), estado por casillas (de PRODUCER_SEGMENTS), departamento, con/sin finca y lote", tabla.includes("Object.keys(GESTION_LABEL)") && tabla.includes("PRODUCER_SEGMENTS.map((sg)") && tabla.includes('aria-label="Departamento"') && tabla.includes('"Finca ✅"') && tabla.includes('"Sin lote"'));
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

// ── 9. La cookie compartida se CIERRA y se CAMBIA de verdad (V5.138, owner 2026-10-02) ─────────────────────────────────
// «La Asistencia a Proveedores no está cargando nada de la información correspondiente.» Kaffetal Regal seguía con la
// sesión de una cuenta ya borrada: @supabase/ssr pide cada borrado dos veces (con dominio y host-only), `cookies()` de
// Next guarda UNO por nombre y se quedaba con el host-only, que no borra la cookie compartida. Aquí se ejecuta la
// librería REAL contra el almacén de cookies REAL de Next, con Auth simulado, y se mira qué le llega al navegador.
{
  const { ResponseCookies } = createRequire(import.meta.url)("next/dist/compiled/@edge-runtime/cookies");
  const URL_SB = "https://abcdefghijklmnop.supabase.co", CLAVE = "sb-abcdefghijklmnop-auth-token", DOMINIO = ".ctcexport.com";
  const enCookie = (sesion) => "base64-" + Buffer.from(JSON.stringify(sesion)).toString("base64url");
  const sesionDe = (token, relleno = 0) => ({
    access_token: token, refresh_token: `r-${token}`, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: `u-${token}`, aud: "authenticated", email: `${token}@ctc-qa-test.co`, user_metadata: { relleno: "x".repeat(relleno) } },
  });
  const responde = (status, cuerpo) => async () => new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } });
  /** El navegador en miniatura: una cookie es (nombre, dominio); Max-Age=0 la borra. */
  const navegador = (inicial) => {
    const tarro = new Map(inicial.map((c) => [`${c.name}|${c.domain}`, c]));
    return {
      recibe(cabeceras, host) {
        for (const h of cabeceras) {
          const [par, ...attrs] = h.split("; ");
          const name = par.slice(0, par.indexOf("=")), value = decodeURIComponent(par.slice(par.indexOf("=") + 1));
          const domain = (attrs.find((a) => a.startsWith("Domain=")) ?? `Domain=${host}`).slice(7);
          if (attrs.includes("Max-Age=0")) tarro.delete(`${name}|${domain}`);
          else tarro.set(`${name}|${domain}`, { name, value, domain });
        }
      },
      envia: () => [...tarro.values()].map(({ name, value }) => ({ name, value })),
      nombres: () => [...tarro.values()].map((c) => `${c.name}@${c.domain}`).sort(),
    };
  };
  /** Lo que hace una Server Action: el cliente de sesión de `server.ts`, con o sin la regla, sobre el `cookies()` de Next. */
  const accion = async (nav, fetch, conRegla, hacer) => {
    const cabeceras = new Headers(), almacen = new ResponseCookies(cabeceras);
    const cliente = createServerClient(URL_SB, "anon", {
      global: { fetch },
      cookieOptions: { domain: DOMINIO, path: "/" },
      cookies: {
        getAll: () => nav.envia(),
        setAll: (lista) => (conRegla ? unaPorNombre(lista) : lista).forEach(({ name, value, options }) => almacen.set(name, value, options)),
      },
    });
    await hacer(cliente);
    const out = cabeceras.getSetCookie();
    nav.recibe(out, "ocp.ctcexport.com");
    return out;
  };
  const tokenQueVe = async (nav) => {
    const lector = createServerClient(URL_SB, "anon", { cookies: { getAll: () => nav.envia(), setAll: () => {} } });
    return (await lector.auth.getSession()).data.session?.access_token ?? null;
  };
  const silencio = async (f) => { const w = console.warn; console.warn = () => {}; try { return await f(); } finally { console.warn = w; } };
  const vieja = { name: CLAVE, value: enCookie(sesionDe("viejo")), domain: DOMINIO };
  const noExiste = responde(403, { code: 403, error_code: "user_not_found", msg: "User from sub claim in JWT does not exist" });

  await silencio(async () => {
    // (a) «Cerrar sesión asistida», con la cuenta ya borrada (Auth responde 403 al logout).
    for (const conRegla of [false, true]) {
      const nav = navegador([vieja]);
      const out = await accion(nav, noExiste, conRegla, (c) => c.auth.signOut({ scope: "local" }));
      const delNombre = out.filter((h) => h.startsWith(`${CLAVE}=`));
      if (!conRegla) check("cerrar · SIN la regla el borrado llega sin dominio y la cookie compartida sobrevive (el fallo que se arregló)", delNombre.length === 1 && !delNombre[0].includes("Domain=") && nav.nombres().length === 1, JSON.stringify(out));
      else {
        check("cerrar · llega UN borrado y lleva el dominio compartido", delNombre.length === 1 && delNombre[0].includes(`Domain=${DOMINIO}`) && delNombre[0].includes("Max-Age=0"), JSON.stringify(out));
        check("cerrar · el navegador se queda sin la sesión del productor", nav.nombres().length === 0 && (await tokenQueVe(nav)) === null, nav.nombres().join(","));
      }
    }
    // (b) Entrar como OTRO productor cuya sesión ocupa otros trozos (la vieja cabía en una cookie; la nueva va en .0 y .1).
    const nueva = sesionDe("nuevo", 3200);
    for (const conRegla of [false, true]) {
      const nav = navegador([vieja]);
      const out = await accion(nav, responde(200, nueva), conRegla, (c) => c.auth.verifyOtp({ type: "magiclink", token_hash: "x" }));
      const trozos = out.filter((h) => /^sb-[a-z]+-auth-token\.\d+=/.test(h));
      check(`cambiar · la sesión nueva se escribe en trozos con el dominio compartido (${conRegla ? "con" : "sin"} la regla)`, trozos.length >= 2 && trozos.every((h) => h.includes(`Domain=${DOMINIO}`)), String(trozos.length));
      const ve = await tokenQueVe(nav);
      if (!conRegla) check("cambiar · SIN la regla Kaffetal Regal sigue viendo al productor ANTERIOR (el fallo que se arregló)", ve === "viejo" && nav.nombres().includes(`${CLAVE}@${DOMINIO}`), String(ve));
      else {
        check("cambiar · la cookie vieja se borra en el dominio compartido", !nav.nombres().includes(`${CLAVE}@${DOMINIO}`), nav.nombres().join(","));
        check("cambiar · Kaffetal Regal ve al productor NUEVO", ve === "nuevo", String(ve));
      }
    }
    // (c) El proxy: la cuenta del token ya no existe → la sesión se cierra sola en la siguiente petición.
    const nav = navegador([vieja]);
    const out = await accion(nav, noExiste, true, async (c) => {
      const { error } = await c.auth.getUser();
      check("cuenta borrada · Auth responde `user_not_found` y la librería NO cierra la sesión por su cuenta", esUsuarioInexistente(error) && nav.nombres().length === 1);
      if (esUsuarioInexistente(error)) await c.auth.signOut({ scope: "local" });
    });
    check("cuenta borrada · con el cierre del proxy la cookie compartida se borra", nav.nombres().length === 0 && out.some((h) => h.includes(`Domain=${DOMINIO}`) && h.includes("Max-Age=0")), JSON.stringify(out));
  });

  // La regla, sola.
  const b = (name, domain) => ({ name, value: "", options: { path: "/", maxAge: 0, ...(domain ? { domain } : {}) } });
  const v = (name, value) => ({ name, value, options: { path: "/", domain: DOMINIO } });
  check("regla · de dos borrados del mismo nombre queda el que lleva dominio (en cualquier orden)", unaPorNombre([b("a", DOMINIO), b("a")])[0].options.domain === DOMINIO && unaPorNombre([b("a"), b("a", DOMINIO)])[0].options.domain === DOMINIO);
  check("regla · un valor le gana a un borrado, antes o después", unaPorNombre([b("a", DOMINIO), v("a", "1")])[0].value === "1" && unaPorNombre([v("a", "1"), b("a")])[0].value === "1");
  check("regla · de dos valores queda el último", unaPorNombre([v("a", "1"), v("a", "2")])[0].value === "2");
  check("regla · nombres distintos no se tocan y conservan el orden", unaPorNombre([v("a", "1"), b("b", DOMINIO), b("b"), v("c", "3")]).map((c) => c.name).join("") === "abc");
  check("regla · solo `user_not_found` cuenta como cuenta borrada", esUsuarioInexistente({ code: "user_not_found" }) && !esUsuarioInexistente({ code: "session_not_found" }) && !esUsuarioInexistente(null) && !esUsuarioInexistente(new Error("red")));
  check("regla · el borrado host-only no lleva dominio", borradoHostOnly("a") === "a=; Path=/; Max-Age=0");

  // Y los tres sitios que escriben cookies de sesión la usan.
  const servidor = lee("src/lib/supabase/server.ts"), proxy = lee("src/proxy.ts");
  check("server.ts · los tres clientes (compartida, consolas y —V5.145— socios) pasan por `unaPorNombre`", (servidor.match(/unaPorNombre\(cookiesToSet\)\.forEach/g) ?? []).length === 3 && !/cookiesToSet\.forEach\(\(\{ name, value, options \}\) => cookieStore\.set/.test(servidor));
  check("proxy · escribe una por nombre", proxy.includes("const finales = unaPorNombre(pending);") && !proxy.includes("of pending)"));
  check("proxy · el borrado host-only va DESPUÉS de los `.set()` (antes se perdía) y nunca en el dominio raíz", proxy.indexOf("response.cookies.set(n, value, options)") < proxy.indexOf("borradoHostOnly(n)") && proxy.includes("cookieDomain && !enLaRaiz"));
  check("proxy · cierra la sesión de una cuenta que ya no existe", proxy.includes('if (esUsuarioInexistente(error)) await supabase.auth.signOut({ scope: "local" });'));
  {
    // El supuesto del proxy, contra el Next instalado: un `.set()` posterior se lleva los encabezados crudos anteriores.
    const h = new Headers(), jar = new ResponseCookies(h);
    h.append("set-cookie", borradoHostOnly("a"));
    jar.set("a", "1", { domain: DOMINIO, path: "/" });
    const antes = h.getSetCookie().length;
    h.append("set-cookie", borradoHostOnly("a"));
    check("Next · un encabezado crudo puesto ANTES de `.set()` se pierde; puesto después, llega", antes === 1 && h.getSetCookie().length === 2, JSON.stringify(h.getSetCookie()));
  }
}

// ── 10. La franja «Sesión asistida · <productor>» (V5.139, owner 2026-10-02) ───────────────────────────────────────────
// Kaffetal Regal dice COMO QUIÉN está entrado el operador. La enciende una marca que el OCP escribe al abrir la sesión
// y borra al cerrarla; solo cuenta si dice el MISMO id que la sesión cargada.
{
  const A = "632ba841-e2d7-4802-93b9-3474a916b065", B = "78337ec3-21f4-4c2c-8b8d-700771883c88";
  const tarro = `otra=1; ${COOKIE_SESION_ASISTIDA}=${A}; sb-x-auth-token=abc`;
  check("marca · se lee entre las demás cookies", leerMarcaAsistida(tarro) === A);
  check("marca · sin cookie no hay marca", leerMarcaAsistida("otra=1") === null && leerMarcaAsistida("") === null && leerMarcaAsistida(null) === null);
  check("marca · un valor que no es un id no cuenta", leerMarcaAsistida(`${COOKIE_SESION_ASISTIDA}=<script>`) === null && leerMarcaAsistida(`${COOKIE_SESION_ASISTIDA}=`) === null);
  check("marca · una cookie de nombre parecido no cuenta", leerMarcaAsistida(`x-${COOKIE_SESION_ASISTIDA}=${A}`) === null);
  check("franja · sale cuando la marca dice el id de la sesión cargada", esSesionAsistida(tarro, A) && esSesionAsistida(tarro, A.toUpperCase()));
  check("franja · NO sale con la marca de OTRO productor (la marca vieja no enciende nada)", !esSesionAsistida(tarro, B));
  check("franja · NO sale sin sesión ni sin marca", !esSesionAsistida(tarro, null) && !esSesionAsistida("otra=1", A));
  check("marca · dura una jornada, no para siempre", SEGUNDOS_DE_LA_MARCA > 0 && SEGUNDOS_DE_LA_MARCA <= 24 * 3600);
  check("marca · se borra en el mismo ámbito en que se escribió", borradoDeLaMarca(".ctcexport.com") === `${COOKIE_SESION_ASISTIDA}=; Path=/; Max-Age=0; Domain=.ctcexport.com` && borradoDeLaMarca(undefined) === `${COOKIE_SESION_ASISTIDA}=; Path=/; Max-Age=0`);

  const acciones = lee("src/lib/asistencia/actions.ts").replace(/\r\n/g, "\n"), kr = lee("src/components/kaffetal-regal/KaffetalExperience.tsx").replace(/\r\n/g, "\n");
  const abrir = acciones.slice(acciones.indexOf("export async function abrirSesionAsistida"), acciones.indexOf("export async function cerrarSesionAsistida"));
  const cerrar = acciones.slice(acciones.indexOf("export async function cerrarSesionAsistida"), acciones.indexOf("export async function crearProveedorDesacoplado"));
  check("OCP · abrir la sesión escribe la marca, y solo DESPUÉS de que Auth la abrió", abrir.indexOf("await marcarSesionAsistida(producerId);") > abrir.indexOf("compartida.auth.verifyOtp("));
  check("OCP · cerrar la sesión borra la marca", cerrar.includes("await marcarSesionAsistida(null);"));
  check("OCP · la marca va en el dominio compartido y la puede leer el navegador (es un rótulo, no un permiso)", acciones.includes("const domain = sharedCookieDomain(host);") && acciones.includes("httpOnly: false") && acciones.includes("maxAge: producerId ? SEGUNDOS_DE_LA_MARCA : 0"));
  check("KR · la franja se decide al cargar la sesión y al entrar (los dos caminos)", (kr.match(/setAsistida\(esSesionAsistida\(document\.cookie, uid\)\);/g) ?? []).length === 2);
  check("KR · al cerrar sesión la marca se borra y la franja se apaga", /event === "SIGNED_OUT"\) \{[\s\S]{0,260}document\.cookie = borradoDeLaMarca\(sharedCookieDomain\(window\.location\.hostname\)\);\s*setAsistida\(false\);/.test(kr));
  check("KR · la franja dice el nombre y el código del productor, y «Salir» cierra la sesión", kr.includes("{asistida && userId && <FranjaAsistida nombre={") && kr.includes("codigo={supplierCode(userId)} onSalir={logout} />"));
  const franja = lee("src/components/kaffetal-regal/FranjaAsistida.tsx"), css = lee("src/components/kaffetal-regal/FranjaAsistida.module.css");
  check("franja · dice «Sesión asistida» y se anuncia a un lector de pantalla", franja.includes("<b>Sesión asistida</b>") && franja.includes('role="status"'));
  check("franja · va fija por encima de todo y no sale en lo que se imprime", css.includes("position:fixed") && /z-index:40[01]/.test(css) && css.includes("@media print{.linea,.franja{display:none}}"));
}

if (fallos.length) {
  console.error(`✗ qa-asistencia: ${fallos.length} fallo(s), ${ok} OK`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-asistencia: ${ok} comprobaciones OK, 0 fallos`);
