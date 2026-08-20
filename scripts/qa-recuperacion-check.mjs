// Guardián de «Recuperar acceso» (V5.12).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-recuperacion-check.mjs
//
// La política vive en un módulo PURO (`lib/auth/veredicto.ts`) exactamente para
// poder comprobarse aquí. La alternativa era ensayar a mano un flujo que manda
// correos de verdad y cambia contraseñas de verdad, contra cuentas de verdad —
// lento, sucio y con casos raros que nadie repite dos veces.
//
// LO QUE PROTEGE, y por qué cada cosa importa:
//   · Que el vale viaje al `delivery_email` cuando lo hay. Tres usuarios de la
//     casa son etiquetas @ctcexport.com SIN BUZÓN; mandarles el rescate a su
//     propio usuario los deja fuera para siempre y del lado de CTC no falla
//     nada visible. Es el fallo mudo más caro de este módulo.
//   · Que una cuenta de Google NO reciba un enlace de contraseña. Son 8 de 29
//     hoy: estrenarles una contraseña que nunca pidieron es peor que no
//     ayudarles.
//   · Que una credencial SUSPENDIDA no se reactive sola. Si se colara, la baja
//     de un socio pasaría a ser un trámite reversible por el propio socio.
//   · Que el `?puerta=` siga siendo un IDENTIFICADOR y nunca una URL. Aceptar
//     un destino sería un redirect abierto en la pantalla donde alguien está
//     recuperando su contraseña — phishing servido desde el dominio de CTC.
//   · Que las ONCE puertas enlacen aquí. Una puerta sin enlace es una puerta
//     sin recuperación, que es el estado del que venimos.
//   · Que toda clase de CSS module usada exista. Una que no existe sale
//     `undefined` y el elemento se pinta sin estilo — ni tsc, ni eslint, ni el
//     build dicen una palabra (trampa de V4.30).

import { readFileSync } from "node:fs";
import {
  decidir,
  destinoDe,
  enmascararCorreo,
  esCorreoPlausible,
  normalizarCorreo,
  validarContrasena,
  MINIMO_CONTRASENA,
  MINUTOS_DEL_VALE,
} from "../src/lib/auth/veredicto.ts";
import { PUERTAS, esPuerta, puertaDe, hrefPuerta, hrefRecuperar, RUTA_RECUPERAR } from "../src/lib/auth/puertas.ts";
import { SUBDOMAIN_ROUTES } from "../src/lib/red/subdominios.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

const cuenta = (extra = {}) => ({
  profileId: "00000000-0000-0000-0000-000000000001",
  correo: "productora@finca.co",
  confirmado: true,
  tienePassword: true,
  tieneGoogle: false,
  rol: "producer",
  panelStatus: null,
  panelDelivery: null,
  socioStatus: null,
  socioDelivery: null,
  socioNodo: null,
  ...extra,
});

// ── 1. El correo se normaliza como lo guarda GoTrue ─────────────────────────
check("se recortan espacios y se baja a minúsculas", normalizarCorreo("  Ana@Finca.CO  ") === "ana@finca.co");
check("un correo normal es plausible", esCorreoPlausible("ana@finca.co"));
check("uno sin arroba no lo es", !esCorreoPlausible("ana.finca.co"));
check("uno sin dominio tampoco", !esCorreoPlausible("ana@"));
check("ni el vacío", !esCorreoPlausible("   "));
check("ni uno absurdamente largo", !esCorreoPlausible("a".repeat(250) + "@finca.co"));

// ── 2. Los cinco veredictos ─────────────────────────────────────────────────
check("un correo con mala forma se corta antes de tocar la base", decidir("no-es-correo", null).estado === "correo-invalido");
check("un correo que no existe se DICE (decisión del owner, 2026-08-20)", decidir("ana@finca.co", null).estado === "sin-cuenta");
check("una cuenta con contraseña puede recibir el vale", decidir("ana@finca.co", cuenta()).estado === "puede-enviarse");
check(
  "una cuenta SOLO de Google no recibe enlace de contraseña: se le señala su puerta",
  decidir("ana@finca.co", cuenta({ tienePassword: false, tieneGoogle: true })).estado === "solo-google"
);
check(
  "una cuenta de Google a la que un admin puso temporal SÍ recupera (tiene contraseña)",
  decidir("ana@finca.co", cuenta({ tienePassword: true, tieneGoogle: true })).estado === "puede-enviarse"
);
check(
  "un colaborador SUSPENDIDO no se reactiva solo",
  decidir("gvg@ctcexport.com", cuenta({ panelStatus: "suspended" })).estado === "bloqueada"
);
check(
  "un socio SUSPENDIDO tampoco",
  decidir("gvg@gmail.com", cuenta({ socioStatus: "suspended" })).estado === "bloqueada"
);
check(
  "y la suspensión gana a Google: se le dice que está suspendido, no que pruebe con Google",
  decidir("x@y.co", cuenta({ tienePassword: false, tieneGoogle: true, socioStatus: "suspended" })).estado === "bloqueada"
);
check(
  "un socio ACTIVO sí recupera",
  decidir("x@y.co", cuenta({ socioStatus: "active", socioDelivery: "real@gmail.com" })).estado === "puede-enviarse"
);

// ── 3. A DÓNDE va el vale — el fallo mudo más caro del módulo ───────────────
check("sin delivery, va al propio correo", destinoDe(cuenta()) === "productora@finca.co");
check(
  "un usuario del panel SIN BUZÓN recibe en su delivery_email",
  destinoDe(cuenta({ correo: "gvg@ctcexport.com", panelDelivery: "gabriel.vasquez92@gmail.com" })) ===
    "gabriel.vasquez92@gmail.com"
);
check(
  "un socio SIN BUZÓN, igual",
  destinoDe(cuenta({ correo: "gvg-estudiocontenido@ctcexport.com", socioDelivery: "real@gmail.com" })) ===
    "real@gmail.com"
);
{
  const v = decidir("gvg@ctcexport.com", cuenta({ correo: "gvg@ctcexport.com", panelDelivery: "otro@gmail.com" }));
  check("el veredicto AVISA de que el destino es otro buzón", v.estado === "puede-enviarse" && v.destinoDistinto === true);
}
{
  const v = decidir("ana@finca.co", cuenta());
  check("y no avisa cuando es el mismo", v.estado === "puede-enviarse" && v.destinoDistinto === false);
}
{
  const v = decidir("ete0109@yahoo.com", cuenta({ correo: "ete0109@yahoo.com", confirmado: false }));
  check("una cuenta SIN CONFIRMAR recupera igual", v.estado === "puede-enviarse");
  check("y queda marcada para confirmarse de paso", v.estado === "puede-enviarse" && v.sinConfirmar === true);
}

// ── 4. El enmascarado no regala el buzón personal ───────────────────────────
{
  const m = enmascararCorreo("gabriel.vasquez92@gmail.com");
  check("el enmascarado conserva el dominio", m.endsWith("@gmail.com"));
  check("y esconde el medio", !m.includes("briel.vasquez"));
  check("un local corto también se esconde", !enmascararCorreo("ana@finca.co").includes("ana@"));
  check("un valor sin arroba no revienta", enmascararCorreo("basura") === "•••");
}

// ── 5. La contraseña nueva: las MISMAS reglas del cambio forzado ────────────
check("no coinciden → error", validarContrasena("contrasenalarga", "otra", "ana@finca.co") !== null);
check("demasiado corta → error", validarContrasena("corta1", "corta1", "ana@finca.co") !== null);
check("el mínimo es el declarado", MINIMO_CONTRASENA === 10);
check(
  "no puede contener el usuario",
  validarContrasena("ana-la-mejor-clave", "ana-la-mejor-clave", "ana@finca.co") !== null
);
check("una buena pasa", validarContrasena("caficultura2026", "caficultura2026", "ana@finca.co") === null);
check(
  "un usuario de 1-2 letras no bloquea media contraseña",
  validarContrasena("montaña-verde-9", "montaña-verde-9", "a@finca.co") === null
);

// ── 6. Las puertas: identificadores, nunca destinos ─────────────────────────
check("hay once puertas", Object.keys(PUERTAS).length === 11);
check("una puerta conocida se acepta", esPuerta("kaffetal-regal"));
check("una desconocida NO", !esPuerta("inventada"));
check("una URL NO es una puerta — esto es lo que impide el redirect abierto", !esPuerta("https://sitio-falso/login"));
check("ni un intento de contaminar el prototipo", !esPuerta("constructor") && !esPuerta("__proto__"));
check("lo ilegible cae en la puerta por defecto", puertaDe("https://sitio-falso") === "kaffetal-regal");
check("y lo ausente también", puertaDe(undefined) === "kaffetal-regal");
for (const [id, p] of Object.entries(PUERTAS)) {
  check(`«${id}»: el camino empieza por la ruta (lo que hace correcto a hrefPuerta)`, p.camino.startsWith(p.ruta));
  check(`«${id}»: tiene nombre legible`, typeof p.nombre === "string" && p.nombre.length > 2);
  check(`«${id}»: en dev el volver es relativo`, hrefPuerta(id, false).startsWith("/"));
  check(`«${id}»: en prod el volver es absoluto y de ctcexport.com`, /^https:\/\/[a-z0-9.-]+\.ctcexport\.com/.test(hrefPuerta(id, true)));
  check(`«${id}»: el enlace de recuperación apunta a la superficie compartida`, hrefRecuperar(id).startsWith(RUTA_RECUPERAR + "?"));
}
// La comprobación que de verdad importa, y que faltaba en la V5.12: no basta
// con que la URL de producción sea absoluta y de ctcexport.com — tiene que
// SERVIR la pantalla de la puerta. Así que se simula lo que hace `proxy.ts`
// (antepone la base del subdominio a cualquier camino que no la lleve ya) y se
// exige que el resultado sea exactamente `camino`.
//
// Sin esto, `panel` pasaba: su href era `https://www.ctcexport.com` —absoluto,
// del dominio correcto— y aterrizaba en la portada de CTC Home en vez de en
// `/login`. Detectado en la verificación en vivo, no por el guardián.
for (const [id, p] of Object.entries(PUERTAS)) {
  const url = new URL(hrefPuerta(id, true));
  const sub = url.hostname.split(".")[0];
  const base = SUBDOMAIN_ROUTES[sub];
  const pedido = url.pathname;
  const servido = !base || pedido === base || pedido.startsWith(base + "/")
    ? pedido
    : `${base}${pedido === "/" ? "" : pedido}`;
  check(`«${id}»: la URL de producción SIRVE su puerta (${servido} === ${p.camino})`, servido === p.camino);
}

check("los cinco nodos de socio tienen puerta", ["centro-calidad", "agente-carga", "agente-nacionalizacion", "master-roaster", "estudio-contenido"].every((s) => esPuerta(`socios-${s}`)));
check("Herramientas apunta a su pantalla de acceso, no a la portada", PUERTAS.herramientas.camino === "/herramientas/acceso");
check("Cherry Picked apunta a la TIENDA, que es donde está su login", PUERTAS["cherry-picked"].ruta === "/cherry-picked-green");
check("el vale dura lo que dice la pantalla", MINUTOS_DEL_VALE === 60);

// ── 7. Las once puertas enlazan de verdad ──────────────────────────────────
{
  const doors = [
    ["src/components/kaffetal-regal/LoginModal.tsx", "kaffetal-regal"],
    ["src/components/cherry-picked/LoginModal.tsx", "cherry-picked"],
    ["src/components/directorio/Login.tsx", "directorio"],
    ["src/components/terratalento/TerratalentoExperience.tsx", "terratalento"],
    ["src/app/herramientas/acceso/AccesoTaller.tsx", "herramientas"],
    ["src/app/login/page.tsx", "panel"],
  ];
  for (const [ruta, id] of doors) {
    const src = lee(ruta);
    check(`${ruta} enlaza la recuperación`, src.includes("hrefRecuperar"));
    check(`${ruta} declara su puerta («${id}»)`, src.includes(`hrefRecuperar("${id}")`));
  }
  const socios = lee("src/app/socios/[partner]/acceso/PartnerLoginForm.tsx");
  check("los nodos de socio enlazan con su slug", socios.includes("hrefRecuperar(`socios-${slug}`)"));
  const cp = lee("src/components/cherry-picked/LoginModal.tsx");
  for (const idioma of ["Forgotten your password?", "¿Olvidaste tu contraseña?", "Passwort vergessen?"]) {
    check(`Cherry Picked traduce el enlace: «${idioma}»`, cp.includes(idioma));
  }
}

// ── 8. La superficie se sirve desde la RAÍZ en todos los hosts ──────────────
{
  const proxy = lee("src/proxy.ts");
  check("el proxy conoce la lista de rutas de raíz compartida", proxy.includes("RAIZ_COMPARTIDA"));
  check("y «/recuperar-acceso» está en ella", proxy.includes('"/recuperar-acceso"'));
  check("la exclusión se aplica al calcular la reescritura", proxy.includes("!esRaizCompartida(path)"));
  check(
    "la comparación es por frontera de segmento, no por prefijo de cadena",
    proxy.includes('path.startsWith(r + "/")')
  );
}

// ── 9. La mecánica no se saltó ninguna de sus reglas ───────────────────────
{
  const mec = lee("src/lib/auth/recuperacion.ts");
  check("el vale se guarda HASHEADO, nunca en claro", mec.includes("hashVale") && mec.includes('createHash("sha256")'));
  check("el vale es criptográfico, no un Math.random", mec.includes("randomBytes(32)") && !mec.includes("Math.random"));
  check("pedir uno nuevo quema los anteriores", mec.includes('.is("consumed_at", null)') && mec.includes("consumed_at: new Date"));
  check("hay tope de emisiones por ventana", mec.includes("MAX_VALES_POR_VENTANA"));
  check("el canje confirma el correo de paso", mec.includes("email_confirm: true"));
  check("y limpia el cambio forzado del panel", mec.includes("must_change_password: false"));
  check("el canje deja rastro en el audit_log", mec.includes("password_recovered"));

  const acc = lee("src/app/recuperar-acceso/actions.ts");
  check("un envío fallido NO se reporta como éxito", acc.includes("anularVale"));
  check("y devuelve el vale para no quemar un intento", acc.includes("if (!envio.ok)"));
  check("las acciones no lanzan: todo rechazo vuelve como estado", !/\bthrow new\b/.test(acc));
  check("el enlace se firma con el host de la petición", acc.includes("origenDeLaPeticion"));
  check(
    "la contraseña se valida contra el correo REAL de la cuenta, no contra el formulario",
    acc.includes("validarContrasena(nueva, confirmacion, vivo.correo)")
  );

  const pag = lee("src/app/recuperar-acceso/page.tsx");
  check("la página sanea el ?puerta= antes de usarlo", pag.includes("puertaDe("));
  check("y NO acepta un ?volver= con destino libre", !pag.includes("volver?:") && !pag.includes("searchParams.volver"));
}

// ── 10. Ninguna clase de CSS module usada se quedó sin definir ─────────────
{
  const css = lee("src/app/recuperar-acceso/recuperar.module.css");
  const definidas = new Set([...css.matchAll(/^\.([a-zA-Z][\w-]*)/gm)].map((m) => m[1]));
  for (const archivo of [
    "src/app/recuperar-acceso/SolicitarAcceso.tsx",
    "src/app/recuperar-acceso/[token]/NuevaContrasena.tsx",
  ]) {
    const src = lee(archivo).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of src.matchAll(/\bpropios\.([a-zA-Z][\w]*)/g)) {
      check(`${archivo}: la clase «${m[1]}» existe en recuperar.module.css`, definidas.has(m[1]));
    }
  }
  const tt = lee("src/components/terratalento/terratalento.module.css");
  check("Terratalento define la clase .olvide que su enlace usa", /^\.olvide\b/m.test(tt));
}

if (fallos.length) {
  console.error(`✗ qa-recuperacion: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-recuperacion: ${ok} comprobaciones OK, 0 fallos`);
