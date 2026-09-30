// Guardián del bloque «Reportado por Productor» (B2/B3 de la Ficha, V5.20).
//
//   node scripts/qa-reportado-productor-check.mjs
//
// El rediseño del owner (2026-08-21): el productor ya no digita los 10
// atributos SCA ni la granulometría malla a malla — reporta lo que sabe y/o
// adjunta sus soportes; el detalle nace después, cuando CTCx analiza los
// archivos (el escáner visual del OCP, seguimiento). Lo que hay que proteger:
//
//   · B2: «No lo sé» O su estimación (puntaje 0–100 + escala SCA/CVA) O ≥1
//     soporte. B3: «Solo sé información básica» (factor 75–120 y/o almendra
//     150–245 — UNO de los dos, V5.64: son la misma medida y el que falte se
//     DERIVA) O ≥1 soporte. La densidad en verde bajó a opcional en la V5.64.
//   · Hasta 7 PDFs y 7 fotos por sección, y la RE-DESCARGA sobrevive al
//     bloqueo del fieldset (anclas, no botones).
//   · Los campos viejos (sca_*, mesh_*, fa_*) siguen en el tipo — datasheets
//     guardados antes del rediseño deben seguir contando como completos.

import { readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

const datos = lee("src/components/kaffetal-regal/ficha/fichaData.ts");
const vista = lee("src/components/kaffetal-regal/FichaView.tsx");
const b2 = lee("src/components/kaffetal-regal/ficha/panes/PaneB2.tsx");
const b3 = lee("src/components/kaffetal-regal/ficha/panes/PaneB3.tsx");
const files = lee("src/components/kaffetal-regal/ficha/panes/ReportFiles.tsx");
const calculos = lee("src/components/kaffetal-regal/ficha/fichaCalculations.ts");
const drop = lee("src/components/kaffetal-regal/FileDrop.tsx");

// ── 1. El modelo: los campos nuevos y los viejos conviven ─────────────────
for (const f of ["b2_score", "b2_scale", "b2_files_pdf", "b2_files_foto", "b2_tiene_reporte", "b2_reporte_ref", "b3_solo_basica", "b3_almendra_total", "b3_densidad_verde", "b3_humedad_verde", "b3_files_pdf", "b3_files_foto", "b3_tiene_reporte", "b3_reporte_ref"]) {
  check(`FichaFormData declara ${f}`, datos.includes(`${f}:`));
}
check("los sca_* viejos siguen en el tipo (datasheets guardados)", datos.includes("sca_fragrance: string;"));
check("los mesh_* también", datos.includes("mesh_supremo_plus: string;"));

// ── 2. Las compuertas de completitud ──────────────────────────────────────
check("B2 = puntaje válido O soporte (y el sca legado cuenta)", vista.includes("b2: b2Reportado || sca.total > 0"));
check("B3 = básica válida O soporte (y el Trillado legado cuenta)", vista.includes("b3: b3Reportado || factor.remainder > 0"));
check("el puntaje B2 se valida 0–100", vista.includes("numOr(data.b2_score) >= 0 && numOr(data.b2_score) <= 100"));
check("factor 75–120", vista.includes("enRango(data.yield_factor_producer, 75, 120)"));
check("almendra 150–245", vista.includes("enRango(data.b3_almendra_total, 150, 245)"));
// V5.64 (owner): la básica se cierra con UNO de los dos, y la densidad dejó de
// ser obligatoria. Se vigila las DOS caras: que el gate pida uno u otro, y que
// la densidad ya NO aparezca en él — si alguien la devuelve al gate sin decirlo,
// este guardián lo canta.
// V5.109 (owner, 2026-09-30): es O LO UNO O LO OTRO. «No lo sé» = todo opcional; «Tengo un reporte» = número(s) + soporte + quién lo emitió,
// obligatorios; y «Tengo un reporte» ES la solicitud de oficialización (sale sola con la FT2; el banner ya no pide otro adjunto).
check("B2: «No lo sé» cierra con todo opcional; «Tengo un reporte» exige puntaje, escala, perfil, soporte y quién lo emitió", vista.includes("const b2Reportado = data.ft2_b2_na || b2ConReporte;") && vista.includes('data.b2_tiene_reporte && b2ScoreValido && data.b2_scale !== "" && data.cupping_profile.trim() !== "" && b2Adjuntos && data.b2_reporte_ref.trim() !== ""'));
check("B3: «No lo sé / básica» cierra con los números opcionales; «Tengo un reporte» exige factor O almendra, soporte y quién lo emitió", vista.includes("const b3Reportado = data.b3_solo_basica || b3ConReporte;") && vista.includes('data.b3_tiene_reporte && (b3FactorValido || b3AlmendraValida) && b3Adjuntos && data.b3_reporte_ref.trim() !== ""'));
check("las dos casillas se excluyen en los dos panes", b2.includes("b2_tiene_reporte: false") && b2.includes("ft2_b2_na: false") && b3.includes("b3_tiene_reporte: false") && b3.includes("b3_solo_basica: false"));
check("«No lo sé» de B2 salió de la barra: vive en el pane", !/b2:\s*"ft2_b2_na"/.test(vista) && b2.includes("checked={data.ft2_b2_na}"));
check("«Tengo un reporte» ES la solicitud de oficialización: sale sola con la FT2 con un soporte ya subido", vista.includes("if (!lot.hasPendingOfficializationClaim && (b2ConReporte || b3ConReporte))") && vista.includes("soporte ? { assetId: soporte.assetId } : null"));
check("y el banner ya no pide nombre ni adjunto aparte", !lee("src/components/kaffetal-regal/ficha/OfficialScoreBanner.tsx").includes('type="file"') && !lee("src/components/kaffetal-regal/ficha/OfficialScoreBanner.tsx").includes("onSubmitClaim"));
check("el OCP lee quién emitió el reporte", lee("src/app/ocp/(app)/kr/LoteSeccion.tsx").includes("b2Reporte: ds.b2_tiene_reporte") && lee("src/app/ocp/(app)/kr/EvaReviewCard.tsx").includes("fisico.b3Reporte !== null"));
check("la densidad en verde ya NO es obligatoria", !vista.includes("b3DensidadValida"));
check("la densidad vive en el bloque opcional de B3", /opcionalBox[\s\S]*b3_densidad_verde/.test(b3));
check("el par factor↔almendra se deriva (17.500)", calculos.includes("B3_PRODUCTO = 70 * B3_MUESTRA_G") && calculos.includes("B3_MUESTRA_G = 250"));
check("y lo derivado NO se persiste: solo se pinta", b3.includes("almendraDesdeFactor") && b3.includes("factorDesdeAlmendra") && !/onChange\(\{\s*(yield_factor_producer|b3_almendra_total):\s*(almendraDerivada|factorDerivado)/.test(b3));
check("B3 ya no tiene escape «no lo sé» nuevo (solo legado)", !/b3:\s*"ft2_b3_na"/.test(vista));
check("el puntaje reportado alimenta ficha_puntaje_estimado", vista.includes("ficha_puntaje_estimado: b2ScoreValido ? numOr(data.b2_score)"));

// ── 3. Los soportes: tope de 7 y re-descarga tras el bloqueo ──────────────
check("MAX_REPORT_FILES = 7", files.includes("export const MAX_REPORT_FILES = 7"));
check("el tope se aplica al subir", files.includes("list.length >= tope(kind)"));
// V5.64: B4 reutiliza ReportFiles en modo «solo fotos» con su propio tope.
check("el modo solo-fotos existe y esconde los PDFs", files.includes("soloFotos") && files.includes("{!soloFotos && fila(\"pdf\", pdfs)}"));
check("un PDF no entra como foto (ni al revés)", files.includes("no es un PDF") && files.includes("es un PDF — súbalo en la casilla"));
check("la descarga es un ANCLA (sobrevive al fieldset disabled)", /<a\s[\s\S]*?Descargar/.test(files));
check("y lo dice en el propio componente", files.includes("fieldset disabled"));
check("B2 monta los soportes", b2.includes("<ReportFiles") && b2.includes("b2_files_pdf"));
check("B3 también", b3.includes("<ReportFiles") && b3.includes("b3_files_pdf"));
// V5.115 (owner): con «No lo sé» marcado los adjuntos desaparecen (y si ya había archivos, se dice que siguen guardados).
check("con «No lo sé», B2 y B3 esconden los soportes", /\{!data\.ft2_b2_na && \(\s*<ReportFiles/.test(b2) && /\{!data\.b3_solo_basica && \(\s*<ReportFiles/.test(b3) && b2.includes("siguen guardados en la Ficha") && b3.includes("siguen guardados en la Ficha"));

// ── 4. La pantalla explica y bosqueja ─────────────────────────────────────
check("B2 lleva la explicación grande", b2.includes("introBig"));
check("y los dos bocetos (red de araña + rueda)", b2.includes("SpiderChart") && b2.includes("TasteWheelSketch"));
check("B2 ofrece la escala SCA/CVA", b2.includes('value="sca"') && b2.includes('value="cva"'));
check("B2 ya no pinta la tabla de 10 atributos", !b2.includes("SCA_ATTRS"));
check("B3 ofrece «No lo sé / solo información básica» y «Tengo un reporte de laboratorio» (V5.109)", b3.includes("No lo sé / solo información básica") && b3.includes("Tengo un reporte de laboratorio"));
check("B3 ya no pinta la granulometría malla a malla", !b3.includes("mesh_supremo_plus"));
check("las dos secciones se rotulan «Reportado por Productor»", b2.includes("reportadoTag") && b3.includes("reportadoTag"));

// ── 5. Soltar un archivo también vale (el cursor prohibido) ───────────────
check("FileDrop maneja dragover con preventDefault", drop.includes("onDragOver") && drop.includes("preventDefault"));
check("y entrega el drop al mismo manejador", drop.includes("dataTransfer.files"));
for (const archivo of [
  "src/components/kaffetal-regal/InfoModal.tsx",
  "src/components/kaffetal-regal/FincaModal.tsx",
  "src/components/kaffetal-regal/ficha/panes/PaneA3.tsx",
  "src/components/kaffetal-regal/ficha/panes/PaneB4.tsx",
]) {
  check(`${archivo.split("/").pop()} usa FileDrop`, lee(archivo).includes("<FileDrop"));
}

if (fallos.length) {
  console.error(`✗ qa-reportado-productor: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-reportado-productor: ${ok} comprobaciones OK, 0 fallos`);
