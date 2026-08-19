// Guardián de la ficha pública de un lote (V4.42).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-ficha-publica-check.mjs
//
// LO QUE PROTEGE. `lots.datasheet` son 110 claves: el formulario ENTERO de la
// ficha técnica, pensado para el expediente interno. Dentro van el NIT y la
// razón social del productor, su nombre, la georreferencia del predio, quién
// catató, y el bloque `eudr_*` con la evaluación de RIESGO que CTC hace del
// proveedor. El §9 del plan decía «generar el PDF desde `lots.datasheet` y el
// botón se enciende para todo el catálogo»: hacerlo así lo publicaba todo.
//
// ⚠️ Y el peor era `estate`. Por D3.1 la tarjeta de un lote comprado en firme
// no enseña la finca — y ese PDF la habría puesto a un clic de esa tarjeta.
//
// La defensa es una LISTA BLANCA. Este guardián existe para que siga siéndolo:
// prueba con el juego de claves REAL —las 110 que hay hoy en la base, no unas
// inventadas— y comprueba que solo salen las nombradas.

import { readFileSync } from "node:fs";
import {
  fichaPublica,
  fichaVale,
  CAMPOS_PUBLICOS,
  NUNCA_PUBLICOS,
} from "../src/lib/catalogo/fichaPublica.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));

const CTC = "Colombian Trading Company SAS";

// Las 110 claves reales de `lots.datasheet` (leídas de la base el 2026-08-19).
// Se guardan aquí a propósito: el guardián tiene que correr sin credenciales,
// y lo que importa no es el valor sino que NINGUNA clave de fuera de la lista
// blanca sobreviva a la proyección.
const CLAVES_REALES = `about_origin, additional_estate_ids, analysis_notes, awards, b1_unknown, base_processing,
cert_attachments, contributions, country, county_muni, county_muni_text, ctc_uid, cupping_profile, estate,
eudr_cert_scheme, eudr_chain_complexity, eudr_country, eudr_country_risk, eudr_custody_method,
eudr_custody_notes, eudr_custody_stages, eudr_docs_available, eudr_illegality_indicators,
eudr_mitigation_actions, eudr_mitigation_effective, eudr_mitigation_responsible, eudr_product_risk,
eudr_product_risk_factors, eudr_risk_level, eudr_traceability_confirmed, extra_video_assets,
fa_green_remainder, fa_parch_hum, fa_primary_defect, fa_secondary_defect, fa_start, ft2_a3_na, ft2_a4_na,
ft2_b2_na, ft2_b3_na, geo_ref, green_bean_density, green_bean_humidity, harvest_from, harvest_season,
harvest_to, harvest_year, hs_code, intl_birdfriendly, intl_bpa, intl_cafe, intl_cert_other_text, intl_demeter,
intl_eudr, intl_eujas, intl_fairtrade, intl_fairtradeusa, intl_foe, intl_globalgap, intl_iwca, intl_nespresso,
intl_organic, intl_other, intl_rainforest, intl_spp, masl, mesh_europa, mesh_extra, mesh_peaberry,
mesh_residue, mesh_supremo, mesh_supremo_plus, mesh_ugq, multi_origin_specs, nit_rut, origin_category,
origin_cert_do, origin_cert_dor, origin_cert_fedecafe, origin_cert_igp, origin_cert_other,
origin_cert_other_text, plantation_age, product_name, product_type, productor, qgrader_1, qgrader_2,
qgrader_3, qgrader_cert, qgrader_lab, qgrader_name, razon_social, region_dep, revision_date, sca_acidity,
sca_aftertaste, sca_balance, sca_body, sca_clean_cup, sca_cuppers, sca_flavor, sca_fragrance, sca_sweetness,
sca_uniformity, special_processing, species, varieties, water_activity, yield_factor_producer`
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

check("el juego de claves real tiene las 110", CLAVES_REALES.length === 110);

// Una ficha con TODAS las claves llenas: el peor caso, todo relleno con algo
// reconocible para poder buscarlo en la salida.
const TODO = Object.fromEntries(CLAVES_REALES.map((k) => [k, `VALOR_${k}`]));

// ── 1. Ni una clave de fuera de la lista blanca sobrevive ──────────────────
{
  const f = fichaPublica(TODO, { ctcSelection: false, rotuloCTC: CTC });
  const salieron = Object.keys(f);
  const coladas = salieron.filter((k) => !CAMPOS_PUBLICOS.includes(k));
  check(`no se cuela ninguna clave fuera de la lista${coladas.length ? ` (${coladas.join(", ")})` : ""}`, coladas.length === 0);
  check("y sí sale lo que debe salir", salieron.length === CAMPOS_PUBLICOS.length);
}

// ── 2. Las que duelen, una por una ─────────────────────────────────────────
// Se comprueban por NOMBRE y por VALOR: que la clave no esté, y que su
// contenido no aparezca en ningún otro campo por un copiado descuidado.
{
  const f = fichaPublica(TODO, { ctcSelection: false, rotuloCTC: CTC });
  const serializada = JSON.stringify(f);
  for (const clave of NUNCA_PUBLICOS) {
    check(`nunca sale «${clave}»`, !(clave in f));
    check(`ni su valor por otra puerta («${clave}»)`, !serializada.includes(`VALOR_${clave}`));
  }
}

// ── 3. D3.1: en CTC Selection la ficha dice CTC, no la finca ───────────────
// Esta es la razón de ser del módulo. Si esto se cae, la ficha desmiente a la
// tarjeta y el nombre que la vitrina tapa queda a un clic.
{
  const comprado = fichaPublica(TODO, { ctcSelection: true, rotuloCTC: CTC });
  check("CTC Selection: `estate` es el rótulo de CTC", comprado.estate === CTC);
  check("CTC Selection: no queda rastro del nombre real de la finca", !JSON.stringify(comprado).includes("VALOR_estate"));

  const normal = fichaPublica(TODO, { ctcSelection: false, rotuloCTC: CTC });
  check("lote normal: `estate` es la finca de verdad", normal.estate === "VALOR_estate");

  // Y aunque la finca venga vacía, un lote de CTC Selection enseña el rótulo:
  // una ficha muda ahí se leería como un dato que falta, no como una decisión.
  const sinFinca = fichaPublica({ ...TODO, estate: "" }, { ctcSelection: true, rotuloCTC: CTC });
  check("CTC Selection con finca vacía: sigue diciendo CTC", sinFinca.estate === CTC);
}

// ── 4. Solo escalares ──────────────────────────────────────────────────────
// Un objeto o arreglo anidado puede arrastrar dentro lo que sea —una lista de
// fincas aportantes, un adjunto— y la lista blanca solo mira el primer nivel.
{
  const sucio = fichaPublica(
    {
      varieties: ["Gesha", { finca_oculta: "La Fortaleza" }],
      cupping_profile: { texto: "floral", interno: "VALOR_nit_rut" },
      masl: 1700,
      estate: "La Pradera",
      sca_fragrance: 8.5,
    },
    { ctcSelection: false, rotuloCTC: CTC }
  );
  check("un arreglo anidado no pasa", sucio.varieties === undefined);
  check("un objeto anidado tampoco", sucio.cupping_profile === undefined);
  check("y lo escalar sí", sucio.masl === 1700 && sucio.estate === "La Pradera" && sucio.sca_fragrance === 8.5);
  check("nada de lo anidado se filtró", !JSON.stringify(sucio).includes("La Fortaleza") && !JSON.stringify(sucio).includes("VALOR_nit_rut"));
}

// ── 5. Entradas rotas no revientan ni abren la puerta ──────────────────────
for (const malo of [null, undefined, "", 0, [], "una cadena", 42, true]) {
  const f = fichaPublica(malo, { ctcSelection: false, rotuloCTC: CTC });
  check(`entrada ${JSON.stringify(malo)} → ficha vacía`, Object.keys(f).length === 0);
}
// Un arreglo NO se trata como objeto: `Array.isArray` va antes que `typeof`.
check("un arreglo con claves no se cuela", Object.keys(fichaPublica(Object.assign([], TODO), { ctcSelection: false, rotuloCTC: CTC })).length === 0);
// Cadenas vacías o de solo espacios no ocupan sitio en la ficha.
check("una cadena vacía no ocupa campo", fichaPublica({ estate: "   " }, { ctcSelection: false, rotuloCTC: CTC }).estate === undefined);

// ── 6. El botón no se enciende sobre una ficha vacía ───────────────────────
// Un visitante que hace clic y ve una hoja en blanco aprende que la ficha no
// sirve, y eso no se desaprende.
{
  check("ficha vacía no vale", !fichaVale({}));
  check("solo origen no vale", !fichaVale({ estate: "La Pradera" }));
  check("solo taza no vale", !fichaVale({ sca_fragrance: 8.5 }));
  check("taza + origen sí vale", fichaVale({ sca_fragrance: 8.5, estate: "La Pradera" }));
  check("perfil de cata también cuenta como taza", fichaVale({ cupping_profile: "floral", region_dep: "Santander" }));
}

// ── 7. Que siga siendo lista BLANCA ────────────────────────────────────────
// El día que alguien la convierta en lista negra —«copio todo menos esto»—,
// una clave nueva del formulario nacerá pública. Esto lo denuncia.
{
  const fuente = readFileSync(new URL("../src/lib/catalogo/fichaPublica.ts", import.meta.url), "utf8");
  check("la proyección recorre CAMPOS_PUBLICOS, no las claves de la entrada", /for \(const campo of CAMPOS_PUBLICOS\)/.test(fuente));
  check("no se copia el objeto entero por ningún atajo", !/\.\.\.bruto|Object\.assign\(salida/.test(fuente));
  check("queda escrito por qué es lista blanca", fuente.includes("LISTA BLANCA, NO NEGRA"));
}

// ── 8. El camino real: la página y la cinta ───────────────────────────────
// La proyección puede ser perfecta y aun así sobrar, si alguien lee el
// `datasheet` por otra puerta. Esto vigila las dos puertas que existen.
{
  const pagina = readFileSync(new URL("../src/app/docs/ficha/[lotId]/page.tsx", import.meta.url), "utf8");
  const cinta = readFileSync(new URL("../src/lib/catalogo/sneakPeek.ts", import.meta.url), "utf8");

  // La COMPUERTA es la vista. Si el lote no está publicado no aparece en
  // `public_lot_catalog`, y el `datasheet` no se llega a tocar. Verificado
  // además contra la base: los dos lotes reales con ficha, sin publicar, dan
  // 404 (2026-08-19).
  check("la ficha se cierra sobre `public_lot_catalog`", pagina.includes('from("public_lot_catalog")'));
  check("y responde 404 a lo que no salga de ahí", /if \(!fila\) notFound\(\)/.test(pagina));
  check("valida el id antes de preguntar nada", /UUID\.test\(lotId\)/.test(pagina));

  // El `datasheet` SOLO puede salir por la proyección. Ni una lectura suelta.
  check("el `datasheet` pasa siempre por fichaPublica()", /fichaPublica\(crudo\?\.datasheet/.test(pagina));
  // Se cuenta sobre el CÓDIGO, no sobre la prosa: los comentarios de esa página
  // explican largo y tendido por qué el `datasheet` no se sirve, y contarlos
  // haría fallar al guardián por decir la verdad. Mismo tropiezo que en
  // `qa-crm-interes-check.mjs`.
  const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const lecturas = (sinComentarios(pagina).match(/datasheet/g) ?? []).length;
  check(`la página toca \`datasheet\` solo dos veces: leerlo y proyectarlo (${lecturas})`, lecturas === 2);
  check("la página no serializa la fila cruda", !/JSON\.stringify\(crudo/.test(pagina));

  // La cinta pide la BANDERA, nunca el contenido: es anónima y pública.
  check("la cinta pide `tiene_ficha`", cinta.includes("tiene_ficha"));
  check("y NO pide el datasheet", !/select\([^)]*datasheet/s.test(cinta));

  // ⚠️ Gotcha 12: la URL cuelga de `/docs`, que el proxy excluye. Una ruta no
  // excluida se reescribiría en un subdominio y daría 404 — y este enlace se
  // abre desde las siete superficies donde está montada la cinta.
  check("el botón apunta a /docs/ficha/…", /datasheetUrl: fila\.tiene_ficha \? `\/docs\/ficha\//.test(cinta));
  const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  check("y `docs/` sigue excluido del matcher del proxy", /matcher:[^\]]*docs\//s.test(proxy));
}

if (fallos.length) {
  console.error(`✗ qa-ficha-publica: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-ficha-publica: ${ok} comprobaciones OK, 0 fallos (${CLAVES_REALES.length} claves reales probadas)`);
