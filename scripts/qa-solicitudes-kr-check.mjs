// Guardián de «Mis solicitudes» en el panel del productor (paso (v), V4.35).
//
//   node scripts/qa-solicitudes-kr-check.mjs
//
// QUÉ SE CONSTRUYÓ Y QUÉ NO. Las respuestas de CTC a una solicitud de servicio
// (CTC Tech, Varietales, CaaS) YA llegaban al productor dentro de Kaffetal
// Regal: `mirrorReplyToProducerFeed` las espeja en `producer_comm_log` desde
// hace tiempo. Lo que faltaba era encontrarlas — aterrizaban mezcladas entre
// las notas de las fincas. Así que esta tanda es PRESENTACIÓN, no fontanería.
//
// LO QUE HAY QUE PROTEGER, entonces, es la partición:
//
//   · Que se parta por el CAMPO `leadId` y NO por el texto de la etiqueta. Una
//     partición basada en una cadena de copy se rompe el día que alguien mejore
//     el texto — y se rompe en silencio: las solicitudes reaparecerían en
//     Retroalimentación y nadie vería un error.
//   · Que las dos mitades sean COMPLEMENTARIAS. Si una nota no cae en ninguna,
//     desaparece de la interfaz sin que nada falle; si cae en las dos, se
//     cuenta dos veces.
//   · Que el espejo del ECP siga existiendo. Es lo que alimenta el módulo: si
//     alguien lo quita, «Mis solicitudes» se queda vacío para siempre y el
//     módulo parecerá «sin uso» en vez de roto.

import { readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

const dash = lee("src/components/kaffetal-regal/AppDashboard.tsx");
const exp = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
const data = lee("src/components/kaffetal-regal/data.ts");
const leads = lee("src/app/ecp/(app)/leadsActions.ts");
const modal = lee("src/components/ctc-home/ContactModal.tsx");

// ── 1. El dato llega hasta el cliente ─────────────────────────────────────
check("FeedbackNote declara leadId", /leadId:\s*string \| null/.test(data));
check("la consulta pide lead_id", exp.includes("parent_id, lead_id"));
check("y lo mapea al modelo", exp.includes("leadId: c.lead_id"));

// ── 2. La partición es por CAMPO, no por texto ────────────────────────────
check("las solicitudes se identifican por leadId", dash.includes("n.leadId !== null"));
check("y las dos mitades salen del MISMO predicado", dash.includes("feedback.filter(esDeServicio)") && dash.includes("feedback.filter((n) => !esDeServicio(n))"));

// ⚠️ EL FALLO QUE SE ENCONTRÓ CON DATOS REALES, y que un `leadId !== null` a
// secas no cubre: solo la nota de CTC lleva el lead. La RESPUESTA del productor
// a ese mismo hilo se guarda con `parentId` apuntando a ella y `leadId` nulo,
// así que se habría quedado en Retroalimentación — la conversación partida en
// dos pantallas, sin un solo error. Eran 2 de 15 notas el día que se construyó.
check(
  "una respuesta del productor viaja con su hilo (se mira el parentId)",
  dash.includes("idsDeServicio.has(n.parentId)")
);
{
  // Complementarias: `!== null` y `=== null` cubren todo y no se solapan. Si
  // alguien cambia una de las dos a comparar etiquetas, esto lo caza.
  const sinComentarios = dash.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  check(
    "ninguna de las dos mitades mira el contextLabel para decidir",
    !/filter\(\(n\) => n\.contextLabel/.test(sinComentarios)
  );
}

// ── 3. Cada módulo recibe SU mitad ────────────────────────────────────────
check("«Mis solicitudes» recibe las solicitudes", dash.includes("feedback={solicitudes}"));
check("«Retroalimentación» recibe el resto", dash.includes("feedback={retroalimentacion}"));
check("el contador de retro cuenta solo su mitad", dash.includes("retroalimentacion.filter((n) => n.authorRole === \"bcp\""));
check("el módulo existe en el tipo", dash.includes('"solicitudes"'));
check("y tiene tarjeta en la rejilla", dash.includes('renderTile("solicitudes")'));
check("con icono propio", dash.includes("HUB_ICON.solicitudes"));

// ── 4. El espejo del ECP, que es lo que lo alimenta ───────────────────────
check("el ECP sigue espejando sus respuestas al productor", leads.includes("mirrorReplyToProducerFeed"));
check("y solo cuando el perfil es productor", leads.includes('profile?.role !== "producer"'));
check(
  "la etiqueta del hilo ya no miente con «CTC Home»",
  !/context_label:\s*`Solicitud CTC Home/.test(leads)
);

// ── 5. El estado de éxito del formulario tiene puerta ─────────────────────
// Creaba la cuenta y terminaba en «Entendido», que solo cerraba: la persona
// recibía un acceso y se quedaba sin forma de usarlo.
check("hay destino por pilar", modal.includes("PLATFORM_HREF"));
check("CaaS entra por Cherry Picked", /cocreate:\s*"\/cherry-picked-green"/.test(modal));
check("los pilares de productor entran por KR", /tech:\s*"\/kaffetal-regal"/.test(modal));
check("el panel de éxito ofrece entrar", modal.includes("t.successEntrar"));
for (const [idioma, txt] of [["es", "Entrar a"], ["en", "Go to"], ["de", "Zu "]]) {
  check(`el CTA está traducido (${idioma})`, modal.includes(txt));
}

if (fallos.length) {
  console.error(`✗ qa-solicitudes-kr: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-solicitudes-kr: ${ok} comprobaciones OK, 0 fallos`);
