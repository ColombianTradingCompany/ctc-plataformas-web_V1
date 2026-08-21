// Guardián del circuito de ofertas (V5.18).
//
//   node scripts/qa-ofertas-check.mjs
//
// V5.18 cambió DÓNDE nace el contrato: ya no lo crea el veredicto del galardón
// ni la decisión Black de CTC — lo crea LA ACEPTACIÓN DEL PRODUCTOR. Lo que
// hay que proteger:
//
//   · La máquina de estados: solo una oferta `emitida` se puede responder;
//     aceptar crea el contrato Y enlaza contract_id; rechazar NO crea nada.
//   · La elegibilidad por clase: temporada ⇒ red|blue|gold · black ⇒ black ·
//     subasta ⇒ tyrian; solo lotes galardonados; la ventana «esta temporada o
//     la pasada» (seasonKey, diff ≤ 1) — y el encuadre viaja CONGELADO en la
//     oferta porque harvest_seasons es service-role-only.
//   · La propiedad: respondToOffer verifica que la oferta sea del productor
//     autenticado, y toda escritura de lot_offers va por service role.
//   · El veredicto del galardón ya NO inserta contratos (V5.17 lo hacía como
//     interinato); decideBlackNegotiation('comprar') EMITE la oferta.

import { readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

const emisor = lee("src/app/ocp/(app)/ofertasActions.ts");
const respuesta = lee("src/lib/ofertas/producerActions.ts");
const nominados = lee("src/app/ocp/(app)/nominadosActions.ts");
const contratos = lee("src/app/ocp/(app)/contractActions.ts");
const tab = lee("src/components/kaffetal-regal/panel/ContratosTab.tsx");
const pagina = lee("src/app/ocp/(app)/ofertas/page.tsx");
const data = lee("src/components/kaffetal-regal/data.ts");
const seasons = lee("src/lib/arena/seasons.ts");

// ── 1. La máquina de estados ──────────────────────────────────────────────
check("solo una oferta emitida se responde", respuesta.includes('offer.status !== "emitida"'));
check("aceptar crea el contrato", respuesta.includes('status: "pending_signature"') && respuesta.includes("grade_snapshot: offer.grade_snapshot"));
check("con la temporada de la oferta", respuesta.includes("season_id: offer.season_id"));
check("y enlaza contract_id", respuesta.includes("contract_id: contract.id"));
{
  // Rechazar no crea nada: la rama de rechazo retorna ANTES del insert.
  const rechazo = respuesta.split('if (respuesta === "rechazar")')[1]?.split("return { ok: true };")[0] ?? "";
  check("rechazar NO crea contrato", !rechazo.includes("purchase_contracts"));
}
check("retirar exige oferta abierta", emisor.includes('offer.status !== "emitida"'));

// ── 2. La elegibilidad ────────────────────────────────────────────────────
check("solo lotes galardonados", emisor.includes('lot.stage !== "galardonado"'));
check("temporada ⇒ red|blue|gold", emisor.includes('grade === "red" || grade === "blue" || grade === "gold"'));
check("black ⇒ black", emisor.includes('if (kind === "black") return grade === "black"'));
check("subasta ⇒ tyrian", emisor.includes('return grade === "tyrian"'));
check("la ventana es de dos temporadas (seasonKey)", emisor.includes("seasonKey(vigente") && emisor.includes("diff > 1"));
check("seasonKey ordena mitaca antes que principal", seasons.includes('s.year * 2 + (s.kind === "principal" ? 1 : 0)'));
check("el encuadre viaja congelado", emisor.includes("lote_de_temporada_pasada: lotePasado") && emisor.includes("season_label: seasonLabel(vigente)"));
check("una sola oferta abierta por lote", emisor.includes("ya tiene una oferta abierta"));
check("un contrato vivo bloquea re-ofertar", emisor.includes("ya tiene un contrato vivo"));
check("los snapshots se congelan al emitir", emisor.includes("grade_snapshot: lot.grade") && emisor.includes("score_snapshot: media.scaAverage"));

// ── 3. La propiedad y el patrón de escritura ──────────────────────────────
check("respondToOffer verifica al dueño", respuesta.includes("offer.producer_id !== auth.userId"));
check("y exige cuenta de productor", respuesta.includes('profile?.role !== "producer"'));
check("las escrituras van por service role", respuesta.includes("createServiceRoleClient()"));
check("la lectura del productor es RLS select-own (sin writes cliente)", lee("src/components/kaffetal-regal/KaffetalExperience.tsx").includes("lot_offers_select_own"));

// ── 4. El contrato ya no nace en otro sitio ───────────────────────────────
check("el veredicto del galardón NO inserta contratos", !nominados.includes('from("purchase_contracts")'));
check("decideBlackNegotiation emite la oferta", contratos.includes('emitOffer(neg.lot_id, "black"'));
{
  const black = contratos.split("decideBlackNegotiation")[1] ?? "";
  check("y ya no inserta el contrato directamente", !black.includes('from("purchase_contracts")\n      .insert'));
}
check("signContract sigue siendo la firma de CTC", contratos.includes("export async function signContract("));

// ── 5. Las cuatro secciones del productor ─────────────────────────────────
for (const s of ["Ofertas de Temporada", "Contratos de Temporada", "Ofertas Black", "Subastas Tyrian"]) {
  check(`la pestaña pinta «${s}»`, tab.includes(s));
}
check("el podio tiene su lema", tab.includes("El podio de los mejores, al mejor postor"));
check("el lote de la temporada pasada se ve como tal", tab.includes("Lote de la temporada pasada"));
check("aceptar pasa por respondToOffer", tab.includes('respondToOffer(offer.id, respuesta'));
check("el modelo cliente conoce la oferta", data.includes("export type ProducerOffer"));
check("y el contrato su temporada", data.includes("seasonId: string | null"));

// ── 6. La pantalla del OCP ────────────────────────────────────────────────
check("/ocp/ofertas existe con sus colas", pagina.includes("Elegibles · Temporada") && pagina.includes("Subastas Tyrian"));
check("las Black no se emiten ahí", pagina.includes("no se emiten aquí"));
check("la pestaña vive en CatalogoTabs", lee("src/app/ocp/(app)/catalogo/CatalogoTabs.tsx").includes('{ href: "/ocp/ofertas", label: "Ofertas" }'));

if (fallos.length) {
  console.error(`✗ qa-ofertas: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-ofertas: ${ok} comprobaciones OK, 0 fallos`);
