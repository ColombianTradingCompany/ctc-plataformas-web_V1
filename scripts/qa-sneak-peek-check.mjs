// Guardián del «Active Catalogue Sneak Peek».
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-sneak-peek-check.mjs
//
// Vigila las promesas del módulo, que son promesas de NEGOCIO y no de estilo:
//   1. Que por la cinta no pueda salir NADA comercial. La cinta se enseña sin
//      sesión en siete superficies; el día que alguien añada un precio «solo para
//      la tarjeta», esto falla.
//   2. Que la cinta enseñe lotes REALES (V5.198, owner 2026-10-10): los que llegaron
//      al Triage de Catálogo Activo, leídos de una vista estrecha que lee `anon`
//      (`public_lot_vitrina`). Los siete lotes mock de la temporada anterior (V4.x)
//      se retiraron con sus fotos, sus ruedas, sus fichas en PDF y sus generadores,
//      y no pueden volver por la puerta de atrás.
//   3. Que la tarjeta que se voltea siga siendo usable y accesible (las maquetas del
//      owner del 2026-08-17), con el reverso de la V5.198: la telaraña del CVA, las
//      notas con su ícono y el Dossier público.
//
// No levanta la aplicación ni toca la base: son comprobaciones sobre el texto de
// los archivos que montan el módulo y sobre la migración de la vista. Mismo patrón
// que `qa-nav-check.mjs`, por el mismo motivo — lo que hay que proteger es una
// regla, y una regla se comprueba aquí y no a ojo.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

let ok = 0;
const fallos = [];
const check = (nombre, cond) => (cond ? ok++ : fallos.push(nombre));

const lee = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const existe = (ruta) => existsSync(new URL(`../${ruta}`, import.meta.url));
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const LIB = lee("src/lib/catalogo/sneakPeek.ts");
const VISTA = lee("src/lib/catalogo/vitrinaVista.ts");
const VITRINA = lee("src/lib/catalogo/vitrina.ts");
const SQL = lee("docs/migraciones/2026-10-10_vitrina_publica.sql");
const RUTA_API = lee("src/app/api/catalogo/sneak-peek/route.ts");
const RUTA_FOTO = lee("src/app/api/catalogo/foto/[referencia]/route.ts");
const COMPONENTE = lee("src/components/catalogo/SneakPeek.tsx");
const RADAR = lee("src/components/catalogo/RadarCvaTarjeta.tsx");
const TIENDA = lee("src/components/cherry-picked/CherryPickedExperience.tsx");
const POPUP = lee("src/components/catalogo/CatalogoPopup.tsx");
const CAAS = lee("src/components/services/CaasLanding.tsx");
const CSS = lee("src/components/catalogo/SneakPeek.module.css");

// ── 1. Nada comercial en el tipo que viaja al navegador ──────────────────────
// La garantía es estructural: si el tipo no tiene dónde meter un precio, no hay
// descuido posible. Se mira el bloque del tipo, no todo el archivo (los
// comentarios NOMBRAN esos campos justamente para explicar que están fuera).
const bloqueTipo = LIB.slice(LIB.indexOf("export type SneakPeekLot = {"), LIB.indexOf("export type SneakPeekPayload"));
check("se encontró el tipo SneakPeekLot", bloqueTipo.length > 200);
const PROHIBIDOS = ["price", "precio", "moq", "unit_kg", "unitKg", "total_kg", "totalKg", "kg", "sold", "deposit", "anticipo", "arrival", "transparency", "eur", "cop", "fob", "ancla", "op", "productor", "producer", "lat", "lng", "datasheet"];
for (const campo of PROHIBIDOS) {
  check(`el tipo SneakPeekLot no declara «${campo}»`, !new RegExp(`^\\s*${campo}[?]?\\s*:`, "im").test(bloqueTipo));
}

// ── 2. Solo lee la vista pública estrecha de la vitrina (V5.198) ────────────
check("la vista se llama `public_lot_vitrina` y vive en un módulo sin imports", /export const VISTA_VITRINA = "public_lot_vitrina";/.test(VISTA) && !/^import\s/m.test(VISTA));
check("la cinta lee ESA vista con el cliente anónimo", LIB.includes("createEphemeralClient()") && LIB.includes("supabase.from(VISTA_VITRINA).select(COLUMNAS_VITRINA)"));
check("y no lee `lots`, `fincas` ni el catálogo de la tienda", !LIB.includes('.from("lots")') && !LIB.includes('.from("fincas")') && !LIB.includes('.from("lot_listings")') && !LIB.includes('.from("public_transparency_pricing")'));
{
  const columnas = /COLUMNAS_VITRINA =\s*"([^"]+)"/.exec(VISTA)?.[1].split(",").map((c) => c.trim()) ?? [];
  check(`las columnas de la vista son de exhibición (${columnas.length})`, columnas.length >= 15 && columnas.includes("referencia") && columnas.includes("en_catalogo") && columnas.includes("tiene_foto"));
  const malas = columnas.filter((c) => /datasheet|lat|lng|poligono|polygon|producer|productor|nit|precio|price|fob|kg|ancla|op_pct|phone|email/i.test(c));
  check(`y ninguna es privada ni comercial${malas.length ? ` (${malas.join(", ")})` : ""}`, malas.length === 0);
}
check("la taza se lee DESPUÉS de la compuerta, solo para esos lotes, y solo la que rige", LIB.includes("const tazas = await tazasDe(vivas.map((f) => f.lot_id));") && LIB.includes('.eq("status", "accepted")') && LIB.includes('.eq("rige_grado", true)'));
check("y se reduce a lo que pinta el reverso: los 8 del CVA y las notas con su intensidad", LIB.includes("cifras.cva.length === 8 ? cifras.cva.map((x) => ({ k: x.k, v: x.v })) : null") && LIB.includes(".map((x) => ({ id: x.id, intensidad: x.intensidad }))"));
check("Tyrian queda fuera del teaser (es solo de subasta)", LIB.includes('=== "tyrian"'));

// La vista misma (la migración): quién entra, qué sale y quién la lee.
check("vista: solo galardonados con grado, sin Tyrian", SQL.includes("where l.stage = 'galardonado'") && SQL.includes("and l.grade <> 'tyrian'"));
check("vista: solo lo que llegó al Triage (trato por ventana vigente, declaración viva o partida libre del Stock CTCx)", SQL.includes("c.status = 'active' and c.ventana_tipo is not null") && SQL.includes("cf.estado = 'declarada'") && SQL.includes("p.anulada_at is null and not p.comprometido") && SQL.includes("and (ct.lot_id is not null or d.lot_id is not null or s.lot_id is not null);"));
check("vista: del `datasheet` solo sale el nombre del producto y la BANDERA de la foto", (SQL.match(/l\.datasheet/g) ?? []).length === 3 && SQL.includes("l.datasheet ->> 'product_name'") && SQL.includes("as tiene_foto"));
check("vista: un lote de CTCx Selection no devuelve su finca ni su foto (D3.1)", SQL.includes("case when cm.lot_id is null then f.name end as finca_name") && /cm\.lot_id is null\s+and \(f\.profile_photo_asset_id/.test(SQL));
check("vista: la lee anon SOLO en lectura", SQL.includes("revoke all on public.public_lot_vitrina from public, anon, authenticated;") && SQL.includes("grant select on public.public_lot_vitrina to anon, authenticated, service_role;"));

// ── 3. Las rutas públicas ────────────────────────────────────────────────────
check("la ruta sirve el payload de la librería", RUTA_API.includes("getSneakPeekPayload"));
check("la ruta no se congela en el build", RUTA_API.includes('export const dynamic = "force-dynamic"'));
check("la ruta cachea en el CDN", /s-maxage=\d+/.test(RUTA_API));
check("la foto pasa por la compuerta (la vista) y sale recortada en WebP, nunca la URL firmada", RUTA_FOTO.includes("fotoDeLaVitrina(referencia)") && RUTA_FOTO.includes('"content-type": "image/webp"') && VITRINA.includes("const fila = await filaDeLaVitrina(referencia);\n  if (!fila || !fila.tiene_foto || fila.ctc_selection) return null;") && VITRINA.includes(".webp({ quality: 74 })") && !/return url/.test(VITRINA));
check("la tarjeta pide la foto a esa ruta (cuelga de /api, que el proxy excluye)", LIB.includes("fila.tiene_foto ? `/api/catalogo/foto/${fila.referencia}` : undefined"));

// ── 4. El componente no se cae solo y respeta el movimiento reducido ─────────
// V5.199: sin cinta (falló la petición o aún no hay lotes en el Triage) no se dibuja una cinta hueca, pero «Find my Lot» se queda.
check("si la petición falla o no hay lotes, no se dibuja la cinta: solo «Find my Lot»", COMPONENTE.includes("if (failed || (data && data.lots.length === 0)) {") && /if \(failed \|\| \(data && data\.lots\.length === 0\)\) \{\s*return \(\s*<section[\s\S]{0,400}<FindMyLot lang=\{lang\} \/>/.test(COMPONENTE));
check("respeta prefers-reduced-motion", CSS.includes("prefers-reduced-motion"));
check("la cinta no vuelve a depender de una animación CSS", !CSS.includes("@keyframes sp-slide"));
check("la mueve un bucle de rAF sobre translate3d", COMPONENTE.includes("requestAnimationFrame") && COMPONENTE.includes("translate3d"));
check("la velocidad se PERSIGUE, no se asigna de golpe", COMPONENTE.includes("velRef.current +="));

// ── 5. Los mock se retiraron de verdad (V5.198) ─────────────────────────────
check("no existe `sneakPeekMock.ts`", !existe("src/lib/catalogo/sneakPeekMock.ts"));
check("ni sus fotos y ruedas, ni sus fichas en PDF", !existe("public/images/catalogo/sneak-peek") || readdirSync(new URL("../public/images/catalogo/sneak-peek", import.meta.url)).length === 0);
check("ni las fichas en PDF de los mock", !existe("public/docs/fichas-mock") || readdirSync(new URL("../public/docs/fichas-mock", import.meta.url)).length === 0);
check("ni sus generadores", !existe("scripts/build-fichas-mock.mjs") && !existe("scripts/build-ruedas-mock.mjs") && !existe("scripts/lib/analisis-intrinseco.mjs"));
{
  // Ningún literal «mock-lote» entrecomillado en todo `src` (un dato mock que volviera por otro archivo).
  const enSrc = [];
  const recorre = (dir) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) recorre(p);
      else if (/\.(ts|tsx)$/.test(n) && /["']mock-lote/.test(readFileSync(p, "utf8"))) enSrc.push(p);
    }
  };
  recorre(fileURLToPath(new URL("../src", import.meta.url)));
  check(`ningún archivo de src trae datos mock («mock-lote» entrecomillado)${enSrc.length ? `: ${enSrc.join(", ")}` : ""}`, enSrc.length === 0);
}
check("la cinta ya no rellena con mock ni lleva rótulo de temporada", !LIB.includes("SNEAK_PEEK_MOCK") && !/^\s*season[?]?\s*:/m.test(bloqueTipo) && !/^\s*mock[?]?\s*:/m.test(bloqueTipo));

// ── 6. La compuerta del catálogo en la tienda (decisión D0.5) ────────────────
// El catálogo completo solo con sesión: `loadCatalog()` no puede volver a
// correr para un visitante anónimo.
const efecto = TIENDA.slice(TIENDA.indexOf("supabase.auth.getSession()"), TIENDA.indexOf("onAuthStateChange"));
const guarda = efecto.indexOf("if (!data.session?.user) return;");
const carga = efecto.indexOf("loadCatalog()");
check("el efecto de arranque tiene la guarda de sesión", guarda !== -1);
check("`loadCatalog()` va después de la guarda, nunca antes", carga !== -1 && carga > guarda);
check("la parrilla (Grados/Black) se pinta solo con sesión", /\{userId \? \(\s*<>\s*<GradosSection/.test(TIENDA));
check("el visitante recibe la cinta en ese sitio", TIENDA.includes("<SneakPeek"));
check("la cinta hereda el ancla `grados` de la parrilla", TIENDA.includes('id="grados"'));
check("al cerrar sesión se vacían los lotes", TIENDA.includes("setLots([])"));
check("sin sesión el índice no ofrece la sección Black, que no existe", TIENDA.includes('t.quickNav.filter((s) => s.id !== "black")'));

// ── 7. La tarjeta de un lote real (V5.198) ───────────────────────────────────
check("«Próximamente» en la foto de un lote que todavía no está declarado en el Catálogo Activo", COMPONENTE.includes("{!lot.inCatalogue && <span className={styles.seasonTag}>{t.proximamente}</span>}"));
check("el puntaje lleva el protocolo del Punto (CVA o SCA), no un «SCA» fijo ni un «est.»", COMPONENTE.includes("<i className={styles.sca}>{lot.scoreProtocol}</i>") && !COMPONENTE.includes("scoreEstimated"));
check("las notas de la cara son las que marcó el Q-Grader, en el idioma de la página", COMPONENTE.includes('const notas = lot.notes.slice(0, 5).map((x) => nombreDeNota(x.id, lang)).join(" · ");') && COMPONENTE.includes('descriptorLabel(id, lang === "de" ? "en" : lang)'));
check("la foto de una finca no da un segundo rodeo por el optimizador", COMPONENTE.includes('unoptimized={lot.image.startsWith("/api/")}'));

// ── 8. La tarjeta que se voltea: accesibilidad ──────────────────────────────
check("la cara delantera es un botón con aria-expanded", COMPONENTE.includes("aria-expanded={volteada}"));
check("Escape cierra la tarjeta abierta", COMPONENTE.includes('e.key === "Escape"'));
check("la cinta se para con una tarjeta abierta", /objetivoVelRef.current = volteada[\s\S]{0,40}\? 0/.test(COMPONENTE));
check("el sentido por defecto es hacia la derecha", /const BASE = \d+;/.test(COMPONENTE) && !/const BASE = -/.test(COMPONENTE));
check("la copia del bucle no recibe foco", COMPONENTE.includes("tabIndex={duplicada ? -1 : undefined}"));
check("el enlace del Dossier no voltea la tarjeta al pulsarlo", COMPONENTE.includes("e.stopPropagation()"));
check("el Dossier se abre en otra pestaña sin ceder la ventana", COMPONENTE.includes('rel="noopener"'));
check("el volteo respeta prefers-reduced-motion", CSS.includes(".inner{transition:none}"));

// ── 9. El reverso: la telaraña del CVA, las notas con ícono y el Dossier público (V5.198) ──
check("el reverso pinta la telaraña de 8 esquinas del CVA (no la de los diez atributos SCA de los mock)", COMPONENTE.includes("<RadarCvaTarjeta valores={lot.cva} lang={lang} />") && !COMPONENTE.includes("RadarIntrinseco") && !existe("src/components/catalogo/RadarIntrinseco.tsx"));
check("la telaraña de la tarjeta: octógono de cara plana, de 1 a 9, con los colores del tema", RADAR.includes("const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2 + Math.PI / n;") && RADAR.includes("const MIN = 1;") && RADAR.includes("const MAX = 9;") && RADAR.includes("styles.radarFigura") && ["es:", "en:", "de:"].every((k) => RADAR.includes(k)));
check("las notas del reverso llevan su ícono (el de la rueda), su intensidad en casillas y su valor", COMPONENTE.includes("<IconoDeNota id={x.id} size={24} strokeWidth={1.8} />") && COMPONENTE.includes("<BarraDeIntensidad valor={x.intensidad} color={color} />") && COMPONENTE.includes("fmtIntensidad(x.intensidad, lang)"));
check("ya no hay rueda de imagen ni ficha técnica en el reverso", !COMPONENTE.includes("styles.wheelBox") && !COMPONENTE.includes("datasheetUrl"));
check("el botón del reverso abre el Dossier público, ABSOLUTO contra la casa matriz", COMPONENTE.includes("const PORTAL_BASE = process.env.NODE_ENV === \"development\" ? \"\" : origenDeSuperficie(RUTA_PORTAL);") && COMPONENTE.includes('href={`${PORTAL_BASE}${lot.dossierPath}${lang === "es" ? "" : "?lang=en"}`}') && LIB.includes("dossierPath: rutaDelLote(fila.referencia)"));
check("y va al pie del reverso", COMPONENTE.includes("className={`${styles.ficha} ${styles.fichaAlPie}`}") && CSS.includes(".fichaAlPie{margin-top:auto}") && CSS.includes(".ficha{") && CSS.includes("margin:10px auto 4px"));
check("el reverso no repite el puntaje", !/styles\.scoreRow/.test(COMPONENTE));

// ── 10. Las flechas de los extremos ─────────────────────────────────────────
check("hay flecha a cada lado", COMPONENTE.includes("styles.flechaIzq") && COMPONENTE.includes("styles.flechaDer"));
// V5.201: el «pasar por encima» es SOLO del ratón, y el foco solo acelera si es de teclado: el toque de un dedo dejaba la flecha
// «encima» o enfocada y la cinta se quedaba acelerando.
check("aceleran con el ratón (solo el ratón) Y con el foco de teclado", COMPONENTE.includes('onPointerEnter={(e) => e.pointerType === "mouse" && setImpulso(lado)}') && COMPONENTE.includes("onFocus={(e) => focoDeTeclado(e.currentTarget) && setImpulso(lado)}") && COMPONENTE.includes('return el.matches(":focus-visible");') && !COMPONENTE.includes("onMouseEnter"));
check("y sueltan al salir", COMPONENTE.includes('onPointerLeave={(e) => e.pointerType === "mouse" && setImpulso(null)}') && COMPONENTE.includes("onBlur={() => setImpulso(null)}"));
check("la flecha izquierda invierte el sentido", COMPONENTE.includes('impulso === "izq"') && COMPONENTE.includes("-RAPIDO"));
check("las flechas llevan rótulo accesible", COMPONENTE.includes("t.flechaAnterior") && COMPONENTE.includes("t.flechaSiguiente"));

// ── 11. La ventana del catálogo ─────────────────────────────────────────────
check("el pie abre la ventana en vez de navegar", COMPONENTE.includes("setPopup(true)"));
check("la ventana explica que el catálogo vive en Cherry Picked", /Cherry Picked/.test(POPUP));
check("y que registrarse es GRATIS", /gratis|free|kostenlos/i.test(POPUP));
check("la ventana está en los tres idiomas", ["es:", "en:", "de:"].every((k) => POPUP.includes(k)));
check("en las superficies CP el botón abre el login sin navegar", POPUP.includes("onOpenLogin"));

// ── 12. La landing de CaaS monta el módulo ──────────────────────────────────
check("CaaS monta la cinta", CAAS.includes("<SneakPeek"));
check("y la monta ENTRE «las dos clases» y «Dónde encaja»", CAAS.indexOf("{chrome.offerH2}") < CAAS.indexOf("<SneakPeek") && CAAS.indexOf("<SneakPeek") < CAAS.indexOf("{chrome.modelosH2}"));

// ── 13. Centrar y crecer al abrir (owner, 2026-08-17) ───────────────────────
check("al pulsar se centra la tarjeta antes de voltearla", COMPONENTE.includes("centrarYVoltear"));
check("el destino se calcula con el centro de la cinta", COMPONENTE.includes("cinta.clientWidth / 2 - centroTarjeta"));
check("se elige la copia más cercana de la tarjeta", COMPONENTE.includes("while (destino - posRef.current > w / 2)"));

// ── 14. El dedo (owner, 2026-10-10, V5.201) ─────────────────────────────────
// «En móvil, que el carrusel siga moviéndose por defecto de izquierda a derecha, pero si se interactúa con él, se transforma
// para moverse con el dedo de lado a lado. Después de 20 segundos de inactividad se vuelve a mover solo como al principio.»
{
  const motor = COMPONENTE.slice(COMPONENTE.indexOf("const paso = (ahora: number) => {"), COMPONENTE.indexOf("raf = requestAnimationFrame(paso);\n    };"));
  const iDestino = motor.indexOf("if (destinoRef.current !== null) {");
  const iDedo = motor.indexOf("} else if (arrastreRef.current?.movido) {");
  const iManual = motor.indexOf("} else if (manualRef.current) {");
  const iSola = motor.indexOf("} else if (!reducido) {");
  check("dedo · los 20 s de inactividad, en una constante", COMPONENTE.includes("const INACTIVIDAD_MS = 20_000;"));
  check("dedo · la cinta escucha al puntero (apoyar, mover, soltar, cancelar) y se traga el clic de un arrastre", COMPONENTE.includes("onPointerDown={alApoyar}") && COMPONENTE.includes("onPointerMove={alMover}") && COMPONENTE.includes("onPointerUp={(e) => alSoltar(e, false)}") && COMPONENTE.includes("onPointerCancel={(e) => alSoltar(e, true)}") && COMPONENTE.includes("if (performance.now() < sinClicHastaRef.current) {") && COMPONENTE.includes("sinClicHastaRef.current = performance.now() + 400;"));
  check("dedo · el ratón no arrastra (escritorio igual que antes) y con movimiento reducido manda el scroll nativo", COMPONENTE.includes('if (e.pointerType === "mouse" || movimientoReducido()) return;'));
  check("dedo · solo es arrastre si el dedo se corre en HORIZONTAL más que en vertical", COMPONENTE.includes("if (Math.abs(dx0) < UMBRAL_ARRASTRE_PX || Math.abs(dx0) < Math.abs(e.clientY - a.y0)) return;"));
  check("dedo · el motor: centrar, luego el dedo, luego la inercia manual y SOLO después la marcha sola", iDestino > 0 && iDedo > iDestino && iManual > iDedo && iSola > iManual && motor.includes("velRef.current *= Math.exp(-dt * 3.2);"));
  check("dedo · a los 20 s sin tocarla vuelve a andar sola (el reloj apaga el modo manual)", COMPONENTE.includes("relojRef.current = window.setTimeout(() => {\n      manualRef.current = false;\n    }, INACTIVIDAD_MS);"));
  check("dedo · bajar por la página pasando por la cinta NO la para (un cancelado sin arrastre no es tocarla)", COMPONENTE.includes("} else if (!cancelado) {") && /@media\(prefers-reduced-motion:no-preference\)\{\s*\.cinta\{touch-action:pan-y\}/.test(CSS));
  check("dedo · en táctil una flecha desliza la cinta una tarjeta hacia su lado", COMPONENTE.includes('} else if (ultimoPunteroRef.current !== "mouse") {\n                  empujarUnaTarjeta(lado);') && COMPONENTE.includes('destinoRef.current = posRef.current + (lado === "der" ? paso : -paso);'));
  check("dedo · el reloj no sobrevive al módulo", COMPONENTE.includes("return () => window.clearTimeout(reloj.current);"));
}
check("y se voltea solo AL LLEGAR", COMPONENTE.includes("alLlegarRef.current = () => setVolteada"));
check("el bucle no envuelve mientras centra", COMPONENTE.includes("if (destinoRef.current === null) {"));
check("la tarjeta abierta crece un 15 %", CSS.includes(".flipped{transform:scale(1.15)"));
check("y se pone por encima de sus vecinas", /\.flipped\{[^}]*z-index/.test(CSS));

// ── 15. La cara, según las maquetas del owner (2026-08-17) ──────────────────
check("«Ver detalle» va sobre la foto", COMPONENTE.includes("styles.verDetalle") && /\.verDetalle\{\s*position:absolute/.test(CSS));
check("la cara lleva el sello del grado a tamaño legible", COMPONENTE.includes("styles.sello") && /\.sello\{width:72px/.test(CSS));
check("la cara lleva el puntaje, la finca y el municipio", COMPONENTE.includes("styles.frontFoot") && COMPONENTE.includes("styles.finca"));
check("la cara lleva variedad y altitud", COMPONENTE.includes("lot.variety, lot.altitudeM != null"));

// ── 16. El componente de cliente no arrastra el módulo `server-only` ─────────
// ⚠️ Importar un VALOR desde `lib/catalogo/sneakPeek.ts` (que es `server-only`) mete Supabase en el paquete del cliente y tumba la
// página con un 500 que `tsc --noEmit` NO ve. Del módulo solo se toman TIPOS.
for (const [n, f] of [["SneakPeek.tsx", COMPONENTE], ["RadarCvaTarjeta.tsx", RADAR]]) {
  const imports = [...f.matchAll(/^import (type )?\{[^}]*\} from "@\/lib\/catalogo\/sneakPeek";/gm)];
  check(`${n} importa de sneakPeek.ts solo TIPOS`, imports.every((m) => m[1] === "type "));
}
check("la cinta lee la vista desde un módulo sin `sharp` ni el cargador del dossier", LIB.includes('from "./vitrinaVista";') && !LIB.includes('from "./vitrina";'));

// ── D3.1 · la vitrina de un lote comprado en firme (V4.28) ───────────────────
// El owner decidió el 2026-08-18 que un lote que CTC compra sale en las tarjetas a nombre de CTC, SIN tocar su finca real. La vista
// NO devuelve el nombre de la finca en ese caso (§2) y el rótulo sale del perfil de CTCx Selection (`rotuloCtcx` → `legal.ts`).
{
  const perfil = lee("src/lib/catalogo/perfilCtcx.ts");
  check("la cinta pide ctc_selection a la vista", VISTA.includes("ctc_selection") && LIB.includes("fila.ctc_selection"));
  check("la tienda pide ctc_selection a la vista", TIENDA.includes("ctc_selection"));
  check("el rótulo de CTC sale del perfil de CTCx Selection en la cinta (rotuloCtcx → legal.ts), no escrito a mano", LIB.includes("rotuloCtcx(perfil)") && !/finca:\s*["'`]C(TC|olombian)/.test(LIB) && perfil.includes('from "@/lib/legal"') && /return nombre \|\| CTC_RAZON/.test(perfil));
  check("y en la tienda, el mismo rótulo", TIENDA.includes("rotuloCtcx(perfil)"));
  check("ningún componente escribe la razón social a mano", !LIB.includes('"Colombian Trading Company"') && !TIENDA.includes('"Colombian Trading Company"'));
  check("la vitrina sigue enseñando CTC en vez de la finca cuando el lote es de CTC Selection", /ctc_selection\s*\?\s*rotuloCtcx\(perfil\)/.test(TIENDA) && /ctc_selection\s*\?\s*rotuloCtcx\(perfil\)/.test(LIB));
}

// ── La promesa pública y lo que la tarjeta enseña, ATADAS ──────────────────
// El Manifiesto, en su pilar 01, promete «finca, personas, proceso y evaluación, verificables lote a lote» y dice DÓNDE: en la
// ficha técnica (hoy el Dossier público, V5.198) y en la DDS. Quitarle el «dónde» al pilar deja una promesa que la tarjeta no
// cumple; devolver la finca a la tarjeta de un lote de CTC rompe D3.1.
{
  const manifiesto = lee("src/components/cherry-picked/ManifiestoSection.tsx");
  check("manifiesto ES: el pilar 01 dice dónde (ficha técnica y DDS)", /verificables lote a lote en la ficha técnica y en la DDS/.test(manifiesto));
  check("manifiesto EN: el pilar 01 dice dónde (datasheet and DDS)", /verifiable lot by lot on the datasheet and the DDS/.test(manifiesto));
  check("manifiesto DE: el pilar 01 dice dónde (Datenblatt und DDS)", /überprüfbar — im Datenblatt und in der DDS/.test(manifiesto));
  check("y queda escrito por qué el pilar dice dónde", manifiesto.includes("EL PILAR 01 DICE DÓNDE SE VERIFICA"));
}

// Solo comprueba que el código no contiene los nombres en ejecución (los comentarios pueden contar la historia).
check("ninguna lectura de la vista vieja de la tienda en la cinta", !sinComentarios(LIB).includes("public_lot_catalog"));

console.log(`${ok} comprobaciones OK, ${fallos.length} fallos`);
for (const f of fallos) console.log("  FALLO:", f);
process.exit(fallos.length ? 1 : 0);
