// Guardián de la VISA EUDR — el veredicto de CTC (2026-08-20).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-visa-check.mjs
//
// EL FALLO QUE LO TRAE. `fincaEudrStatus()` derivaba la Visa SOLO de lo que
// contestaba el productor y no leía `fincas.status` en ninguna parte. Un mismo
// agujero producía tres síntomas que parecían tres errores distintos:
//
//   · la finca decía «Visa vigente» ANTES de que el OCP la aprobara,
//   · aprobarla desde el OCP no cambiaba nada visible,
//   · «Rechazar» —que sí escribe status='rejected' y su fila de auditoría—
//     parecía no hacer nada.
//
// Ninguno de los tres rompía nada: la pantalla simplemente afirmaba algo que
// no constaba. Ese es el fallo que un guardián tiene que atrapar, porque no
// hay error, ni excepción, ni build roja que lo delate.
//
// LO QUE PROTEGE, y por qué:
//
//   1. Que la Visa NUNCA diga «vigente» sin aprobación de CTC. Es la afirmación
//      cara: un lote con Sello viaja a un comprador europeo como prueba de
//      debida diligencia. Afirmarla sin veredicto es exactamente lo que el
//      EUDR no perdona.
//   2. Que «Rechazar» se vea. Un botón que escribe en la base y no cambia la
//      pantalla es peor que un botón que no existe.
//   3. Que aprobar siga siendo POSIBLE. Al meter el veredicto dentro de la
//      Visa aparece un abrazo mortal evidente en cuanto se dibuja —haría falta
//      estar aprobada para poder aprobarla— y por eso la compuerta del OCP
//      pregunta por la DECLARACIÓN (fincaEudrDeclaracion), no por la Visa.
//      Si alguien "simplifica" eso a fincaEudrStatus, el botón Aprobar se apaga
//      para siempre y nadie sabrá por qué.
//   4. Que TODO el que arma un `FincaEudrFields` desde su propio SELECT traiga
//      `status` y `eudr_cert_shared`. Este es el fallo mudo de verdad: sin esas
//      columnas la Visa se queda en «en revisión» para TODAS las fincas, y la
//      compuerta de Arena cierra el pago y el recibo de muestra de fincas que
//      sí están aprobadas — sin un solo error en consola. La lección de la
//      V5.13 aplicada aquí: la aserción útil no es cómo se ve la función, sino
//      qué DEVUELVE con los datos que el caller de verdad le pasa.

import { readFileSync } from "node:fs";
import { fincaEudrStatus, fincaEudrDeclaracion, lotEudrStatus } from "../src/lib/eudr.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

// Una finca cuya DECLARACIÓN está completa y limpia: geo, área, no
// deforestación, tenencia y las dos respuestas del cuestionario de riesgo.
const completa = (extra = {}) => ({
  name: "La Esperanza",
  ha: "3.5",
  lat: "5.1234",
  lng: "-75.4321",
  vereda: "El Roble",
  mun: "Salamina",
  depto: "Caldas",
  eudrDeforestationFree: true,
  eudrLegalProduction: true,
  eudrTenure: "propietario",
  eudrIllegalityIndicators: false,
  eudrDocsAvailable: true,
  eudrMitigationEffective: null,
  ...extra,
});

// ── 1. La Visa no se afirma sola ───────────────────────────────────────────
{
  const enRevision = fincaEudrStatus(completa({ status: "pending_review", certShared: false }));
  check(
    "declaración completa + sin veredicto de CTC ⇒ NO es «Visa vigente»",
    enRevision.code !== "apta" && !/vigente/i.test(enRevision.label)
  );
  check("y se dice en revisión, con su tono de pendiente", enRevision.code === "en_revision" && enRevision.tone === "pend");

  // El caso exacto del reporte: la finca contestó bien y el badge cantaba
  // «Visa vigente» sin que nadie del OCP la hubiera mirado.
  check(
    "el caso reportado (todo contestado, nada aprobado) ya no dice vigente",
    fincaEudrStatus(completa({ status: "pending_review", certShared: false })).label !== "Visa vigente"
  );
}

// ── 2. El veredicto de CTC se ve ───────────────────────────────────────────
{
  const rechazada = fincaEudrStatus(completa({ status: "rejected", certShared: false }));
  check("«Rechazar» cambia la Visa", rechazada.code === "rechazada" && rechazada.tone === "stop");

  const aprobadaSinRemitir = fincaEudrStatus(completa({ status: "approved", certShared: false }));
  check(
    "aprobada sin expediente remitido tiene estado PROPIO",
    aprobadaSinRemitir.code === "aprobada" && aprobadaSinRemitir.code !== "apta"
  );
  check("y lo dice con todas las letras", /sin remitir/i.test(aprobadaSinRemitir.label));

  const vigente = fincaEudrStatus(completa({ status: "approved", certShared: true }));
  check("aprobada + expediente remitido ⇒ Visa vigente", vigente.code === "apta" && vigente.tone === "ok");
}

// ── 3. Lo incompleto sigue siendo del productor, no de CTC ─────────────────
{
  // Si falta algo suyo, lo accionable es SUYO: no tiene sentido decirle que
  // está «en revisión» cuando CTC no tiene nada que revisar todavía.
  const sinTenencia = fincaEudrStatus(completa({ eudrTenure: "", status: "approved", certShared: true }));
  check("declaración incompleta manda sobre el veredicto", sinTenencia.code === "pendiente");

  const deforesta = fincaEudrStatus(completa({ eudrDeforestationFree: false, status: "approved", certShared: true }));
  check("una declaración de deforestación no la salva una aprobación", deforesta.code === "no_apta");
}

// ── 4. Aprobar sigue siendo posible (el abrazo mortal) ─────────────────────
{
  check(
    "la DECLARACIÓN ignora el veredicto: una finca sin aprobar es aprobable",
    fincaEudrDeclaracion(completa({ status: "pending_review", certShared: false })).code === "apta"
  );

  const acciones = lee("src/app/ocp/(app)/actions.ts");
  check(
    "approveFinca gatea por la declaración, no por la Visa",
    acciones.includes("fincaEudrDeclaracion(eudrFields, parcelas).code !== \"apta\"") &&
      !acciones.includes("fincaEudrStatus(eudrFields, parcelas)")
  );
  const consola = lee("src/app/ocp/(app)/fincas/page.tsx");
  check(
    "el botón Aprobar del OCP también, o quedaría apagado para siempre",
    consola.includes("fincaEudrDeclaracion(eudrFields).code !== \"apta\"")
  );
}

// ── 5. El Sello del lote hereda la Visa de verdad ──────────────────────────
{
  const lote = { eudr_risk_level: null, eudr_mitigation_effective: null };
  check(
    "finca sin aprobar ⇒ el lote NO tiene Sello listo",
    lotEudrStatus(lote, [completa({ status: "pending_review", certShared: false })]).code !== "eudr_ready"
  );
  check(
    "finca aprobada sin expediente remitido ⇒ tampoco",
    lotEudrStatus(lote, [completa({ status: "approved", certShared: false })]).code !== "eudr_ready"
  );
  check(
    "finca rechazada ⇒ el lote queda bloqueado",
    lotEudrStatus(lote, [completa({ status: "rejected", certShared: false })]).code === "bloqueado"
  );
  check(
    "todas las fincas con Visa vigente ⇒ Sello listo",
    lotEudrStatus(lote, [completa({ status: "approved", certShared: true })]).code === "eudr_ready"
  );
  check(
    "basta UNA finca sin Visa para que el lote no tenga Sello",
    lotEudrStatus(lote, [
      completa({ status: "approved", certShared: true }),
      completa({ name: "La Otra", status: "pending_review", certShared: false }),
    ]).code !== "eudr_ready"
  );
}

// ── 6. Nadie arma un FincaEudrFields sin el veredicto ──────────────────────
// El fallo mudo: un SELECT sin `status` deja la Visa clavada en «en revisión»
// para todo el mundo y cierra compuertas sin decir nada.
{
  const constructores = [
    "src/lib/arena/eudrGate.ts",
    "src/app/ocp/(app)/fincas/page.tsx",
    "src/app/ocp/(app)/lotes/page.tsx",
    "src/app/kaffetal-regal/certificacion-lote/[id]/page.tsx",
  ];
  for (const archivo of constructores) {
    const src = lee(archivo);
    check(`${archivo}: su FincaEudrFields lleva status`, /\bstatus:\s/.test(src));
    check(`${archivo}: y lleva certShared`, src.includes("certShared:"));
    check(`${archivo}: y su SELECT pide eudr_cert_shared`, src.includes("eudr_cert_shared"));
  }
}

// approveFinca es la excepción legítima: gatea por la declaración, así que no
// necesita el veredicto — pero sí debe seguir SIN pedirlo, o alguien lo leerá
// como que la compuerta mira la Visa.
{
  const acciones = lee("src/app/ocp/(app)/actions.ts");
  const bloque = acciones.slice(acciones.indexOf("export async function approveFinca"), acciones.indexOf("export async function approveFinca") + 3000);
  check("approveFinca no mete el veredicto en su propio FincaEudrFields", !/certShared:/.test(bloque));
}

if (fallos.length) {
  console.error(`✗ qa-visa: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-visa: ${ok} comprobaciones OK, 0 fallos`);
