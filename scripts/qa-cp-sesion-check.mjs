// Guardián del LOGIN DE CHERRY PICKED y de lo que ve el comprador con sesión (V6.3, objetivo 3 de docs/PLAN_V6_OBJETIVOS.md:
// tanda A entera, y lo de B y D que no espera decisión del owner).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-cp-sesion-check.mjs
//
// GRATIS y sin red: lee las fuentes y ejercita lo puro. QUÉ VIGILA:
//   (1) ENTRADA: la cuenta es UNA en la familia — la portada, Roast y X llevan `ProveedorDeCuenta` + `AccesoDeCuenta` en la cabecera, la
//       cinta abre el login en el sitio (`onOpenLogin`), `?login=1` abre la ventana sin sesión (también en la tienda), `?cuenta=1` abre
//       «Mi cuenta», un login fuera de Green aterriza en Green; CTC Home manda a comprar con `?login=1`.
//   (2) CONTINUIDAD: con sesión la tienda CONSERVA la cinta y «Find my Lot» (sin la puerta al login) y pinta la parrilla debajo; el
//       catálogo vacío EXPLICA en vez de quedarse en blanco; «Crear cuenta» avisa la regla productor/comprador y no saca al comprador.
//   (3) LA TARJETA habla el idioma de la vitrina: referencia CTC-L-, Punto con protocolo, foto del lote, Dossier público, «kg de verde»,
//       spot o pre-venta con su llegada; sin finca ni municipio; sin enlaces de demostración; spot Y pre por grado, Black solo en su sección.
//   (4) MI CUENTA: el estado de las muestras y los lotes reservados con su Dossier; la tienda no toca lo que CTC escribe.
//   (5) LO QUE ESPERA AL OWNER SIGUE COMO ESTABA (y queda escrito): 30 % en el carrito y en `place_order` (decisión 7), 350 kg de Black
//       (decisión 8), el pack de muestras (decisión 12), la puja Tyrian con Pintón (decisión 12).

import { readFileSync, existsSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c, detalle = "") => (c ? ok++ : fallos.push(n + (detalle ? ` — ${detalle}` : "")));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const existe = (r) => existsSync(new URL(`../${r}`, import.meta.url));
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");

const SESION = lee("src/components/cherry-picked/sesion.tsx");
const TIENDA = lee("src/components/cherry-picked/CherryPickedExperience.tsx");
const MODAL = lee("src/components/cherry-picked/LoginModal.tsx");
const FAM = lee("src/components/cherry-picked/FamilyHeader.tsx");
const HUB = lee("src/components/cherry-picked-hub/HubLanding.tsx");
const ROAST = lee("src/components/cherry-picked-roast/RoastLanding.tsx");
const X = lee("src/components/cherry-picked-x/XLanding.tsx");
const CINTA = lee("src/components/catalogo/SneakPeek.tsx");
const GRADOS = lee("src/components/cherry-picked/GradosSection.tsx");
const TARJETA = lee("src/components/cherry-picked/LotCard.tsx");
const PERFIL = lee("src/components/cherry-picked/ProfileView.tsx");
const HERO = lee("src/components/cherry-picked/Hero.tsx");
const DATA = lee("src/components/cherry-picked/data.ts");

// ── 1. Entrada ────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  check("1 · existe el proveedor de cuenta de la familia (sesion.tsx) con el hook, el botón y la ventana", existe("src/components/cherry-picked/sesion.tsx") && SESION.includes("export function ProveedorDeCuenta") && SESION.includes("export function AccesoDeCuenta") && SESION.includes("export function useCuenta") && SESION.includes("<LoginModal open={abierta}"));
  check("1 · la cabecera de la familia lleva «Entrar / Mi cuenta»", FAM.includes("<AccesoDeCuenta />") && FAM.includes('import { AccesoDeCuenta } from "./sesion";'));
  for (const [n, src] of [["portada", HUB], ["Roast", ROAST], ["X", X]]) {
    check(`1 · ${n}: envuelta en ProveedorDeCuenta y su cinta abre el login en el sitio`, src.includes("<ProveedorDeCuenta>") && src.includes("</ProveedorDeCuenta>") && src.includes('<SneakPeek lang={lang} variant="cp" onOpenLogin={abrirLogin} />') && src.includes("const { abrirLogin } = useCuenta();"));
  }
  check("1 · `?login=1` abre la ventana sin sesión en la familia y en la tienda", SESION.includes('new URLSearchParams(window.location.search).get("login") === "1"') && TIENDA.includes('if (params.get("login") === "1") setLoginOpen(true);'));
  check("1 · `?cuenta=1` abre «Mi cuenta» en la tienda y «Mi cuenta» de la familia lleva allí", TIENDA.includes('if (params.get("cuenta") === "1") setView("profile");') && SESION.includes("href={`${FAMILY_LINKS.green}?cuenta=1`}"));
  check("1 · un login fuera de Green aterriza en Green", SESION.includes("destinoTrasEntrar = `${FAMILY_LINKS.green}?cuenta=1`") && SESION.includes("window.location.assign(destinoTrasEntrar)"));
  check("1 · CTC Home manda a comprar con la ventana abierta (`?login=1`) y lo explica", lee("src/components/ctc-home/SellBuyCtas.tsx").includes('const CP_URL = "https://cherry-picked.ctcexport.com/?login=1";'));
  check("1 · el callback de Google sigue aterrizando en la tienda", lee("src/app/cherry-picked/auth/callback/route.ts").includes("cherry-picked-green"));
}

// ── 2. Continuidad ────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  check("2 · con sesión la tienda conserva la cinta (y «Find my Lot») sin la puerta al login", TIENDA.includes('{userId && <SneakPeek lang={lang} variant="cp" id="vitrina" conSesion />}') && CINTA.includes("conSesion = false,") && CINTA.includes("{!conSesion && (") && CINTA.includes("<FindMyLot lang={lang} />"));
  check("2 · la parrilla sigue siendo solo con sesión y el visitante sigue recibiendo la cinta con el ancla `grados`", /\{userId \? \(\s*<>\s*<GradosSection/.test(TIENDA) && TIENDA.includes('<SneakPeek lang={lang} variant="cp" onOpenLogin={() => setLoginOpen(true)} id="grados" />'));
  check("2 · el catálogo vacío EXPLICA (y lleva a la vitrina) en los tres idiomas", GRADOS.includes('data-catalogo="vacio"') && GRADOS.includes('href="#vitrina"') && (GRADOS.match(/vacioTitulo:/g) ?? []).length === 3 && (GRADOS.match(/vacioCuerpo:/g) ?? []).length === 3);
  check("2 · «Crear cuenta» avisa la regla productor/comprador en los tres idiomas y enlaza Kaffetal Regal, sin salir de la ventana", (MODAL.match(/aviso:/g) ?? []).length === 3 && MODAL.includes('data-aviso="productor-comprador"') && MODAL.includes("href={KR_HREF}") && MODAL.includes('export function LoginModal({ open, onClose, contexto }'));
  check("2 · el eyebrow del catálogo ya no promete una mitaca en agosto", !/Mitaca arriving in August|Mitaca arribando en agosto|Mitaca kommt im August/.test(GRADOS));
  check("2 · el hero ya no lleva el manifiesto de julio de 2026: es el estado vivo del Catálogo Activo", !/July 2026|Julio 2026|Juli 2026|Season S1|Temporada S1/.test(sinComentarios(HERO)) && HERO.includes('data-tablero="catalogo-activo"') && HERO.includes('fetch("/api/catalogo/sneak-peek")') && HERO.includes("trimestreDe(") && HERO.includes("export function estadoDeLaVitrina"));
  check("2 · la guarda sin sesión de la tienda es una sola (la rama spot/pre murió con la parrilla solo con sesión)", TIENDA.includes("if (delta > 0 && !userId) {") && !TIENDA.includes('!userId && lot.mode === "pre"'));
}

// ── 3. La tarjeta ─────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  check("3 · la tienda lee la vitrina (la misma fila de la cinta y el Dossier) por lot_id", TIENDA.includes("supabase.from(VISTA_VITRINA).select(COLUMNAS_VITRINA)") && TIENDA.includes("vitrinaByLotId.get(r.lot_id)"));
  check("3 · el Lot lleva referencia, Punto, protocolo, foto, Dossier, llegada y anticipo", ["referencia: string | null;", 'protocolo: "CVA" | "SCA" | null;', "foto: string | null;", "dossierHref: string | null;", "arrival: string | null;", "depositPct: number;"].every((c) => DATA.includes(c)));
  check("3 · la referencia CTC-L- manda sobre el código BK-XXXX; el Dossier público es absoluto a la casa matriz", TIENDA.includes("referencia: vitrina?.referencia ?? null,") && TIENDA.includes("dossierHref: vitrina?.referencia ? `${origenDeSuperficie(RUTA_PORTAL)}${rutaDelLote(vitrina.referencia)}` : null,") && TARJETA.includes("const codigo = lot.referencia ?? lot.code;") && TARJETA.includes("href={lot.dossierHref}"));
  check("3 · el Punto va con su protocolo (CVA el principal; SCA 2004 vale lo mismo); el estimado del productor se marca", TARJETA.includes("export function rotuloDelPuntoEnTarjeta") && TARJETA.includes('lot.protocolo === "CVA" ? "CVA" : "SCA 2004"') && TARJETA.includes("t.estimated") && TIENDA.includes("Number(vitrina.punto).toFixed(2)"));
  check("3 · la foto del lote (solo la aprobada por CTCx, por la API de la vitrina) y nunca la finca ni el municipio", TIENDA.includes("foto: vitrina?.tiene_foto && vitrina.referencia ? `/api/catalogo/foto/${vitrina.referencia}` : null,") && !/finca_name|municipio/.test(sinComentarios(TARJETA)) && !/finca_name|municipio/.test(sinComentarios(TIENDA).replace(/regionDeLaVitrina/g, "")));
  check("3 · sin enlaces de demostración (Cupping/Origin/Datasheet con toast)", !/toastCupping|toastOrigin|toastSheet|\(demo\)/.test(TARJETA) && !TARJETA.includes("useToast"));
  check("3 · «kg de verde», spot o pre-venta con su llegada", (TARJETA.match(/green:/g) ?? []).length === 3 && TARJETA.includes("t.arrives(llegada)") && TARJETA.includes("isSpot ? t.spot :") && (TARJETA.match(/perKg:/g) ?? []).length === 3);
  check("3 · spot Y pre-venta por grado; Black solo en su sección (ya no sale dos veces)", GRADOS.includes('const catalogo = lots.filter((l) => l.grade !== "Black");') && !GRADOS.includes('l.mode === "pre"') && lee("src/components/cherry-picked/BlackSection.tsx").includes('lots.filter((l) => l.grade === "Black")'));
  check("3 · la rama «asociados desde 350 kg» para el visitante sin sesión se fue (código muerto)", !/moqAnon/.test(TARJETA));
}

// ── 4. Mi cuenta ──────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  check("4 · el estado de las muestras (ordered · preparado · enviado) se enseña en los tres idiomas", (PERFIL.match(/estadoMuestras:/g) ?? []).length === 3 && PERFIL.includes("t.estadoMuestras(samplePackStatus)") && TIENDA.includes('supabase.from("sample_pack_orders").select("id, status")'));
  check("4 · los lotes reservados con su referencia y su Dossier", PERFIL.includes("data-reservas={reservas.length}") && PERFIL.includes("href={r.dossierHref}") && TIENDA.includes("reservas={lots.filter((l) => (myKg[l.id] ?? 0) > 0).map("));
  check("4 · la tienda sigue sin tocar lo que CTC escribe de las muestras", !/preparado|enviado_at|guia/.test(TIENDA));
}

// ── 5. Lo que espera al owner sigue como estaba ───────────────────────────────────────────────────────────────────────────
{
  check("5 · el anticipo del carrito sigue al 30 % (decisión 7) y la tarjeta no inventa otro", /pre \* 0\.3/.test(DATA) && TARJETA.includes("minTotal * 0.3"));
  check("5 · el MOQ del Black con sesión sigue en 350 kg (decisión 8)", DATA.includes("export const ASSOC_BLACK_MOQ = 350;"));
  check("5 · el pack de muestras y la puja Tyrian con Pintón siguen (decisión 12)", DATA.includes("export const PACK_PRICE = 300;") && PERFIL.includes("tyrianLocked"));
  const plan = lee("docs/PLAN_V6_OBJETIVOS.md");
  check("5 · el plan deja escrito qué cerró la V6.3 y qué sigue esperando decisión", plan.includes("HECHA en la") && plan.includes("V6.3") && plan.includes("espera la decisión 3") && plan.includes("decisión 12"));
}

if (fallos.length) {
  console.error(`✗ qa-cp-sesion: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-cp-sesion: ${ok} comprobaciones OK, 0 fallos`);
