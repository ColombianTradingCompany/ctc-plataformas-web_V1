// Guardián de la Ficha Técnica y el pop-up de Finca en el TELÉFONO
// (tanda de retroalimentación del owner, 2026-08-20).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-kr-ficha-check.mjs
//
// EL FALLO QUE LO TRAE, y por qué merece guardián: los FABs («Ayuda» y «Guardar
// Ficha») estaban `position:fixed` en la esquina inferior derecha del viewport.
// La barra de acciones pegajosa pone sus botones EN ESA MISMA ESQUINA. En un
// teléfono se posaban justo encima de «Completar FT2 y continuar»: el productor
// tocaba el FAB creyendo tocar el botón, la etapa no avanzaba, y el defecto se
// reportó como «la FT2 tiene un impasse que bloquea la continuación».
//
// No era un impasse. Era un botón tapado. Y no lo cantaba nada: ni tsc, ni
// eslint, ni el build — dos elementos posicionados que se solapan son CSS
// perfectamente válido.
//
// LO QUE PROTEGE:
//   1. Que ningún FAB de estas dos superficies vuelva a ser `position:fixed`.
//      Es la causa raíz; cualquier otra aserción sobre el síntoma se puede
//      satisfacer sin arreglarla.
//   2. Que los FABs sigan RENDERIZÁNDOSE dentro de su contenedor anclado. Si
//      alguien los saca de ahí, el CSS deja de sujetarlos aunque la regla siga
//      escrita.
//   3. Que la fila de acciones pueda envolver. Sin `flex-wrap` no baja de su
//      ancho de contenido y el botón que se sale por la derecha es el principal.
//   4. Que toda clase de CSS module que se usa EXISTA (la trampa de la V4.30:
//      una clase inexistente sale `undefined` y el elemento se pinta desnudo,
//      en silencio). PaneA3 estrenó `.noteBox` en FichaView.module.css, donde
//      no existía — este chequeo lo habría cazado antes de mirar la pantalla.
//   5. La aritmética de la granulometría, en los DOS sentidos. El aviso viejo
//      solo podía detectar pasarse: como el Residuo absorbe la diferencia, la
//      suma daba 100,0 % siempre que las mallas pesaran de menos. Pesar una y
//      olvidar las otras cinco salía «impecable».

import { readFileSync } from "node:fs";
import { computeMesh } from "../src/components/kaffetal-regal/ficha/fichaCalculations.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

// ── 1-3. Los FABs no vuelven a la esquina del viewport ─────────────────────
{
  const casos = [
    {
      css: "src/components/kaffetal-regal/FichaView.module.css",
      tsx: "src/components/kaffetal-regal/FichaView.tsx",
      contenedor: "fabStack",
    },
    {
      css: "src/components/kaffetal-regal/FincaModal.module.css",
      tsx: "src/components/kaffetal-regal/FincaModal.tsx",
      contenedor: "fabDock",
    },
  ];
  for (const { css, tsx, contenedor } of casos) {
    const hoja = lee(css);
    // La regla de cada FAB, aislada, para no confundirla con otra declaración
    // del archivo (el `.flash`, por ejemplo, sí es fixed y debe seguir siéndolo).
    for (const clase of ["fab", "fabHelp", "helpBox"]) {
      const m = hoja.match(new RegExp(`^\\.${clase}\\{([^}]*)\\}`, "m"));
      check(`${css}: existe la regla .${clase}`, !!m);
      if (m) check(`${css}: .${clase} NO es position:fixed`, !/position:\s*fixed/.test(m[1]));
    }
    const fuente = lee(tsx);
    check(`${css}: define el contenedor .${contenedor}`, new RegExp(`^\\.${contenedor}\\{`, "m").test(hoja));
    check(`${tsx}: los FABs se pintan dentro de .${contenedor}`, fuente.includes(`styles.${contenedor}`));
    // El contenedor tiene que estar ANCLADO a algo, no suelto.
    const reglaCont = hoja.match(new RegExp(`^\\.${contenedor}\\{([\\s\\S]*?)\\}`, "m"));
    check(
      `${css}: .${contenedor} está anclado (absolute o sticky), no fixed`,
      !!reglaCont && /position:\s*(absolute|sticky)/.test(reglaCont[1]) && !/position:\s*fixed/.test(reglaCont[1])
    );
  }

  const fv = lee("src/components/kaffetal-regal/FichaView.module.css");
  const csvRow = fv.match(/^\.csvRow\{([^}]*)\}/m);
  check("FichaView: la fila de acciones existe", !!csvRow);
  check("FichaView: y puede envolver (flex-wrap)", !!csvRow && /flex-wrap:\s*wrap/.test(csvRow[1]));
}

// ── V5.102 (owner, 2026-09-30) · «Borrar» con la frase escrita, y la finca a pantalla completa como la Ficha ──
{
  const ke = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
  const modal = lee("src/components/kaffetal-regal/ConfirmarBorradoModal.tsx");
  const fincaView = lee("src/components/kaffetal-regal/FincaView.tsx");
  const fichaView = lee("src/components/kaffetal-regal/FichaView.tsx");
  const fincaModal = lee("src/components/kaffetal-regal/FincaModal.tsx");
  check("la frase que se escribe es «Borrar Lote» / «Borrar Finca», y el botón no se habilita sin ella", modal.includes('{ lote: "Borrar Lote", finca: "Borrar Finca" }') && modal.includes("texto.trim() === frase") && modal.includes("disabled={!coincide || busy}"));
  check("KR ya no confirma con window.confirm: los dos borrados pasan por el pop-up escrito", !ke.includes("window.confirm") && ke.includes('setBorrado({ tipo: "lote"') && ke.includes('tipo: "finca"') && ke.includes("<ConfirmarBorradoModal"));
  check("los dos DELETE piden .select(\"id\") y tratan cero filas como fallo (la RLS no devuelve error)", /from\("lots"\)\.delete\(\)\.eq\("id", borrado\.id\)\.select\("id"\)/.test(ke) && /from\("fincas"\)\.delete\(\)\.eq\("id", borrado\.id\)\.select\("id"\)/.test(ke) && (ke.match(/if \(error \|\| !data\?\.length\)/g) ?? []).length >= 2);
  check("«Borrar» está DENTRO de la pantalla de edición del lote y de la finca, solo cuando la regla lo permite", fichaView.includes("onDelete?: () => void") && ke.includes("onDelete={!isLotCommitted(curLot) && curLot.source !== \"bcp_manual_entry\"") && fincaModal.includes("Borrar Finca") && ke.includes("onDelete={fincaEnEdicion && fincaSelfDeletable(fincaEnEdicion, lots)"));
  // V5.112 (owner): registrar una finca nueva TAMBIÉN es la página; el pop-up FincaModal no existe.
  check("editar y registrar una finca son la página completa con la cabecera de la Ficha (sin pop-up)", fincaView.includes("styles.appTop") && fincaView.includes("<FincaEditorBody") && fincaView.includes("finca: Finca | null") && ke.includes('setFincaOrigen("ficha");') && !ke.includes("<FincaModal") && !ke.includes("fincaModalOpen") && !fincaModal.includes("<Modal"));
  check("la página de la finca y el pop-up de borrado son capas del botón atrás", ke.includes('(view === "finca" ? 1 : 0)') && ke.includes("(borrado ? 1 : 0)") && ke.includes("else if (borrado) setBorrado(null);"));
  // V5.107 (owner): la Información general también es una página completa, y otra capa del botón atrás.
  const infoView = lee("src/components/kaffetal-regal/InfoView.tsx");
  check("la Información general es una página completa con la cabecera de la Ficha, sin pop-up", infoView.includes("styles.appTop") && infoView.includes("<InfoEditorBody") && ke.includes('onOpenInfoModal={() => setView("info")}') && ke.includes('(view === "info" ? 1 : 0)') && !ke.includes("infoModalOpen") && !lee("src/components/kaffetal-regal/InfoModal.tsx").includes("<Modal"));
}

// ── 4. Ninguna clase de CSS module usada se quedó sin definir ──────────────
// (la trampa de la V4.30, aplicada a los archivos que esta tanda tocó)
{
  const pares = [
    ["src/components/kaffetal-regal/FichaView.tsx", { styles: "src/components/kaffetal-regal/FichaView.module.css" }],
    ["src/components/kaffetal-regal/FincaModal.tsx", { styles: "src/components/kaffetal-regal/FincaModal.module.css" }],
    [
      "src/components/kaffetal-regal/ficha/panes/PaneB3.tsx",
      {
        styles: "src/components/kaffetal-regal/FichaView.module.css",
        bstyles: "src/components/kaffetal-regal/ficha/panes/PaneB3.module.css",
      },
    ],
    ["src/components/kaffetal-regal/ficha/panes/PaneA3.tsx", { styles: "src/components/kaffetal-regal/FichaView.module.css" }],
    ["src/components/kaffetal-regal/ficha/panes/PaneB1.tsx", {
      styles: "src/components/kaffetal-regal/FichaView.module.css",
      vstyles: "src/components/kaffetal-regal/ficha/panes/PaneB1.module.css",
    }],
  ];
  for (const [tsx, alias] of pares) {
    const src = lee(tsx).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const [nombre, hojaRuta] of Object.entries(alias)) {
      const definidas = new Set([...lee(hojaRuta).matchAll(/^\.([a-zA-Z][\w-]*)/gm)].map((m) => m[1]));
      for (const m of src.matchAll(new RegExp(`\\b${nombre}\\.([a-zA-Z][\\w]*)`, "g"))) {
        check(`${tsx}: «${nombre}.${m[1]}» existe en ${hojaRuta.split("/").pop()}`, definidas.has(m[1]));
      }
    }
  }
}

// ── 5. Objetivos táctiles y anchura de los pop-up de consola ───────────────
{
  const g = lee("src/app/globals.css");
  check("globals: hay un bloque para punteros gruesos (dedos)", /@media\s*\(pointer:\s*coarse\)/.test(g));
  const coarse = g.slice(g.indexOf("@media (pointer: coarse)"));
  check("globals: .btn-sm alcanza el objetivo táctil de 44 px", /\.btn-sm\{[^}]*min-height:\s*44px/.test(coarse));
  check("globals: las casillas crecen con el dedo", /input\[type=checkbox\][^{]*\{[^}]*width:\s*22px/.test(coarse));
  check("globals: existe el pop-up ancho de revisión", /^\.modal-wide\{/m.test(g));

  // Y que las consolas lo USEN: definirla sin aplicarla no ensancha nada. (`FincaModalRow` salió de esta lista
  // en la V5.61: la tabla única abre una vista completa, no un pop-up, y el componente se retiró.)
  for (const ruta of [
    "src/app/bcp/(app)/arena/ArenaClient.tsx",
    "src/app/ocp/(app)/nominados/NominadosClient.tsx",
  ]) {
    const src = lee(ruta);
    check(`${ruta}: usa modal-wide`, src.includes('"modal modal-wide"'));
    check(`${ruta}: y ya no fija un ancho a mano`, !/className="modal"\s+style=\{\{\s*maxWidth/.test(src));
  }
}

// ── 6. La granulometría avisa en LOS DOS sentidos ──────────────────────────
{
  const vacio = { mesh_supremo_plus: "", mesh_supremo: "", mesh_extra: "", mesh_europa: "", mesh_ugq: "", mesh_peaberry: "", mesh_residue: "" };
  // V5.144 (owner): la BASE de las mallas es el trillado verde restante (los defectos ya van dentro), no el grano sano.
  const sano = 200; // gramos de la base (el trillado verde restante)

  check("sin grano sano no se juzga nada", computeMesh(vacio, 0).state === "sin_base");
  check("con grano sano y ninguna malla pesada: vacío", computeMesh(vacio, sano).state === "vacio");

  // EL CASO DEL DEFECTO: una sola malla pesada, cinco olvidadas. Antes esto
  // daba «Suma de mallas: 100,0 %» y se veía perfecto.
  const unaSola = computeMesh({ ...vacio, mesh_europa: "50" }, sano);
  check("una malla de seis ⇒ se avisa que faltan mallas", unaSola.state === "residuo_alto");
  check("y se dice CUÁNTOS gramos faltan por repartir", unaSola.pendingGrams === 150);
  check("el total seguía diciendo 100 % — por eso no bastaba", Math.round(unaSola.totalPct) === 100);

  // Pasarse sigue detectándose.
  const pasado = computeMesh({ ...vacio, mesh_europa: "150", mesh_supremo: "120" }, sano);
  check("mallas por encima del grano sano ⇒ se pasó", pasado.state === "excede");
  check("y se dice en cuánto se pasó", pasado.pendingGrams === -70);

  // Un reparto realista cuadra y no molesta.
  const bien = computeMesh(
    { ...vacio, mesh_supremo_plus: "20", mesh_supremo: "60", mesh_extra: "55", mesh_europa: "40", mesh_ugq: "15", mesh_peaberry: "5" },
    sano
  );
  check("un reparto completo cuadra", bien.state === "ok");
  check("y el residuo queda en lo que sobra", bien.residueGrams === 5);
  check("con un residuo creíble (≤5 %)", bien.residuePct <= 5);
}

// ── 7. Lo que la compuerta le dice al productor ────────────────────────────
{
  const fv = lee("src/components/kaffetal-regal/FichaView.tsx");
  // Sin comentarios: el propio código CITA el texto viejo para explicar por qué
  // se cambió, y esa cita no es el aviso. Comprobar el archivo en crudo hacía
  // fallar al guardián por su propia documentación.
  const fvCodigo = fv.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  check("el aviso ya no recita la etapa entera", !fvCodigo.includes("Complete A3, A4, B2 y B3"));
  check("hay un mapa de «qué falta» por pane", fv.includes("QUE_FALTA"));
  check("y nombra el índice del pane (A1, B2, …)", /A1 · Identidad/.test(fv) && /B2 · Perfil de Taza/.test(fv));
  check("el aviso respeta los saltos de línea", fv.includes('whiteSpace: "pre-line"'));
}

// ── 8. El canal interno, no el correo ──────────────────────────────────────
{
  const ke = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
  check("«Solicitar revisión» ya no abre un mailto:", !/mailto:[^`"']*Revisi/.test(ke) && !ke.includes("window.location.href = `mailto:"));
  check("y va por producer_comm_log como el resto", ke.includes("enviarRevisionFinca") && ke.includes("requestFincaHelp"));
  const rp = lee("src/components/kaffetal-regal/RetroalimentacionPanel.tsx");
  check("el hilo llama al productor por su nombre", rp.includes("nombreProductor") && !rp.includes('? "Usted" : "CTC"'));
}

// ── V5.143 (owner, 2026-10-02) · fotos y video OPCIONALES, imagen por defecto y «Agregar Referencias, Fotos y Videos» ──
{
  const { existsSync, readFileSync: leeArchivo } = await import("node:fs");
  const leeTexto = (ruta) => leeArchivo(new URL(`../${ruta}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const { IMAGEN_DE_ORIGEN_POR_DEFECTO, imagenDeOrigen } = await import("../src/lib/imagenDeOrigen.ts");
  const R = await import("../src/lib/kaffetal/referencias.ts");
  const b4 = leeTexto("src/components/kaffetal-regal/ficha/panes/PaneB4.tsx"), vista = leeTexto("src/components/kaffetal-regal/FichaView.tsx");
  const nav = leeTexto("src/components/kaffetal-regal/ficha/FichaNav.tsx"), pane = leeTexto("src/components/kaffetal-regal/ficha/panes/PaneReferencias.tsx");
  const ke = leeTexto("src/components/kaffetal-regal/KaffetalExperience.tsx"), acta = leeTexto("docs/migraciones/2026-10-02_lot_referencias_y_fotos_opcionales.sql");

  check("B4: las fotos ya no detienen la Ficha (ni mínimo, ni compuerta)", !b4.includes("B4_FOTOS_MINIMO") && !vista.includes("B4_FOTOS_MINIMO") && vista.includes("const fotosReady = true;") && b4.includes("Las fotos y el video son opcionales"));
  check("B4: sin fotos ni video se AVISA que son parte del atractivo y se recomienda subir algo, y se deja seguir", b4.includes("parte del atractivo de su café") && b4.includes("Le recomendamos subir al menos una foto") && vista.includes("if (!conMedios && !window.confirm(AVISO_SIN_MEDIOS)) return;"));
  check("B4: el productor ve cuál es la imagen por defecto antes de decidir", b4.includes("{!hayMedios && (") && b4.includes("src={IMAGEN_DE_ORIGEN_POR_DEFECTO}"));
  check("la base ya no exige las dos fotos (el trigger se retiró)", acta.includes("drop trigger if exists trg_guard_lot_fotos_intake on public.lots;") && acta.includes("drop function if exists public.guard_lot_fotos_intake();"));
  check("la imagen por defecto existe en /public y es UNA constante", existsSync(new URL(`../public${IMAGEN_DE_ORIGEN_POR_DEFECTO}`, import.meta.url)) && imagenDeOrigen(null) === IMAGEN_DE_ORIGEN_POR_DEFECTO && imagenDeOrigen("  ") === IMAGEN_DE_ORIGEN_POR_DEFECTO && imagenDeOrigen("https://x/y.jpg") === "https://x/y.jpg");
  check("la finca sin foto de perfil usa la misma imagen (ya no el placeholder viejo)", leeTexto("src/components/kaffetal-regal/panel/PerfilTab.tsx").includes("src={imagenDeOrigen(f.profilePhotoUrl)}") && !existsSync(new URL("../public/images/kaffetal-regal/finca-placeholder.jpg", import.meta.url)));
  check("el OCP dice cuándo lo que ve es la imagen por defecto y no una foto del productor", leeTexto("src/app/ocp/(app)/kr/LoteSeccion.tsx").includes("Sin fotos del productor — el lote se muestra con la imagen por defecto de CTCx") && !leeTexto("src/app/ocp/(app)/kr/EvaReviewCard.tsx").includes("mínimo 2"));

  check("menú: «Agregar Referencias, Fotos y Videos» va justo debajo de «Ficha (vista final)» y se abre con la Ficha cerrada", /\{ id: "ficha", [^\n]*substage: 4 \},\n[^\n]*\n\s*\{ id: "refs", idx: "＋", label: "Agregar Referencias, Fotos y Videos", substage: 4 \},/.test(nav) && vista.includes("refs: 4 }"));
  check("vista final: el botón nuevo, solo con la Ficha cerrada", vista.includes('{effectiveIntakeStep >= 4 && (') && vista.includes('onClick={() => setActive("refs")}') && vista.includes("＋ Agregar Referencias, Fotos y Videos"));
  check("la pantalla ofrece los cuatro bloques (taza, físico, fotos, videos)", ["taza", "fisico", "foto", "video"].every((t) => pane.includes(`<Bloque tipo="${t}"`)));
  check("la pantalla SOLO agrega: no hay botón de quitar ni de reemplazar", !/Quitar|Eliminar|Borrar|Reemplazar/.test(pane.replace(/\/\/[^\n]*/g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "")) && pane.includes("no se puede retirar"));
  check("de un reporte se puede pedir revisión (al agregarlo o después); de una foto o un video, no", R.esReporte("taza") && R.esReporte("fisico") && !R.esReporte("foto") && !R.esReporte("video") && pane.includes("Pedir a CTCx que revise este reporte") && pane.includes('estado === "sin_pedir"') && ke.includes('supabase.rpc("solicitar_revision_de_referencia", { p_id: ref.id })'));
  const fila = R.filaDeReferencia("L", "P", { tipo: "taza", assetId: "A", fileName: "r.pdf", emisor: " Lab ", puntaje: "85,75", escala: "sca", factor: "92", nota: " ok ", pedirRevision: true }, "2026-10-02T00:00:00Z");
  check("la fila de un reporte de taza: emisor, puntaje y escala; sin factor; con la revisión pedida", fila.emisor === "Lab" && fila.puntaje === 85.75 && fila.escala === "sca" && fila.factor === null && fila.nota === "ok" && fila.revision_solicitada_at === "2026-10-02T00:00:00Z" && fila.lot_id === "L" && fila.producer_id === "P");
  const foto = R.filaDeReferencia("L", "P", { tipo: "foto", assetId: "A", fileName: "f.jpg", emisor: "x", puntaje: "90", pedirRevision: true }, "t");
  check("la fila de una foto no lleva datos de reporte ni revisión", foto.emisor === null && foto.puntaje === null && foto.escala === null && foto.factor === null && foto.revision_solicitada_at === null);
  check("un reporte pide quién lo emitió, y sus cifras van en rango", R.errorDeReferencia({ tipo: "taza", emisor: "" }) !== null && R.errorDeReferencia({ tipo: "taza", emisor: "Lab", puntaje: "101" }) !== null && R.errorDeReferencia({ tipo: "fisico", emisor: "Lab", factor: "20" }) !== null && R.errorDeReferencia({ tipo: "taza", emisor: "Lab", puntaje: "86.5" }) === null && R.errorDeReferencia({ tipo: "foto" }) === null);
  const leida = R.rowToReferencia({ id: "1", lot_id: "L", tipo: "fisico", asset_id: "A", file_name: "g.pdf", emisor: "Lab", puntaje: null, escala: null, factor: "92.5", nota: null, revision_solicitada_at: "t", revisada_at: null, nota_ctc: null, created_at: "t" });
  check("una fila de la base se lee con su estado; un tipo desconocido se descarta", leida.factor === 92.5 && R.estadoDeReferencia(leida) === "en_revision" && R.estadoDeReferencia({ ...leida, revisadaAt: "t" }) === "revisada" && R.estadoDeReferencia({ ...leida, revisionSolicitadaAt: null }) === "sin_pedir" && R.estadoDeReferencia({ ...leida, tipo: "foto" }) === "no_aplica" && R.rowToReferencia({ ...leida, tipo: "otro" }) === null);
  check("el resumen de una referencia, en una línea", R.resumenDeReferencia({ tipo: "taza", emisor: "Lab X", puntaje: 86.5, escala: "sca", factor: null }) === "Reporte de perfil de taza · Lab X · 86.5 (SCA)");
  check("los archivos suben a la carpeta del lote (el borrado nuclear los recoge por patrón)", pane.includes("`lots/${lot.id}/refs/${tipo}-${Date.now()}`"));
  check("la tabla es de solo AGREGAR: políticas de SELECT e INSERT, ninguna de UPDATE ni DELETE", (acta.match(/create policy /g) ?? []).length === 2 && acta.includes("for select to authenticated") && acta.includes("for insert to authenticated") && !/for (update|delete|all) /.test(acta) && acta.includes("enable row level security"));
  check("solo sobre un lote propio con la Ficha cerrada y un archivo propio; sin tocar los campos de CTCx", acta.includes("(coalesce(l.intake_step, 0) >= 4 or l.stage::text <> 'borrador')") && acta.includes("m.uploaded_by = (select auth.uid())") && acta.includes("revisada_at is null and revisada_por is null and nota_ctc is null"));
  check("el OCP lista lo agregado y CTCx lo marca revisado (acción `emite`, con nota al productor)", leeTexto("src/app/ocp/(app)/kr/LoteSeccion.tsx").includes("revisarReferencia.bind(null, r.id)") && /export async function revisarReferencia[\s\S]{0,260}permisoDeEscritura\("ocp", "emite"\)/.test(leeTexto("src/app/ocp/(app)/evaluationActions.ts")) && leeTexto("src/app/ocp/(app)/evaluationActions.ts").includes('context_label: "Referencia revisada"'));
}

if (fallos.length) {
  console.error(`✗ qa-kr-ficha: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-kr-ficha: ${ok} comprobaciones OK, 0 fallos`);
