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
import { fincaEudrStatus, fincaEudrDeclaracion, lotEudrStatus, mapaDeParcelasUrl } from "../src/lib/eudr.ts";
import { AREAS_DE_LEGISLACION, SOSTENIBILIDAD_Y_ENFOQUE_SOCIAL, estadoDelAtributo } from "../src/lib/eudrAtributos.ts";

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
  // V5.61: la página de Fincas es ahora la SECCIÓN de la finca en la vista completa de `/ocp/kr`.
  const consola = lee("src/app/ocp/(app)/kr/FincaSeccion.tsx");
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
    // V5.61: los tres constructores del OCP (Fincas, Lotes y la tabla única) son UNO, en `src/lib/ocp/`.
    "src/lib/ocp/fincaEudr.ts",
    "src/app/kaffetal-regal/certificacion-lote/[id]/page.tsx",
  ];
  for (const archivo of constructores) {
    const src = lee(archivo);
    check(`${archivo}: su FincaEudrFields lleva status`, /\bstatus:\s/.test(src));
    check(`${archivo}: y lleva certShared`, src.includes("certShared:"));
    check(`${archivo}: y su SELECT pide eudr_cert_shared`, src.includes("eudr_cert_shared"));
  }
  // …y quien USA ese constructor único tiene que pedir las dos columnas en SU consulta: el constructor no
  // puede inventarse un `status` que el SELECT no trajo.
  for (const archivo of ["src/app/ocp/(app)/kr/carga.ts", "src/app/ocp/(app)/kr/FincaSeccion.tsx", "src/app/ocp/(app)/kr/LoteSeccion.tsx"]) {
    const src = lee(archivo);
    check(`${archivo}: usa el constructor único`, src.includes("fincaEudrFieldsDe"));
    // El SELECT que importa es el que trae la Visa (el que pide `eudr_cert_shared`), no el primero del archivo:
    // la tabla única hace ocho lecturas y la de `profiles` no tiene por qué llevar `status`.
    const selects = [...src.matchAll(/\.select\(\s*([`"])([\s\S]*?)\1\s*\)/g)].map((x) => x[2]);
    const delaVisa = selects.find((t) => t.includes("eudr_cert_shared"));
    check(`${archivo}: el SELECT que trae la Visa pide también status`, !!delaVisa && /\bstatus\b/.test(delaVisa));
    check(`${archivo}: su SELECT pide eudr_cert_shared`, src.includes("eudr_cert_shared"));
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

// ── V5.110 (2026-09-30) · el espejo de la parcela 1 no calla, y `requires_polygon` es una columna REAL ──
// El fallo que lo trae: la V5.65 dijo que `finca_parcelas.requires_polygon` guarda la respuesta «> 4 ha», pero la columna
// siguió GENERADA; cada escritura de KR fallaba y `mirrorParcelaUno` lo tragaba. Diez días de fincas sin Cafetal 1.
{
  const ke = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
  const i = ke.indexOf("async function mirrorParcelaUno(");
  const cuerpo = i < 0 ? "" : ke.slice(i, ke.indexOf("\n  async function ", i + 1));
  check("mirrorParcelaUno avisa cuando no puede escribir la parcela 1 (nada de best-effort silencioso)", cuerpo.includes("showToast(") && !cuerpo.includes("best-effort"));
  check("sigue escribiendo requires_polygon (la declaración «> 4 ha») en el espejo y en saveParcela", cuerpo.includes("requires_polygon:") && ke.includes("requires_polygon: draft.mayor4ha ?? null"));
  const acta = lee("docs/migraciones/2026-09-30_parcelas_requires_polygon_es_declaracion.sql");
  check("el acta deja la columna real (drop expression) y explica el fallo", acta.includes("alter column requires_polygon drop expression") && acta.includes("columna generada"));
}

// ── V5.114 (owner, 2026-09-30) · el documento de respaldo de la finca es SOLO el SICA ──
{
  const modal = lee("src/components/kaffetal-regal/FincaModal.tsx");
  check("no hay selector de tipo de documento: el que se sube es el SICA y el tipo se fija al subirlo", !modal.includes("SUPPORT_DOC_TYPES.map(") && modal.includes('export const SUPPORT_DOC_SICA = "sica"') && modal.includes("patchEudr({ eudrSupportDocType: SUPPORT_DOC_SICA });") && modal.includes("eudrSupportDocType: SUPPORT_DOC_SICA,"));
  check("una finca con un tipo viejo lo conserva y la pantalla lo dice", modal.includes("SUPPORT_DOC_LABEL[eudr.eudrSupportDocType]"));
}

// ── V5.119 (owner, 2026-10-01) · la revisión EUDR de la finca, intuitiva ──
{
  const piezas = lee("src/app/ocp/(app)/kr/EudrPiezas.tsx");
  const editor = lee("src/app/ocp/(app)/kr/FincaEudrEditor.tsx");
  check("la barra de área se mide contra 4 ha y se corta a 30", piezas.includes("EUDR_HA_REFERENCIA = 4") && piezas.includes("EUDR_HA_TOPE_VISUAL = 30") && piezas.includes("la barra se corta"));
  check("la línea de tiempo marca la siembra, el corte EUDR (31/12/2020) y hoy", piezas.includes('EUDR_FECHA_CORTE = "2020-12-31"') && piezas.includes('label: "hoy"'));
  // V5.141 (owner, 2026-10-02): «siembra» y «corte EUDR» se pisaban cuando las dos fechas quedan cerca.
  check("la línea de tiempo no pisa sus rótulos: la siembra va ARRIBA de la línea; el corte y «hoy», debajo", /label: "siembra",[^\n]*arriba: true/.test(piezas) && /label: "corte EUDR 31\/12\/2020",[^\n]*arriba: false/.test(piezas) && /label: "hoy",[^\n]*arriba: false, ancla: "fin"/.test(piezas) && piezas.includes("top: m.arriba ? 0 : 30"));
  check("y cada rótulo se ancla hacia adentro cerca de un borde (no se sale ni choca con «hoy»)", piezas.includes('return fraccion < bordeIzq ? "inicio" : fraccion > bordeDer ? "fin" : "centro";') && piezas.includes("anclaDelRotulo(frac(corte), 0.2, 0.7)") && piezas.includes('m.ancla === "fin" ? "translateX(-100%)" : "translateX(-50%)"'));
  check("Sí/No en verde o rojo según la buena respuesta; el documento en rojo si falta", piezas.includes("const bien = v === bienSi;") && piezas.includes("styles.badgeBad}`}>{vacio}"));
  check("la lectura usa las piezas: área, fecha, Sí/No, documento, fichas, coordenada copiable", ["<BarraArea", "<LineaDeTiempo", "<SiNo", "<Documento", "<Fichas", "<Coordenada"].every((t) => editor.includes(t)));
  check("las afirmaciones del producto se pintan al derecho y los indicios con «bien = No»", editor.includes("opciones={PRODUCT_RISK_AFFIRMATIONS}") && editor.includes("bienSi={false}"));
  check("la evidencia del chequeo admite hasta 4 archivos (tope en la fuente y en la acción)", lee("src/lib/eudr.ts").includes("export const MAX_CHEQUEO_FILES = 4") && editor.includes("MAX_CHEQUEO_FILES - (values.eudr_chequeo_files ?? []).length") && lee("src/app/ocp/(app)/actions.ts").includes(".slice(0, MAX_CHEQUEO_FILES)"));
  // V5.124: el grupo `legal` (el SICA que CTCx adjunta en nombre del productor) se suma a los que suben al Storage y no viajan por la acción.
  check("y el submit no manda Files (chequeo, SICA…) por la acción", editor.includes("/^(evidence|sustainability|chequeo|legal|areas)_file_/.test(k)) fd.delete(k)"));
  const certs = lee("src/lib/registro/certificados.ts");
  check("corroborar admite un archivo por certificación y el guard lo protege", certs.includes("corroboracion_asset_id: adjunto.assetId") && editor.includes("cert-corroboracion/${certId}") && lee("docs/migraciones/2026-10-01_finca_certificates_corroboracion.sql").includes("new.corroboracion_asset_id is distinct from old.corroboracion_asset_id"));
}

// ── V5.121 (owner, 2026-10-01) · la pestaña General de la finca, en fichas ──
{
  const panel = lee("src/app/ocp/(app)/kr/FincaPanel.tsx");
  const seccion = lee("src/app/ocp/(app)/kr/FincaSeccion.tsx");
  check("la General usa la barra de área y Sí/No, y dice en rojo lo que falta a la declaración", panel.includes("<BarraArea ha={g.hectares} />") && panel.includes("<SiNo v={g.tienePunto} />") && panel.includes("Falta para completar la declaración:") && panel.includes("Declaración EUDR completa"));
  check("y la sección le pasa altitud, DANE, geometría, parcelas, certificaciones y los faltantes", seccion.includes("altitude_m, history_text, characteristics_text") && seccion.includes("faltantes: finca.status === \"approved\" ? [] : gaps") && seccion.includes("certificacionesCorroboradas:"));
}

// ── V5.122 (owner, 2026-10-01) · el área del Cafetal 1 viaja con la finca; los Totales se calculan solos ──
{
  const modal = lee("src/components/kaffetal-regal/FincaModal.tsx");
  const ke = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
  check("Guardar Finca lleva el Cafetal 1 (nombre, área, altura, > 4 ha) y el espejo lo escribe", modal.includes("{ nombre: nombreUno, areaHa: areaUno, alturaMsnm: alturaUno, mayor4ha: mayor4haUno }") && ke.includes("mirrorParcelaUno(editing.id, f, cafetalUno)") && ke.includes("const areaHa = areaTexto"));
  check("el espejo no exige geometría para guardar un área escrita a mano", ke.includes("if (!hasPoint && !hasPoly && !areaTexto && !alturaTexto && cafetal?.mayor4ha == null) return;"));
  check("los Totales son derivados y de solo lectura (sin «Calcular del polígono» ni «Traer del mapa» en el total)", modal.includes("const ha = !isNaN(haTotalNum)") && modal.includes("const alt = alturaUno.trim() ? alturaUno : altGuardada;") && modal.includes('<input value={ha} readOnly') && modal.includes('<input value={alt} readOnly') && !modal.includes("function pullArea()") && !modal.includes("async function pullAltitude()"));
}

// ── V5.123 (owner) · el cafetal y los Totales en el mismo orden: Área a la izquierda, Altura a la derecha ──
{
  const modal = lee("src/components/kaffetal-regal/FincaModal.tsx").replace(/\r\n/g, "\n"); // V5.150: el archivo puede venir con CRLF (autocrlf)
  const enOrden = (area, altura) => modal.indexOf(area) > 0 && modal.indexOf(area) < modal.indexOf(altura);
  check("en el cafetal, Área va antes que Altura; en los Totales, igual", enOrden("                Área en café (ha)\n", "                Altura (msnm)\n") && enOrden("Área en café de TODA la finca (ha)", "Altura de la finca (msnm)"));
}

// ── V5.124 (owner, 2026-10-01) · la finca aprobada se REVISA; la solicitud lleva punto, nota y adjunto; CTCx edita todo en su nombre ──
{
  const modal = lee("src/components/kaffetal-regal/FincaModal.tsx");
  const solicitud = lee("src/components/kaffetal-regal/SolicitudRevisionModal.tsx");
  const ke = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
  const perfil = lee("src/components/kaffetal-regal/panel/PerfilTab.tsx");
  check("la finca aprobada abre en solo lectura: «Revisar», fieldset deshabilitado, sin autosave ni Guardar", perfil.includes('f.status === "approved" ? "Revisar" : "Editar"') && modal.includes("<fieldset disabled={soloLectura}") && modal.includes("enabled: !!finca?.id && !soloLectura") && modal.includes("{!soloLectura && ("));
  check("la solicitud elige uno de los 4 puntos, lleva nota y un adjunto, y se pueden mandar varias", ["general", "ubicacion", "eudr", "certs"].every((k) => solicitud.includes(`key: "${k}"`)) && solicitud.includes('type="file"') && solicitud.includes("Puede enviar otra") && ke.includes("adjunto_asset_id: extras?.adjunto?.assetId ?? null") && ke.includes("{ seccion: solicitud.seccion, adjunto }"));
  const editor = lee("src/app/ocp/(app)/kr/FincaEudrEditor.tsx");
  const acciones = lee("src/app/ocp/(app)/actions.ts");
  check("el OCP edita en nombre del productor: generales, polígono, infraestructura y el SICA", ['name="finca_name"', 'name="eudr_polygon_text"', 'name="eudr_local_infra"', 'name="legal_file_doc"', 'name="en_nombre_del_productor"'].every((t) => editor.includes(t)));
  check("la acción lo guarda, valida el polígono, fija el SICA y espeja la parcela 1", acciones.includes('patch.eudr_support_doc_type = "sica"') && acciones.includes("Un polígono necesita al menos 3 vértices") && acciones.includes('if (formData.get("en_nombre_del_productor"))') && acciones.includes('service.from("finca_parcelas").update(espejo)'));
  check("y la Comunicación de la finca enseña el punto y el adjunto de la solicitud", lee("src/app/ocp/(app)/kr/FincaPanel.tsx").includes("Revisión de datos · {SECCION_LABEL[c.seccion] ?? c.seccion}") && lee("src/app/ocp/(app)/kr/FincaSeccion.tsx").includes("seccion, adjunto_asset_id, adjunto_filename"));
}

// ── V5.127 (owner, 2026-10-01) · todos los departamentos de Colombia + «Fuera de Colombia» (`fincas.pais`) ──
{
  const geo = lee("src/lib/geo/departamentos.ts");
  const modal = lee("src/components/kaffetal-regal/FincaModal.tsx");
  const ke = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
  const deptos = [...geo.matchAll(/^  "([^"]+)",\r?$/gm)].map((m) => m[1]);
  check("la lista trae los 32 departamentos y Bogotá D.C. (33), sin repetir", deptos.length === 33 && new Set(deptos).size === 33 && ["Norte de Santander", "Bogotá D.C.", "Vichada", "San Andrés y Providencia", "Risaralda"].every((d) => deptos.includes(d)));
  check("los siete países de «Fuera de Colombia»", ["Perú", "Ecuador", "Venezuela", "Panamá", "Costa Rica", "Guatemala", "El Salvador"].every((p) => geo.includes(`"${p}"`)));
  check("el editor de la finca usa la lista completa y el interruptor congela el Departamento", modal.includes("DEPARTAMENTOS_DE_COLOMBIA") && modal.includes('role="switch"') && modal.includes("disabled={fuera}") && modal.includes("PAISES_FUERA_DE_COLOMBIA.map") && !modal.includes('"Caldas", "Otro"'));
  check("con país, la finca se guarda sin departamento", /departamento: f\.pais \|\| f\.depto === "—" \? null : f\.depto,\s*pais: f\.pais \|\| null,/.test(ke) && modal.includes('depto: paisEfectivo ? "—" : depto || defaultDepto'));
  check("el Pasaporte declara el país de la finca y su nivel de riesgo (Costa Rica es bajo)", lee("src/components/kaffetal-regal/EudrDossierDoc.tsx").includes('countryRiskFor(finca.pais || "Colombia")') && lee("src/lib/eudr.ts").includes('"Costa Rica": "Bajo"'));
  check("el OCP lo lee y lo edita en nombre del productor; el DANE no aplica fuera de Colombia", lee("src/app/ocp/(app)/kr/FincaEudrEditor.tsx").includes('name="pais"') && lee("src/app/ocp/(app)/actions.ts").includes('formData.has("pais")') && lee("src/app/ocp/(app)/kr/FincaSeccion.tsx").includes("finca.pais ? null : daneCodeFor("));
  check("el acta de la migración `fincas.pais` existe", lee("docs/migraciones/2026-10-01_fincas_pais.sql").includes("add column if not exists pais text"));
}

// ── V5.128 (owner, 2026-10-01) · el productor SOLICITA el chequeo de legislación/sostenibilidad; CTCx anota y adjunta por ítem ──
{
  const lib = lee("src/lib/eudrAtributos.ts");
  const bloque = lee("src/components/kaffetal-regal/ChequeosCtcx.tsx");
  const modal = lee("src/components/kaffetal-regal/FincaModal.tsx");
  const ke = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
  const editor = lee("src/app/ocp/(app)/kr/FincaEudrEditor.tsx");
  const piezas = lee("src/app/ocp/(app)/kr/AtributosChequeo.tsx");
  const acciones = lee("src/app/ocp/(app)/actions.ts");
  check("una sola lista: 5 áreas de legislación y 4 de sostenibilidad, con las claves de siempre", ["suelo", "ambiental", "laboral", "clpi", "fiscal", "sa8000", "familiar", "inclusion", "paisaje"].every((k) => lib.includes(`key: "${k}"`)) && !editor.includes("const LEGAL_AREAS") && editor.includes("AREAS_DE_LEGISLACION"));
  check("KR: el aviso «no requieren acción suya» ya no está; el bloque de chequeos vive FUERA del fieldset de solo lectura", !modal.includes("los completa CTC como parte de su propia revisión") && /<\/fieldset>\s*\{\/\* V5\.128[\s\S]{0,800}<ChequeosCtcx/.test(modal));
  check("KR: por ítem, nota e imagen opcionales y el botón «Solicitar chequeo»", bloque.includes('accept="image/*"') && bloque.includes("Nota para CTCx (opcional)") && bloque.includes("Solicitar chequeo") && bloque.includes("✓ Verificado por CTCx"));
  check("KR: la solicitud escribe SOLO `eudr_chequeo_solicitudes`, comprueba la fila y avisa a CTCx en el hilo", ke.includes(".update({ eudr_chequeo_solicitudes: mapa }).eq(\"id\", finca.id).select(\"id\")") && ke.includes("Solicitud de chequeo — ${finca.name}") && !/payload\.eudr_chequeo_solicitudes|eudr_chequeo_solicitudes: f\./.test(ke));
  check("OCP: cada ítem enseña la solicitud del productor, la nota de CTCx y la evidencia", piezas.includes("El productor pidió este chequeo") && piezas.includes("<th style={cabecera}>Nota de CTCx</th>") && piezas.includes("<th style={cabecera}>Evidencia</th>") && editor.includes('<AtributosLectura grupo="legal"') && editor.includes('<AtributosLectura grupo="sost"'));
  // V5.142 (owner, 2026-10-02): «las X rojas dan la impresión de que algo está mal o falta» → una tabla, una fila por atributo.
  check("OCP: tres estados y ninguno es «mal» — verificada · por chequear (la pidió el productor) · no solicitada", estadoDelAtributo(true, false) === "verificada" && estadoDelAtributo(true, true) === "verificada" && estadoDelAtributo(false, true) === "por_chequear" && estadoDelAtributo(false, false) === "no_solicitada");
  check("OCP: los atributos son una TABLA (legislación y sostenibilidad, la misma) con «Dónde verificar», nota y evidencia", piezas.includes("export function TablaDeAtributos") && piezas.includes("<th style={cabecera}>Dónde verificar</th>") && (editor.match(/<TablaDeAtributos editable>/g) ?? []).length === 2 && (editor.match(/onAdjuntar=\{\(\) => setEditing\(true\)\}/g) ?? []).length === 2);
  check("OCP: sin X rojas — lo que nadie pidió ni verificó va en gris, no en rojo", !piezas.includes("✗") && !piezas.includes("ROJO") && !/<AtributosLectura[^>]*faltante=/.test(editor) && piezas.includes('estado === "no_solicitada" ? { opacity: 0.55 }') && piezas.includes("No solicitada"));
  check("cada atributo dice DÓNDE se verifica: enlaces https, sin repetir, y solo «inclusión» sin registro que consultar", [...AREAS_DE_LEGISLACION, ...SOSTENIBILIDAD_Y_ENFOQUE_SOCIAL].every((o) => Array.isArray(o.fuentes) && o.fuentes.every((f) => f.label.trim() && /^https:\/\/[^\s]+$/.test(f.url)) && new Set(o.fuentes.map((f) => f.url)).size === o.fuentes.length) && [...AREAS_DE_LEGISLACION, ...SOSTENIBILIDAD_Y_ENFOQUE_SOCIAL].filter((o) => o.fuentes.length === 0).map((o) => o.key).join() === "inclusion");
  check("OCP: los enlaces abren en otra pestaña y no pasan el origen", piezas.includes('<a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer"'));
  // V5.142: una finca con varios cafetales enseñaba solo el primero.
  {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??= "clave-de-prueba";
    const cuadro = (la, ln) => [{ lat: la, lng: ln }, { lat: la + 0.001, lng: ln }, { lat: la + 0.001, lng: ln + 0.001 }];
    const tres = [{ n: 1, lat: "6.47", lng: "-73.04", polygon: cuadro(6.47, -73.04) }, { n: 2, lat: "6.46", lng: "-73.05", polygon: null }, { n: 3, lat: "", lng: "", polygon: cuadro(6.45, -73.06) }, { n: 4, lat: "", lng: "", polygon: null }];
    const u = new URL(mapaDeParcelasUrl(tres));
    check("el mapa de parcelas pinta TODAS las ubicadas: un polígono por cada una que lo tiene y un pin numerado por parcela", u.searchParams.getAll("path").length === 2 && u.searchParams.getAll("markers").map((m) => m.split("|")[1]).join() === "label:1,label:2,label:3" && !u.searchParams.has("zoom"));
    check("una parcela de solo polígono lleva su pin en el centro; una sin geometría no se pinta", u.searchParams.getAll("markers")[2].endsWith(`${(6.45 + 6.451 + 6.451) / 3},${(-73.06 - 73.06 - 73.059) / 3}`));
    const una = new URL(mapaDeParcelasUrl([tres[1]]));
    check("una sola parcela de solo punto se centra con zoom; conserva SU número", una.searchParams.get("zoom") === "15" && una.searchParams.get("center") === "6.46,-73.05" && una.searchParams.get("markers") === "color:red|label:2|6.46,-73.05");
    check("sin ninguna parcela ubicada no hay mapa; del 10 en adelante el pin va sin rótulo", mapaDeParcelasUrl([tres[3]]) === null && mapaDeParcelasUrl([]) === null && new URL(mapaDeParcelasUrl([{ n: 12, lat: 1, lng: 2 }])).searchParams.get("markers") === "color:red|1,2");
    check("OCP: con varias parcelas el revisor elige «Todas» o una a la vez, arriba del mapa y desde la lista", editor.includes("const variasParcelas = parcelasUbicadas.length > 1;") && editor.includes("Todas ({parcelasUbicadas.length})") && editor.includes("onClick={() => verParcela(p.id)}") && editor.includes("Ver esta parcela en Google Earth ↗") && editor.includes("(parcelaElegida ? [parcelaElegida] : parcelasUbicadas)"));
    check("OCP: con una sola parcela el mapa sigue siendo el de la finca", /: mapPreviewUrl\(\{ lat: values\.eudr_lat, lng: values\.eudr_lng, polygon: values\.eudr_polygon_geojson \}\);/.test(editor));
  }
  check("OCP: al editar, marca + nota + adjunto por ítem, y el sub-tab cuenta lo que falta por chequear", piezas.includes("name={`atributo_nota_${grupo}_${opcion.key}`}") && editor.includes("fileField={`areas_file_${o.key}`}") && editor.includes("(evidence|sustainability|chequeo|legal|areas)_file_") && editor.includes("por chequear"));
  check("la acción guarda la evidencia de las áreas y las notas por ítem", acciones.includes('collectKeyedAttachments(formData, "areas", legalAreas') && acciones.includes("patch.eudr_atributos_notas = notas;") && acciones.includes("eudr_legal_files: legalFiles,"));
  check("los jsonb se comparan por contenido (la nota al productor ya no lista columnas crudas)", acciones.includes("return estable(a ?? {}) !== estable(b ?? {});") && acciones.includes('eudr_evidence_files: "Adjuntos de evidencia"'));
  const acta = lee("docs/migraciones/2026-10-01_fincas_chequeo_de_atributos.sql");
  check("el acta de la migración trae las tres columnas y las dos líneas del guard", ["eudr_chequeo_solicitudes", "eudr_legal_files", "eudr_atributos_notas"].every((c) => acta.includes(`add column if not exists ${c} jsonb`)) && acta.includes("or new.eudr_atributos_notas is distinct from old.eudr_atributos_notas"));
}

// ── V5.150 (owner, 2026-10-05) · la altura llega a la Ficha y al OCP aunque la finca la haya recibido después; y el
//    nombre del «Producto» de la FT se cambia desde el OCP ──────────────────────────────────────────────────────────
{
  const ficha = lee("src/components/kaffetal-regal/FichaView.tsx").replace(/\r\n/g, "\n");
  check("ficha · al abrir, la altura (msnm) se toma de la finca primaria — la finca es la dueña del dato", ficha.includes("const maslDeFinca = primaria && primaria.alt !== \"—\" && primaria.alt.trim() ? primaria.alt : \"\";") && ficha.includes("masl: maslDeFinca || base.masl,"));
  check("ficha · la geo-referencia se completa de la finca solo si la Ficha no la tenía", ficha.includes("geo_ref: base.geo_ref || geoDeFinca,"));
  const lote = lee("src/app/ocp/(app)/kr/LoteSeccion.tsx").replace(/\r\n/g, "\n");
  check("ocp · la Altitud de la FT cae a la de la finca cuando la Ficha se cerró sin ella", lote.includes("fincas(name, status, hectares, altitude_m,") && lote.includes("lot.fincas?.altitude_m ? `${lot.fincas.altitude_m} msnm (de la finca)` : \"\""));
  const acciones = lee("src/app/ocp/(app)/actions.ts").replace(/\r\n/g, "\n");
  const accion = acciones.slice(acciones.indexOf("export async function renombrarProducto"));
  check("ocp · `renombrarProducto` es una acción `emite` (el nombre lo ven el productor y el catálogo)", accion.startsWith("export async function renombrarProducto(lotId: string, nombre: string)") && accion.includes('permisoDeEscritura("ocp", "emite")'));
  check("ocp · escribe las DOS copias del nombre: `lots.name` y `datasheet.product_name`", accion.includes("product_name: nuevo };") && accion.includes(".update({ name: nuevo, datasheet })"));
  check("ocp · deja rastro (`lote_renombrado`) y avisa al productor en su feed (la V5.146 no avisó)", accion.includes('action: "lote_renombrado"') && accion.includes('context_label: "Nombre del producto"') && accion.includes("CTCx cambió el nombre de su lote"));
  check("ocp · rechaza nombres de menos de 3 o más de 120 caracteres con `ok:false` (nunca lanza)", accion.includes("if (nuevo.length < 3) return { ok: false") && accion.includes("if (nuevo.length > 120) return { ok: false"));
  const pieza = lee("src/app/ocp/(app)/kr/RenombrarProducto.tsx").replace(/\r\n/g, "\n");
  check("ocp · el botón vive en FT · Identidad y Origen, en línea, con Enter/Escape", lee("src/app/ocp/(app)/kr/EvaReviewCard.tsx").includes("<RenombrarProducto lotId={lotId} nombre={lotName} />") && pieza.includes("✎ Cambiar el nombre") && pieza.includes('if (e.key === "Enter") guardar();') && pieza.includes("maxLength={120}"));
}

// ── V5.192 (owner, 2026-10-08) · el Dossier y la Visa de un lote los abre también el OCP: la SEGUNDA llave ──
//    El dossier se pidió accesible desde la vista del lote del OCP; vive en Kaffetal Regal (con la Visa, que enlaza). La primera
//    llave sigue siendo el dueño; la segunda, un operador ACTIVO del OCP (`tieneConsola`), que no redirige y no escribe.
{
  const acceso = lee("src/lib/panel/requireConsoleAccess.ts").replace(/\r\n/g, "\n");
  const visa = lee("src/app/kaffetal-regal/certificacion-lote/[id]/page.tsx").replace(/\r\n/g, "\n");
  const dossier = lee("src/app/kaffetal-regal/dossier/[id]/page.tsx").replace(/\r\n/g, "\n");
  const tiene = acceso.slice(acceso.indexOf("export async function tieneConsola("));
  check("V5.192 · `tieneConsola` lee la MISMA identidad que la compuerta (rol, fila activa, contraseña cambiada) y no redirige",
    acceso.includes("async function leerIdentidad(): Promise<LecturaDeIdentidad>") && acceso.includes("const r = await leerIdentidad();\n  if (!r.ok) redirect(r.destino);") &&
    tiene.includes("const r = await leerIdentidad();") && !tiene.slice(0, 400).includes("redirect(") && tiene.includes("return false;") &&
    !acceso.slice(acceso.indexOf("async function leerIdentidad()"), acceso.indexOf("async function loadPanelIdentity()")).includes("redirect("));
  for (const [nombre, t] of [["la Visa", visa], ["el dossier", dossier]]) {
    check(`V5.192 · ${nombre}: el dueño, o un operador del OCP (preguntado solo si no es el dueño); el título también`,
      t.includes('const esDelOcp = async () => (delOcp ??= await tieneConsola("ocp"));') && t.includes("!delDueno && !(await esDelOcp())") &&
      t.includes('{ verificarDueno: !(await tieneConsola("ocp")) }') && !t.includes("requireConsoleAccess("));
  }
}

if (fallos.length) {
  console.error(`✗ qa-visa: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-visa: ${ok} comprobaciones OK, 0 fallos`);
