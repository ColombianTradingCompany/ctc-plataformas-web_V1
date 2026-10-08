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
  // V5.191: «Marcar revisada» se volvió «Hacer revisión» (la sección de abajo); la acción vive en `referenciasActions.ts`.
  check("el OCP lista lo agregado y CTCx lo revisa (acción `emite`, con nota al productor)", leeTexto("src/app/ocp/(app)/kr/LoteSeccion.tsx").includes("<RevisionDeReferencia referencia={r}") && /export async function guardarRevisionDeReferencia[\s\S]{0,320}permisoDeEscritura\("ocp", "emite"\)/.test(leeTexto("src/app/ocp/(app)/referenciasActions.ts")) && leeTexto("src/app/ocp/(app)/referenciasActions.ts").includes('context_label: "Referencia revisada"'));
}

// ── V5.191 (owner, 2026-10-08) · «Hacer revisión»: el adjunto y la planilla —solo el bloque del reporte— lado a lado, prellenada ──
//    «Cambiemos este botón de "Marcar Revisada" por "Hacer Revisión", lo cual abre un panel igual al de la evaluación, pero solo con
//    la parte relevante (solo B2 o solo B3 si es de granulometría). Agrega un script que analice el adjunto para encontrar matches de
//    la información a introducir para tener esto pre-hecho. Haz que el adjunto y la interfaz de evaluación estén en bloques
//    paralelos lado a lado para compararse.»
{
  const { readFileSync: leeArchivo } = await import("node:fs");
  const leeTexto = (ruta) => leeArchivo(new URL(`../${ruta}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const L = await import("../src/lib/kaffetal/lectorDeReportes.ts");
  const E = await import("../src/lib/arena/labEvaluation.ts");
  const R = await import("../src/lib/kaffetal/referencias.ts");
  const acciones = leeTexto("src/app/ocp/(app)/referenciasActions.ts");
  const panel = leeTexto("src/app/ocp/(app)/kr/RevisionDeReferencia.tsx");
  const estilos = leeTexto("src/app/ocp/(app)/kr/revisionDeReferencia.module.css");
  const seccionLote = leeTexto("src/app/ocp/(app)/kr/LoteSeccion.tsx");
  const editor = leeTexto("src/components/bcp/LabEvalEditor.tsx");
  const acta = leeTexto("docs/migraciones/2026-10-08_referencia_planilla_ctcx.sql");
  const extractor = leeTexto("src/lib/kaffetal/textoDelPdf.ts");
  const paneKr = leeTexto("src/components/kaffetal-regal/ficha/panes/PaneReferencias.tsx");

  // Un reporte con el formato de la Federación (la capa de texto de su PDF). DATOS INVENTADOS: el repositorio es público.
  const FNC = [
    "ANÁLISIS FÍSICO DEL PERGAMINO",
    "Porcentaje de humedad 10.5% Factor de rendimiento 89.74",
    "Porcentaje de merma 18.00% Peso almendra (g) 205.00",
    "Porcentaje almendra sana 78.00% Almendra sana (g) 195.00",
    "Granulometría",
    "Nº Gramos %Retenido %Acumulado",
    "Malla 18 40.00 19.51 19.51", "Malla 17 70.00 34.15 53.66", "Malla 16 50.00 24.39 78.05", "Malla 15 30.00 14.63 92.68",
    "Malla 14 10.00 4.88 97.56", "Malla 13 4.00 1.95 99.51", "Malla 12 0.50 0.24 99.76", "Malla 0 0.50 0.24 100.00",
    "ANÁLISIS FÍSICO DE LA ALMENDRA",
    "Porcentaje Almendra defectuosa 4.88% Almendra defectuosa (g) 10.00",
    "Porcentaje broca 0.00% Broca (g) 0.00",
    "Defectos físicos SIN DEFECTOS FISICOS PREDOMINANTES",
    "ANÁLISIS SENSORIAL",
    "Puntaje SCA",
    "84.50",
    "En fragancia y aroma se perciben notas a panela, floral, En sabor se",
    "pueden percibir notas a mandarina, chocolate amargo, Sabor residual",
    "prolongado. Acidez con notas media alta, cítrica. Cuerpo sedoso. En balance se",
    "puede notar que es un café limpio",
    "Ana Prueba - Luis Ensayo",
    "Q Grader",
    "FEDERACIÓN NACIONAL DE CAFETEROS DE COLOMBIA - COMITÉ DE CAFETEROS DE PRUEBA",
    "INFORMACIÓN GENERAL",
    "Documento 1000000 Nombre PRODUCTOR DE PRUEBA",
    "Finca LOTE 1 EL ENSAYO Código SICA 0000000000",
    "Municipio PRUEBAS Vereda LA MUESTRA",
    "Fecha de Análisis 2026-01-15 Fecha de Registro SGR 2026-01-20",
    "Tipo beneficio LAVADO Tipo secado MARQUESINAS",
    'Humedad verde 11.0% Observación Muestra rotulada "Tanque',
    '1"',
    "Muestra: 2026-XX-0001 - Resultado solo válido de manera educativa para la muestra analizada y no podrá ser usado con fines comerciales.",
  ].join("\n");
  const fnc = L.lecturaDeLosDatos(L.leerTextoDeReporte(FNC, { escala: "sca" }));
  const campo = (lectura, clave) => lectura.campos.find((c) => c.clave === clave);
  const vale = (lectura, clave) => Object.values(campo(lectura, clave)?.parche ?? {})[0];
  check("lector · reconoce el formato de la FNC y su total (SCA 2004) y su factor, para compararlos con la planilla",
    fnc.formato === "fnc" && fnc.puntaje?.valor === 84.5 && fnc.puntaje?.protocolo === "sca2004" && fnc.factor === 89.74 && campo(fnc, "protocolo")?.parche.vista === "sca");
  check("lector · B3 leído tal cual: humedad del pergamino (la «humedad» sin apellido de un reporte de pergamino), del verde, factor y almendra",
    vale(fnc, "fa_parch_hum") === "10.5" && vale(fnc, "b3_humedad_verde") === "11" && vale(fnc, "b3_factor_reportado") === "89.74" && vale(fnc, "fa_green_remainder") === "205" &&
    ["fa_parch_hum", "b3_humedad_verde", "b3_factor_reportado", "fa_green_remainder"].every((k) => campo(fnc, k).modo === "leido" && campo(fnc, k).bloque === "b3"));
  check("lector · el pergamino de la muestra se DERIVA de la merma (205 g ÷ 0,82 = 250 g) y los defectos sin separar van a secundarios, INTERPRETADO y avisado",
    vale(fnc, "fa_start") === "250" && campo(fnc, "fa_start").modo === "derivado" && vale(fnc, "fa_secondary_defect") === "10" && campo(fnc, "fa_secondary_defect").modo === "interpretado" &&
    !campo(fnc, "fa_primary_defect") && fnc.avisos.some((a) => a.includes("sin separar primarios de secundarios")));
  check("lector · las mallas van a las de CTCx (13 y 12 juntas en Pea Berry, derivado); lo de menos de 12 lo calcula la planilla como residuo",
    vale(fnc, "mesh_supremo_plus") === "40" && vale(fnc, "mesh_supremo") === "70" && vale(fnc, "mesh_extra") === "50" && vale(fnc, "mesh_europa") === "30" && vale(fnc, "mesh_ugq") === "10" &&
    vale(fnc, "mesh_peaberry") === "4.5" && campo(fnc, "mesh_peaberry").modo === "derivado" && !campo(fnc, "mesh_residue"));
  const planillaFnc = L.aplicaLectura(E.EMPTY_LAB_EVALUATION, fnc.campos, ["b2", "b3"]).planilla;
  const factorFnc = E.computeFactor(planillaFnc);
  const mallasFnc = E.computeMesh(planillaFnc, factorFnc.remainder);
  check("lector · con lo leído, la planilla da el MISMO factor del reporte y las mallas cuadran (residuo 0,5 g)",
    Math.abs(factorFnc.yieldFactor - 89.74) < 0.01 && mallasFnc.state === "ok" && mallasFnc.residueGrams === 0.5);
  check("lector · el perfil es el párrafo tras el puntaje, sin la firma del Q-Grader (que va a la identidad)",
    vale(fnc, "cupping_profile").startsWith("En fragancia y aroma se perciben notas a panela") && vale(fnc, "cupping_profile").endsWith("es un café limpio") &&
    !vale(fnc, "cupping_profile").includes("Ana Prueba") && fnc.identidad.some((i) => i.etiqueta === "Q Grader" && i.valor === "Ana Prueba - Luis Ensayo"));
  const rueda = campo(fnc, "rueda")?.parche;
  check("lector · la rueda con la etapa en que el perfil nombra cada nota; la más larga gana («chocolate amargo», no «chocolate»)",
    rueda && JSON.stringify(rueda.rueda) === JSON.stringify(["floral-floral", "cacao-cacao|chocolate-amargo"]) &&
    JSON.stringify(rueda.rueda_detalle["floral-floral"].etapas) === JSON.stringify(["fragancia", "aroma"]) && JSON.stringify(rueda.rueda_detalle["cacao-cacao|chocolate-amargo"].etapas) === JSON.stringify(["sabor"]));
  check("lector · la acidez y la boca del formato descriptivo: «media alta» → 9 de 15 (interpretado), «sedoso» → Suave, y su frase como comentario",
    vale(fnc, "acidez_intensidad") === "9" && campo(fnc, "acidez_intensidad").modo === "interpretado" && vale(fnc, "acidez_nota") === "Acidez con notas media alta, cítrica." &&
    JSON.stringify(vale(fnc, "boca_texturas")) === JSON.stringify(["smooth"]) && vale(fnc, "boca_nota") === "Cuerpo sedoso.");
  check("lector · «pera» no caza «pero» (una etiqueta en «a» no toma la «o»), y lo que se dice de la acidez no es rueda",
    !L.marcasDelPerfil("notas a chocolate pero suave").ids.some((id) => id.includes("pera")) && L.marcasDelPerfil("Acidez vinosa.").ids.length === 0 && L.marcasDelPerfil("notas vinosas").ids.includes("acido-fermentado|vinoso"));
  check("lector · la identidad del reporte (con el renglón que continúa) y su advertencia de uso; el radar sin texto se avisa",
    fnc.identidad.some((i) => i.etiqueta === "Nombre" && i.valor === "PRODUCTOR DE PRUEBA") && fnc.identidad.some((i) => i.etiqueta === "Observación" && i.valor === 'Muestra rotulada "Tanque 1"') &&
    !fnc.identidad.some((i) => i.etiqueta === "Humedad verde") && fnc.avisos.some((a) => a.includes("no podrá ser usado con fines comerciales")) && fnc.avisos.some((a) => a.includes("en la gráfica")));
  const cotejo = L.cotejoDeIdentidad(fnc.identidad, { productor: "Otra Persona Distinta", finca: "El Ensayo", municipio: "Pruebas", vereda: null });
  check("lector · el cotejo con el lote: la finca y el municipio coinciden, el nombre NO",
    cotejo.find((c) => c.etiqueta === "Finca").coincide === true && cotejo.find((c) => c.etiqueta === "Municipio").coincide === true && cotejo.find((c) => c.etiqueta === "Nombre").coincide === false && cotejo.find((c) => c.etiqueta === "Vereda").coincide === null);

  // Otro laboratorio, con los atributos escritos (SCA 2004) y otro en CVA.
  const sca = L.lecturaDeLosDatos(L.leerTextoDeReporte("Laboratorio de Calidad Ejemplo\nReporte de catación SCA 2004\nFragancia/Aroma: 8.25\nSabor: 8.00\nSabor residual: 7.75\nAcidez: 8.00\nCuerpo: 7.75\nBalance: 8.00\nUniformidad: 10\nTaza limpia: 10\nDulzor: 10\nPuntaje del catador: 8.00\nPuntaje total: 85.75\nNotas de catación: caramelo, naranja, té negro."));
  const planillaSca = L.aplicaLectura(E.toLabEvaluation({}), sca.campos, ["b2"]).planilla;
  check("lector · un reporte con los diez atributos en texto: la planilla queda en SCA 2004 y su total es el del reporte (85,75)",
    sca.formato === "generico" && sca.campos.filter((c) => c.clave.startsWith("sca_")).length === 10 && vale(sca, "sca_aftertaste") === "7.75" && vale(sca, "sca_flavor") === "8" &&
    planillaSca.vista === "sca" && E.computeSca2004(planillaSca).total === 85.75 && JSON.stringify(vale(sca, "rueda")) === JSON.stringify(["frutal-citricos|naranja", "floral-te|te-negro"]));
  const cva = L.lecturaDeLosDatos(L.leerTextoDeReporte("Coffee Value Assessment (CVA)\nFragancia: 7\nAroma: 7.5\nSabor: 7\nSabor residual: 6.5\nAcidez: 7\nDulzor: 7\nSensación en boca: 6.5\nImpresión general: 7\nPuntaje CVA: 89.25"));
  const planillaCva = L.aplicaLectura(E.toLabEvaluation({}), cva.campos, ["b2"]).planilla;
  check("lector · un reporte CVA: las ocho secciones a la planilla en CVA (Fragancia y Aroma aparte) y su total",
    cva.puntaje?.protocolo === "cva" && vale(cva, "cva_aroma") === "7.5" && vale(cva, "cva_mouthfeel") === "6.5" && vale(cva, "cva_overall") === "7" && planillaCva.vista === "cva" && E.computeCva(planillaCva).total === 89.25);

  // La IA (opt-in): su respuesta pasa por el mismo mapeo, saneada.
  const ia = L.lecturaDeLosDatos(L.datosDesdeIa({ protocolo: "sca2004", puntaje: 85.75, sca: { fragrance: 8, flavor: "8,25", aftertaste: 11, cuppers: 8 }, almendra_g: 200, mallas: [{ malla: 18, gramos: null, porcentaje: 20 }, { malla: 17, gramos: 80 }], confianza: "alta", observaciones: "radar legible", inventado: "x" }));
  check("IA · lo que devuelve se sanea (fuera de rango, fuera; coma decimal) y una malla en % pasa a gramos con la almendra (derivado)",
    ia.origen === "ia" && vale(ia, "sca_fragrance") === "8" && vale(ia, "sca_flavor") === "8.25" && !campo(ia, "sca_aftertaste") && vale(ia, "mesh_supremo_plus") === "40" &&
    campo(ia, "mesh_supremo_plus").modo === "derivado" && vale(ia, "mesh_supremo") === "80" && ia.confianza === "alta" && ia.avisos.includes("La IA anota: radar legible"));
  const trabajada = E.toLabEvaluation({ vista: "sca", escala: "sca", sca_fragrance: "7.75" });
  const conIa = L.aplicaLectura(trabajada, ia.campos, ["b2"], { soloVacios: true });
  check("IA · sobre una planilla ya trabajada no pisa nada: llena lo vacío y devuelve lo que difiere como choque",
    conIa.planilla.sca_fragrance === "7.75" && conIa.planilla.sca_flavor === "8.25" && conIa.choques.length === 1 && conIa.choques[0].campo.clave === "sca_fragrance" && conIa.choques[0].actual === "7.75" && conIa.planilla.mesh_supremo === "");
  check("IA · opt-in y con su libro: el botón pide confirmación con el aviso de costo; la acción es `emite`, anota el gasto (`kr:referencia-lector`) y abrir el panel no la llama",
    /confirm\("La lectura con IA[^"]*costo de IA/.test(panel) && panel.indexOf("confirm(") < panel.indexOf("leerReferenciaConIA(referencia.id)") &&
    /export async function leerReferenciaConIA[\s\S]{0,200}permisoDeEscritura\("ocp", "emite"\)/.test(acciones) && acciones.includes("superficie: USOS.referenciaLector") &&
    acciones.includes("system: LECTOR_IA_SYSTEM") && leeTexto("src/lib/ai/consumo.ts").includes('referenciaLector: "kr:referencia-lector"') &&
    !/const abrir = [\s\S]{0,400}leerReferenciaConIA/.test(panel) && !seccionLote.includes("leerReferencia"));

  // Los bloques: la planilla de la revisión enseña solo el del reporte.
  check("bloques · un reporte de taza revisa B2; uno físico, B3; una foto o un video, nada",
    JSON.stringify(R.bloquesDeLaReferencia("taza")) === '["b2"]' && JSON.stringify(R.bloquesDeLaReferencia("fisico")) === '["b3"]' && R.bloquesDeLaReferencia("foto").length === 0 && R.bloquesDeLaReferencia("video").length === 0);
  check("bloques · el editor de la planilla enseña solo los bloques pedidos (por defecto, los dos) y sin B2 el idioma pasa a B3",
    editor.includes("bloques = BLOQUES_DE_PLANILLA,") && editor.includes('const verB2 = bloques.includes("b2");') && editor.includes("{verB2 && (") && editor.includes("{verB3 && (") && editor.includes("{!verB2 && selectorDeIdioma}"));
  const recortada = E.recortaABloques(planillaFnc, ["b2"]);
  const fila = R.filaDePlanillaCtcx({ ...planillaFnc, inventado: "x" }, ["b3"]);
  check("bloques · lo que se guarda lleva solo los bloques revisados y solo campos de la planilla (nada que agregue el navegador)",
    recortada.fa_green_remainder === "" && recortada.mesh_supremo === "" && recortada.cupping_profile !== "" && fila.version === 1 && JSON.stringify(fila.bloques) === '["b3"]' &&
    fila.planilla.cupping_profile === "" && fila.planilla.fa_green_remainder === "205" && !("inventado" in fila.planilla) && E.bloqueDeLaClave("mesh_peaberry") === "b3" && E.bloqueDeLaClave("sca_body") === "b2");
  check("bloques · el resumen de una línea que leen el OCP y el productor",
    R.resumenDePlanillaCtcx(fila).startsWith("Análisis físico en formato CTCx: factor 89.74 · humedad del pergamino 10.5 %") &&
    R.resumenDePlanillaCtcx(R.filaDePlanillaCtcx(planillaSca, ["b2"])) === "Perfil de taza en formato CTCx: SCA 2004 85.75 · vale lo mismo en CVA" &&
    R.rowToReferencia({ id: "1", lot_id: "L", tipo: "taza", asset_id: "A", file_name: "r.pdf", emisor: null, puntaje: null, escala: null, factor: null, nota: null, revision_solicitada_at: null, revisada_at: "t", nota_ctc: null, planilla_ctcx: fila, created_at: "t" }).planillaCtcx?.planilla.fa_green_remainder === "205");

  // La pantalla: el botón, el panel lado a lado, la lectura al abrir.
  check("panel · «Hacer revisión» reemplaza a «Marcar revisada»; ya revisada (con planilla) se puede «Ver la revisión»",
    !seccionLote.includes("Marcar revisada") && seccionLote.includes("(estado !== \"revisada\" || r.planillaCtcx) && <RevisionDeReferencia") && panel.includes('"Hacer revisión"') && panel.includes('"Ver la revisión"') &&
    !leeTexto("src/app/ocp/(app)/evaluationActions.ts").includes("export async function revisarReferencia"));
  check("panel · el adjunto (el PDF en su visor, o la foto) y la planilla van en dos columnas paralelas que corren cada una por su cuenta",
    /\.cuerpo \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/.test(estilos) && /\.planilla \{[^}]*overflow: auto/.test(estilos) &&
    panel.includes("<iframe className={css.visor} src={adjunto.url}") && panel.includes("<LabEvalEditor value={planilla} onChange={cambiar} disabled={soloVer || pending} lang={lang} onLang={setLang} ocultaGrado bloques={bloques} />"));
  check("panel · al abrir, el lector lee el texto (gratis) y prellena SOLO el bloque del reporte, sin pisar lo que el revisor ya escribió; el otro bloque se incluye si él quiere",
    /const abrir = [\s\S]{0,500}leerReferencia\(referencia\.id\)/.test(panel) && panel.includes("aplicaLectura(planillaRef.current, r.lectura.campos, propios, { soloVacios: true })") &&
    panel.includes("Incluir también {NOMBRE_DEL_BLOQUE[otro]}") && panel.includes("Puntaje del reporte") && panel.includes("Factor del reporte"));
  check("acciones · leer es solo lectura (descarga y lee, no escribe) y la capa de texto la saca `unpdf` en un módulo de solo servidor",
    /export async function leerReferencia\([\s\S]{0,400}await requireActiveAdmin\(\);/.test(acciones) &&
    !/\.(insert|update|upsert|delete)\(|registrarConsumo/.test(acciones.slice(acciones.indexOf("export async function leerReferencia("), acciones.indexOf("export async function leerReferenciaConIA("))) &&
    extractor.startsWith('import "server-only";') && extractor.includes('await import("unpdf")') && JSON.parse(leeTexto("package.json")).dependencies.unpdf);
  check("acciones · guardar es `emite`, una sola vez, con la planilla saneada (o una nota que diga por qué no) y avisa al productor",
    /export async function guardarRevisionDeReferencia[\s\S]{0,320}permisoDeEscritura\("ocp", "emite"\)/.test(acciones) && acciones.includes('.is("revisada_at", null)') &&
    acciones.includes("const fila = filaDePlanillaCtcx(entrada.planilla, bloques);") && acciones.includes("planilla_ctcx: conDatos ? fila : null,") && acciones.includes("if (!conDatos && !nota)") &&
    acciones.includes('context_label: "Referencia revisada"'));
  check("base · dos columnas de CTCx (nulas), sin revisión no hay planilla ni lectura, y el productor no puede insertarlas",
    acta.includes("add column if not exists planilla_ctcx jsonb") && acta.includes("add column if not exists lectura_ctcx jsonb") &&
    acta.includes("check ((planilla_ctcx is null and lectura_ctcx is null) or revisada_at is not null)") &&
    acta.includes("and planilla_ctcx is null and lectura_ctcx is null") && acta.includes("revisada_at is null and revisada_por is null and nota_ctc is null"));
  check("productor · ve su referencia revisada con el resumen del formato CTCx", paneKr.includes("{r.planillaCtcx && <div>{resumenDePlanillaCtcx(r.planillaCtcx)}</div>}"));
}

// ── V5.192 (owner, 2026-10-08) · «Lo que ya agregó» arriba, y el formulario en blanco después de enviar ──
//    «En KR, una vez se envíen nuevas referencias, estas deben quedar en el bloque "Lo que ya agregó a este lote", el cual debe
//    aparecer arriba cuando haya al menos un entry. Además, una vez enviado, la parte de casillas de formulario deben quedar limpias
//    de nuevo, permitiendo agregar más.»
{
  const { readFileSync: leeArchivo } = await import("node:fs");
  const pane = leeArchivo(new URL("../src/components/kaffetal-regal/ficha/panes/PaneReferencias.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const lista = pane.indexOf("Lo que ya agregó a este lote ({referencias.length})");
  check("V5.192 · la lista de lo agregado va ARRIBA de los cuatro bloques y solo cuando hay al menos uno",
    lista > 0 && lista < pane.indexOf('<Bloque tipo="taza"') && pane.includes("{referencias.length > 0 && (") && !pane.includes("Todavía no ha agregado nada"));
  check("V5.192 · un reporte ya no se agrega al elegir el archivo: queda elegido y se envía con «Agregar este reporte»; una foto o un video, sí al elegirlos",
    pane.includes("if (!reporte) return void agregar(file);") && pane.includes("setArchivo(file);") && pane.includes("onClick={() => void agregar(archivo)}") &&
    pane.includes('"Agregar este reporte"') && pane.includes("<FileDrop onFile={(file) => elegir(file)}>") && !pane.includes("void agregar(file);\n            }}"));
  const enBlanco = pane.slice(pane.indexOf("function enBlanco()"), pane.indexOf("function empiezaOtro()"));
  check("V5.192 · enviado, TODO queda en blanco: los datos, la casilla, el archivo elegido y el selector (su `key`)",
    ["setEmisor(\"\")", "setPuntaje(\"\")", "setEscala(\"\")", "setFactor(\"\")", "setNota(\"\")", "setPedirRevision(false)", "setArchivo(null)", "setSelector((n) => n + 1)"].every((x) => enBlanco.includes(x)) &&
    pane.includes("key={selector}") && /setHecho\(`✓ \$\{file\.name\} agregado[\s\S]{0,200}`\);\n\s*enBlanco\(\);\n\s*return true;/.test(pane));
  check("V5.192 · al empezar el siguiente, el aviso del anterior se va (cada campo llama a `empiezaOtro`)",
    (pane.match(/onChange=\{\(e\) => \{ empiezaOtro\(\); set/g) ?? []).length === 6 && pane.includes('if (up.state.status === "done") up.reset();'));
}

if (fallos.length) {
  console.error(`✗ qa-kr-ficha: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-kr-ficha: ${ok} comprobaciones OK, 0 fallos`);
