// Guardián de las Subastas Tyrian — la puja del comprador (V5.24).
//
//   node scripts/qa-subastas-check.mjs
//
// «El podio de los mejores, al mejor postor». Lo que hay que proteger:
//
//   · Las tablas (lot_auctions · auction_bids) son service-role-only: el
//     comprador jamás las toca con su sesión — ver y pujar pasan por Server
//     Actions que verifican identidad y nivel (Pintón o superior).
//   · La regla del monto vive en la BASE (guard trigger auction_bids_guard):
//     el action no la reimplementa, solo traduce los errores (mensajePuja).
//   · Las monedas no se mezclan: la puja es EUR/kg; adjudicar NO emite oferta
//     ni contrato — la oferta al productor (COP/kg) se registra en Ofertas.
//   · Solo lotes galardonados Tyrian se subastan; una subasta abierta por lote.
//   · La vitrina (TyrianSection) dejó de ser demo: lee la subasta real.
//   · V5.202 (owner, 2026-10-10): la vitrina Tyrian se ve SIN sesión, y lo público debe «omitir info que haga fácil circumventar a
//     CTCx para llegar al Productor»: ni `lots.name` (solía llevar la finca) ni `finca_name`; el nombre GENERADO (variedades
//     canónicas + proceso · región + año) y la altitud en su tramo de 100 m.

import { readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

const tipos = lee("src/lib/subastas/tipos.ts");
const comprador = lee("src/lib/subastas/buyerActions.ts");
const ocp = lee("src/app/ocp/(app)/subastasActions.ts");
const pagina = lee("src/app/ocp/(app)/subastas/page.tsx");
const cliente = lee("src/app/ocp/(app)/subastas/SubastasClient.tsx");
const seccion = lee("src/components/cherry-picked/TyrianSection.tsx");
const experiencia = lee("src/components/cherry-picked/CherryPickedExperience.tsx");
const perfil = lee("src/components/cherry-picked/ProfileView.tsx");

// ── 1. El comprador: sesión + nivel, todo por service role ────────────────
check("buyerActions es Server Action", comprador.startsWith('"use server"'));
check("pujar exige sesión (createSessionClient + getUser)", /export async function pujar[\s\S]*?createSessionClient\(\)[\s\S]*?auth\.getUser\(\)/.test(comprador));
check("pujar rechaza sin usuario", /if \(!user\) return \{ ok: false/.test(comprador.slice(comprador.indexOf("export async function pujar"))));
check("pujar verifica el nivel (tierAlcanza contra tier_minimo)", comprador.includes("tierAlcanza(tier, auction.tier_minimo"));
check("las tablas se leen/escriben con el service client", comprador.includes("createServiceRoleClient()") && !/session\.from\("(lot_auctions|auction_bids)"\)/.test(comprador));
check("el comprador no toca las tablas con su sesión (Experience)", !experiencia.includes('from("lot_auctions")') && !experiencia.includes('from("auction_bids")'));
check("la regla del monto NO se reimplementa en el action (la base manda)", !/amountEurKg\s*<\s*(lider|minimo|siguiente)/.test(comprador) && comprador.includes("mensajePuja(error.message)"));
check("mensajePuja traduce los errores del trigger", ["SUBASTA_CERRADA", "SUBASTA_VENCIDA", "PUJA_BAJA", "FRACCION_INVALIDA"].every((k) => tipos.includes(k)));
check("la vitrina nunca revela quién puja (solo líder + conteo)", !/buyerName|buyer_name|company_name/.test(comprador) && comprador.includes("pujadores: new Set("));
check("la puja se redondea a céntimos", comprador.includes("Math.round(amountEurKg * 100) / 100"));
check("el ranking de niveles es verde < pinton < maduro", tipos.includes("verde: 0, pinton: 1, maduro: 2"));

// ── 2. CTCx: solo Tyrian galardonado, una abierta por lote, adjudicar informa ─
// V5.57: abrir, cerrar, adjudicar y cancelar EMITEN — exigen nivel admin del OCP; un «viewer» no adjudica.
check("subastasActions es Server Action con gate de admin", ocp.startsWith('"use server"') && (ocp.match(/permisoDeEscritura\("ocp", "emite"\)/g) ?? []).length >= 4);
check("abrir exige galardonado + tyrian", ocp.includes('lot.stage !== "galardonado" || lot.grade !== "tyrian"'));
check("abrir rechaza una segunda subasta abierta", /eq\("status", "abierta"\)\.maybeSingle\(\);\s*if \(open\) return \{ ok: false/.test(ocp));
check("el cierre debe ser futuro", ocp.includes("endsAt.getTime() <= Date.now()"));
check("los snapshots públicos no llevan nada comercial del productor", !/price|precio_cop|producer_id/.test(ocp.slice(ocp.indexOf('from("lot_auctions").insert'), ocp.indexOf('from("lot_auctions").insert') + 700)));
check("adjudicar no cierra una subasta viva", ocp.includes('a.status === "abierta" && new Date(a.ends_at).getTime() > Date.now()'));
check("adjudicar exige pujas vigentes", /if \(!count\) return \{ ok: false/.test(ocp));
check("adjudicar marca ganadoras", /update\(\{ estado: "ganadora" \}\)[\s\S]{0,80}eq\("estado", "vigente"\)/.test(ocp));
check("adjudicar NO emite oferta ni contrato (las monedas no se mezclan)", !ocp.includes("emitOffer") && !ocp.includes('from("lot_offers")') && !ocp.includes('from("purchase_contracts")'));
check("el OCP manda a Ofertas para registrar al mejor postor", cliente.includes('href="/ocp/ofertas"') && pagina.includes("mejor postor"));

// ── 3. La vitrina real en Cherry Picked Green ─────────────────────────────
check("TyrianSection lee SubastaPublica (ya no es demo)", seccion.includes("subastas: SubastaPublica[]") && !seccion.includes("TY-2713"));
check("la Experience carga las subastas vía listarSubastas", experiencia.includes("listarSubastas()") && experiencia.includes("loadSubastas"));
check("pujar sin sesión abre el login", /if \(!userId\) \{\s*setLoginOpen\(true\);\s*showToast\(t\.loginToBid\)/.test(experiencia));
check("el botón solo puja en una subasta viva", seccion.includes("viva ?") && seccion.includes("onBid(mostrada.id, f.fraccion, f.siguiente)"));
check("sin nivel suficiente el botón se deshabilita", seccion.includes("disabled={loggedIn && !puedePujar}"));
check("el estado «te superaron» se muestra", seccion.includes("t.outbid"));
check("los tres idiomas tienen el pie nuevo", (seccion.match(/footTier:/g) ?? []).length === 3);
check("el perfil ya no habla del TY-2713 demo", !perfil.includes("TY-2713") && !perfil.includes("(demo)"));
check("la demo de BID_STEP se retiró", !experiencia.includes("BID_STEP"));

// ── 4. Lo público no lleva al productor (V5.202) ──────────────────────────
{
  const abrir = ocp.slice(ocp.indexOf("export async function abrirSubasta("), ocp.indexOf("export async function cerrarSubasta("));
  check("V5.202 · abrir: la foto pública de la subasta lleva el nombre GENERADO, sin la finca (ni lee `lots.name` ni `fincas(name)`)", abrir.includes("lot_name: nombrePublico,") && abrir.includes("finca_name: null,") && abrir.includes("const nombrePublico = nombrePublicoDelLote({") && !/\.select\("[^"]*\bname\b[^"]*"\)/.test(abrir.replace(/fincas\(departamento, pais\)/, "")) && !abrir.includes("fincas(name)") && !abrir.includes("lot.name"));
  check("V5.202 · abrir: variedad y proceso canónicos, altitud en su tramo", abrir.includes("variety: variedadPublica(lot.ficha_variedad),") && abrir.includes("process: procesoPublico(lot.ficha_proceso),") && abrir.includes("altitude_m: altitudPublica(lot.ficha_altitud_m),"));
  const cols = /const AUCTION_COLS =\s*"([^"]+)"/.exec(comprador)?.[1] ?? "";
  check("V5.202 · la vitrina (sin sesión) no lee `finca_name` ni la foto `lot_name`: genera el nombre del lote", cols.length > 50 && !/finca_name|lot_name/.test(cols) && comprador.includes("lotName: nombres.get(a.lot_id) ?? nombrePublicoDelLote({") && !comprador.includes("fincaName"));
  // V5.202 (verificación del nodo final, 2026-10-10): las subastas abiertas ANTES de la V5.202 guardaron la variedad, el proceso y la
  // altitud tal cual: la vitrina los vuelve a normalizar al leerlos (la prueba de mutación pasaba sin esta comprobación).
  check("V5.202 · la vitrina normaliza al LEER la variedad, el proceso y la altitud (las subastas viejas los guardaron crudos)", comprador.includes("variety: variedadPublica(a.variety),") && comprador.includes("process: procesoPublico(a.process),") && comprador.includes("altitudeM: altitudPublica(a.altitude_m),"));
  check("V5.202 · el tipo público no tiene dónde poner la finca, y la sección no la pinta", !/fincaName/.test(tipos) && !/fincaName|finca_name/.test(seccion) && seccion.includes("{mostrada ? `Tyrian · ${mostrada.lotName}` : \"Tyrian\"}") && seccion.includes("tramoDeAltitud(mostrada.altitudeM, LOCALE[lang], t.masl)"));
}

const total = ok + fallos.length;
if (fallos.length) {
  console.error(`✗ qa-subastas: ${fallos.length}/${total} fallaron`);
  for (const f of fallos) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ qa-subastas: ${ok}/${total} en orden`);
