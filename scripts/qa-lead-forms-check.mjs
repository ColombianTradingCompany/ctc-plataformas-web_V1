// Guardián de la INTERFAZ DE LEADS (V6.2, owner 2026-10-10): los formularios de captación de ferias (el primero, SCAJ 2026).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-lead-forms-check.mjs
//
// GRATIS y sin red: ejercita los módulos puros (`src/lib/leadForms/{campos,registro,correos,ejemplos}.ts`) con casos y lee las
// fuentes. QUÉ VIGILA:
//   (1) la tabla de campos de la especificación del owner: a quién se muestra cada campo, qué valores se guardan, lo obligatorio,
//       «lo que no se marca no se guarda» y «lo invisible para el tipo no se guarda aunque venga»; los granos 0-5;
//   (2) los textos en ES · EN · JA con las MISMAS claves (una opción sin rótulo en un idioma falla) y el idioma inicial del navegador;
//   (3) los correos: abren con lo más valorado, enfocan por tipo, responden a `wants`, añaden el Master Roaster, llevan baja, el
//       japonés cae a inglés, y NO INVENTAN (ni cifras de dinero, ni puntajes, ni plazos de envío, ni condiciones del Sample Pack);
//   (4) la base: RLS sin políticas en las dos tablas, un solo formulario activo, bucket privado, idempotencia única;
//   (5) la página pública (honeypot, sello, idempotencia, borrador, teclado de correo, áreas táctiles, «Registrar a otra persona»),
//       la cabecera de CTC Home (la insignia solo con formulario activo), el rail de la LCP, la lista blanca de borradores, el cron;
//   (6) la configuración: los dos interruptores de correo nacían apagados (V6.2) y desde la V6.5 nacen ENCENDIDOS (booleanos estrictos);
//   (7) V6.4 (owner, 2026-10-11): el formulario en DOS pasos (el tipo en un desplegable; el paso 2 opcional, prellenado en el correo y
//       completable desde un enlace firmado que vuelve al MISMO registro), el código del registro en el asunto, el correo en HTML y texto,
//       y el PDF de confirmación con la casa y sus redes;
//   (8) V6.5 (owner, 2026-10-12): la respuesta automática con el PDF ADJUNTO y el seguimiento con copia a la casa, el PDF con «Tus
//       respuestas» y «Qué sigue» a la medida, tomar la foto con la cámara, la cookie que vuelve a la confirmación al recargar, la
//       necesidad de volumen (periodo + dial de kilos), «¿qué lote te llamó la atención?» (los lotes de la vitrina) y LCL / «otro».

import { existsSync, readFileSync } from "node:fs";
import {
  CAMPOS_PASO_2, COLUMNAS_CSV, COMPRADORES, IDIOMAS, OPCIONES, TIPOS_DE_PARTICIPANTE, VISIBILIDAD, VOLUMEN_KG_MAX, VOLUMEN_KG_MIN, VOLUMEN_KG_PASO, codigoDeLead, csvDeLeads,
  esComprador, idiomaInicial, limpiarComplemento, limpiarValores, nombreDeCookieDeRegistro, preguntasDelPaso2, validarEnvio, valoresPrincipales, venceElSeguimiento, visible,
} from "../src/lib/leadForms/campos.ts";
import { CONFIG_POR_DEFECTO, FORMULARIOS, configDe, formulario, formularioActivoDe } from "../src/lib/leadForms/registro.ts";
import { construirCorreoInmediato, construirSeguimiento, fraseDeVolumen, idiomaDelCorreo, preguntasPrellenadas } from "../src/lib/leadForms/correos.ts";
import { leadsDeEjemplo } from "../src/lib/leadForms/ejemplos.ts";

let ok = 0;
const fallos = [];
const check = (n, c, detalle = "") => (c ? ok++ : fallos.push(n + (detalle ? ` — ${detalle}` : "")));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const existe = (r) => existsSync(new URL(`../${r}`, import.meta.url));

// ── 1. La tabla de campos ──────────────────────────────────────────────────────────────────────────────────────────────────
{
  check("1 · ocho tipos de participante, cuatro compradores", TIPOS_DE_PARTICIPANTE.length === 8 && COMPRADORES.length === 4 && esComprador("roaster") && esComprador("distributor") && !esComprador("barista") && !esComprador("other"));
  const soloCompradores = ["green_volume", "buys_colombian", "profiles", "timing", "grades_interest", "purchase_format", "certifications"];
  check("1 · lo de comprador solo lo ve el comprador", soloCompradores.every((c) => TIPOS_DE_PARTICIPANTE.every((t) => visible(c, t) === esComprador(t))));
  check("1 · «Cuéntanos qué haces» solo el no comprador", TIPOS_DE_PARTICIPANTE.every((t) => visible("about", t) === !esComprador(t)));
  check("1 · «Qué valoras» no lo ve el productor ni la prensa", !visible("values", "producer") && !visible("values", "press") && visible("values", "roaster") && visible("values", "barista") && visible("values", "other"));
  check("1 · «¿Cuál?» solo con «Otro»; Master Roaster solo el tostador; nodo regional importador/distribuidor; evaluar con CTCx el productor", visible("participant_other", "other") && !visible("participant_other", "roaster") && visible("master_roaster_interest", "roaster") && !visible("master_roaster_interest", "importer") && visible("regional_node_interest", "importer") && visible("regional_node_interest", "distributor") && !visible("regional_node_interest", "roaster") && visible("producer_interest", "producer") && !visible("producer_interest", "press"));
  check("1 · lo que no está condicionado se muestra siempre", ["full_name", "company", "email", "country_city", "card_photo_url", "looking_for", "wants", "consent"].every((c) => TIPOS_DE_PARTICIPANTE.every((t) => visible(c, t))) && Object.keys(VISIBILIDAD).length === 16);
  check("1 · los valores que se guardan son los de la especificación", OPCIONES.green_volume.join() === "lt_1t,1_5t,5_20t,20_100t,gt_100t,none" && OPCIONES.buys_colombian.join() === "regular,sometimes,not_yet" && OPCIONES.profiles.join() === "washed,natural,honey,experimental,rare_varieties,decaf" && OPCIONES.values.join() === "traceability,cup_quality,direct_relationship,consistency,small_lots,sustainability,price,origin_story" && OPCIONES.timing.join() === "lt_3m,3_6m,exploring" && OPCIONES.wants.join() === "sample_pack,lot_list,video_call,lcl_batch,other" && OPCIONES.volume_period.join() === "monthly,bimonthly,quarterly,semester,yearly");
  check("1 · las preguntas de la casa: grados CTCx, formato, certificaciones (JAS), verde o tostado", OPCIONES.grades_interest.join() === "black,red,blue,gold,tyrian" && OPCIONES.purchase_format.includes("container") && OPCIONES.certifications.includes("jas_organic") && OPCIONES.roast_in_destination.join() === "green,roasted,both");

  const base = { formKey: "scaj2026", idempotencyKey: "0d3b4c1e-5a6f-4b7c-8d9e-0f1a2b3c4d5e", lang: "ja", participant_type: "roaster", full_name: "  Haruki   Tanaka ", company: "Tanaka Roasters", email: " Haruki@Example.JP ", consent: true };
  const v = validarEnvio({ ...base, green_volume: "5_20t", profiles: ["washed", "nope", "washed"], values: { traceability: 5, cup_quality: "4", price: 9, unknown: 3 }, wants: ["sample_pack"], master_roaster_interest: true, about: "no debería guardarse", extra: { grades_interest: ["blue", "x"], purchase_format: "bags", regional_node_interest: true, producer_interest: true } });
  check("1 · un envío válido se limpia: espacios, correo en minúsculas, listas sin repetidos ni desconocidos", v.ok && v.lead.full_name === "Haruki Tanaka" && v.lead.email === "haruki@example.jp" && v.lead.profiles.join() === "washed" && v.lead.lang === "ja");
  check("1 · los granos: entero 0-5, claves conocidas; «marcada sin tocar los granos» = 0", v.ok && JSON.stringify(v.lead.values_beans) === JSON.stringify({ traceability: 5, cup_quality: 4, price: 5 }) && JSON.stringify(limpiarValores({ small_lots: null, sustainability: 0 })) === JSON.stringify({ sustainability: 0 }) && JSON.stringify(limpiarValores("x")) === "{}");
  check("1 · lo invisible para el tipo NO se guarda aunque venga (about en un tostador; nodo regional y evaluar en un tostador)", v.ok && v.lead.about === null && v.lead.extra.regional_node_interest === undefined && v.lead.extra.producer_interest === undefined && v.lead.extra.purchase_format === "bags" && v.lead.extra.grades_interest.join() === "blue");
  check("1 · Master Roaster solo si es tostador", v.ok && v.lead.master_roaster_interest === true && validarEnvio({ ...base, participant_type: "importer", master_roaster_interest: true }).lead?.master_roaster_interest === false);
  check("1 · obligatorios: tipo, nombre, empresa, correo válido, consentimiento, «¿cuál?» con Otro", validarEnvio({ ...base, participant_type: "x" }).motivo === "type" && validarEnvio({ ...base, full_name: " " }).campo === "full_name" && validarEnvio({ ...base, company: "" }).campo === "company" && validarEnvio({ ...base, email: "sin-arroba" }).motivo === "email" && validarEnvio({ ...base, consent: false }).motivo === "consent" && validarEnvio({ ...base, participant_type: "other" }).campo === "participant_other" && validarEnvio({ ...base, participant_type: "other", participant_other: "Consultor" }).ok);
  check("1 · idempotencia e idioma: un uuid y uno de los tres idiomas, o se rechaza", validarEnvio({ ...base, idempotencyKey: "123" }).motivo === "idempotency" && validarEnvio({ ...base, lang: "de" }).motivo === "lang" && validarEnvio({ ...base, formKey: "../x" }).motivo === "form");
  check("1 · la foto solo dentro de la carpeta del formulario; el source saneado", validarEnvio({ ...base, card_photo_path: "otro/x.jpg" }).lead?.card_photo_path === null && validarEnvio({ ...base, card_photo_path: "scaj2026/abc.jpg" }).lead?.card_photo_path === "scaj2026/abc.jpg" && validarEnvio({ ...base, source: "qr-stand" }).lead?.source === "qr-stand" && validarEnvio({ ...base, source: "a b<c>" }).lead?.source === null);
  check("1 · lo más valorado: por granos, desempate por el orden de la lista, máximo tres, sin ceros", valoresPrincipales({ price: 3, traceability: 5, cup_quality: 5, consistency: 0, origin_story: 3 }).join() === "traceability,cup_quality,price" && valoresPrincipales({}).length === 0);
  check("1 · el seguimiento vence exactamente N días después, a la misma hora", venceElSeguimiento("2026-10-14T03:30:00.000Z", 7) === "2026-10-21T03:30:00.000Z" && venceElSeguimiento("2026-10-31T23:00:00.000Z", 1) === "2026-11-01T23:00:00.000Z");
  check("1 · el idioma inicial sigue al navegador; si no es uno de los tres, inglés", idiomaInicial("ja-JP,ja;q=0.9") === "ja" && idiomaInicial("es-CO") === "es" && idiomaInicial("de-DE,en;q=0.8") === "en" && idiomaInicial(null) === "en");
  const csv = csvDeLeads([{ ...v.lead, id: "L1", status: "nuevo", consent_at: "2026-10-14T03:30:00Z", submitted_ip: null, user_agent: null, email_immediate_sent_at: null, email_immediate_error: null, followup_due_at: "2026-10-21T03:30:00Z", followup_sent_at: null, followup_error: null, replied_at: null, unsubscribed_at: null, notes: 'dijo "hola", y más', created_at: "2026-10-14T03:30:00Z", updated_at: "2026-10-14T03:30:00Z" }]);
  check("1 · el CSV: BOM, columnas fijas, comillas escapadas, listas con |, granos como JSON", csv.startsWith("﻿" + COLUMNAS_CSV.join(",")) && csv.includes('"dijo ""hola"", y más"') && csv.includes("sample_pack") && csv.includes('"{""traceability"":5') && COLUMNAS_CSV.includes("grades_interest") && COLUMNAS_CSV.includes("regional_node_interest"));
}

// ── 2. Los textos en tres idiomas ──────────────────────────────────────────────────────────────────────────────────────────
{
  const def = formulario("scaj2026");
  check("2 · SCAJ 2026 está en el registro con su ruta, su insignia y los tres idiomas", def && def.ruta === "/scaj2026" && def.etiquetaCabecera === "SCAJ2026" && def.idiomas.join() === "es,en,ja" && IDIOMAS.join() === "es,en,ja");
  const faltan = [];
  const clavesUi = Object.keys(def.textos.es.ui);
  for (const l of IDIOMAS) {
    for (const k of clavesUi) if (!def.textos[l].ui[k]) faltan.push(`${l}.ui.${k}`);
    for (const [grupo, opciones] of Object.entries(OPCIONES)) for (const o of opciones) if (!def.textos[l].options[grupo]?.[o]) faltan.push(`${l}.options.${grupo}.${o}`);
    for (const t of TIPOS_DE_PARTICIPANTE) if (!def.textos[l].options.participant_type?.[t]) faltan.push(`${l}.options.participant_type.${t}`);
  }
  check("2 · toda clave de la UI y toda opción tienen rótulo en ES, EN y JA", faltan.length === 0, faltan.slice(0, 8).join(" · "));
  check("2 · los textos del owner, tal cual (muestra)", def.textos.es.ui.title === "Cuéntanos qué buscas en un café" && def.textos.en.ui.done_title === "Thank you. We are connected." && def.textos.ja.ui.submit === "送信する" && def.textos.ja.options.participant_type.roaster === "ロースター(焙煎)" && def.textos.es.options.values.cup_quality === "Calidad de taza verificada (cata a ciegas, protocolo SCA)");
  check("2 · el japonés vive en JSON, corregible sin tocar código", existe("src/lib/leadForms/scaj2026/textos.json") && lee("src/lib/leadForms/registro.ts").includes('from "./scaj2026/textos.json"'));
  check("2 · la página pública es noindex y usa el tema de la casa", /robots: \{ index: false, follow: false \}/.test(lee("src/app/scaj2026/layout.tsx")) && lee("src/app/scaj2026/layout.tsx").includes('data-theme="ctc-home"'));
}

// ── 3. Los correos ─────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const config = { ...CONFIG_POR_DEFECTO, firma: "Owner · CEO", reply_to: "info@ctcexport.com" };
  const enlaces = { baja: "https://www.ctcexport.com/scaj2026/baja?id=X&t=Y", completar: "https://www.ctcexport.com/scaj2026/completar?id=X&t=Z", pdf: "https://www.ctcexport.com/scaj2026/confirmacion?id=X&t=Z", cherryPicked: "https://cherry-picked.ctcexport.com", kaffetalRegal: "https://kaffetal-regal.ctcexport.com", catalogo: "https://www.ctcexport.com/ctcx-public-catalogue" };
  const ej = leadsDeEjemplo("scaj2026");
  check("3 · cuatro perfiles de ejemplo: tostador JA, importador EN, productor ES, prensa ES", ej.length === 4 && ej.map((e) => `${e.lead.participant_type}:${e.lead.lang}`).join() === "roaster:ja,importer:en,producer:es,press:es");
  const [tostador, importador, productor, prensa] = ej.map((e) => e.lead);
  const i1 = construirCorreoInmediato(tostador, config, enlaces);
  check("3 · el japonés cae a inglés hasta la revisión nativa", i1.lang === "en" && idiomaDelCorreo("ja", config) === "en" && idiomaDelCorreo("es", config) === "es");
  check("3 · abre con lo más valorado (dos o tres opciones con más granos)", i1.text.includes("farm-to-cup traceability") && i1.text.includes("verified cup quality") && i1.text.includes("consistency") && !i1.text.includes("competitive price"));
  check("3 · a un comprador lo lleva a Cherry Picked; a un productor, a Kaffetal Regal; a prensa, conversar y material", i1.text.includes(enlaces.cherryPicked) && !i1.text.includes(enlaces.kaffetalRegal) && construirCorreoInmediato(productor, config, enlaces).text.includes(enlaces.kaffetalRegal) && construirCorreoInmediato(prensa, config, enlaces).text.includes("material"));
  check("3 · responde a `wants`: Sample Pack pide dirección, catálogo enlaza, videollamada agenda o dos horarios", i1.text.includes("shipping address") && i1.text.includes(enlaces.catalogo) && construirCorreoInmediato(importador, config, enlaces).text.includes("two time slots") && construirCorreoInmediato(importador, { ...config, agenda_url: "https://cal.example/ctc" }, enlaces).text.includes("https://cal.example/ctc"));
  check("3 · Master Roaster y nodo regional, solo si lo marcaron; evaluar con CTCx al productor que lo marcó", i1.text.includes("Master Roaster") && !construirCorreoInmediato(importador, config, enlaces).text.includes("Master Roaster") && construirCorreoInmediato(importador, config, enlaces).text.includes("logistics node") && construirCorreoInmediato(productor, config, enlaces).text.includes("evaluar y vender"));
  check("3 · firma quien dice la configuración, Reply-To visible, y los dos llevan la baja", [i1, construirSeguimiento(tostador, config, enlaces), construirCorreoInmediato(productor, config, enlaces)].every((c) => c.text.includes("Owner · CEO") && c.text.includes("info@ctcexport.com") && c.text.includes(enlaces.baja)));
  const s2 = construirSeguimiento(importador, config, enlaces);
  check("3 · el seguimiento retoma wants y timing con un paso concreto", s2.lang === "en" && s2.text.includes("A week ago") && s2.text.includes("video call") && s2.text.includes("exploring") && construirSeguimiento(tostador, config, enlaces).text.includes("coming months") && construirSeguimiento(productor, config, enlaces).text.includes("respóndeme"));
  // NO INVENTAR: ni dinero, ni puntajes, ni plazos de envío, ni condiciones del Sample Pack.
  const todos = ej.flatMap((e) => [construirCorreoInmediato(e.lead, config, enlaces).text, construirSeguimiento(e.lead, config, enlaces).text]);
  const prohibido = /(US\$|USD|€|EUR|\$\s?\d|\d+\s?(puntos|points|pts)|\bSCA\s?\d{2}|\bCVA\s?\d{2}|\d+\s?(días hábiles|business days|weeks of transit|semanas de tránsito)|gratis|free of charge|descuento|discount|precio de|price of)/i;
  const todosHtml = ej.flatMap((e) => [construirCorreoInmediato(e.lead, config, enlaces).html, construirSeguimiento(e.lead, config, enlaces).html]);
  check("3 · tampoco el HTML inventa", todosHtml.every((t) => !prohibido.test(t.replace(/<[^>]+>/g, " "))), todosHtml.map((t) => t.replace(/<[^>]+>/g, " ").match(prohibido)?.[0]).filter(Boolean).join(" · "));
  check("3 · los correos NO inventan: sin cifras de dinero, puntajes, plazos de envío, descuentos ni condiciones del Sample Pack", todos.every((t) => !prohibido.test(t)), todos.map((t) => t.match(prohibido)?.[0]).filter(Boolean).join(" · "));
  check("3 · nada público lleva al productor: los correos no nombran fincas ni municipios de lotes", todos.every((t) => !/Finca [A-Z]|municipio|vereda/.test(t.replace(/Finca El Mirador/g, ""))));
}

// ── 4. La base ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const acta = lee("docs/migraciones/2026-10-11_interfaz_de_leads.sql");
  check("4 · lead_forms y event_leads con RLS encendido y SIN políticas (solo service role)", acta.includes("alter table public.lead_forms enable row level security;") && acta.includes("alter table public.event_leads enable row level security;") && !/create policy/i.test(acta));
  check("4 · un solo formulario activo (índice único parcial) y la idempotencia única", acta.includes("create unique index if not exists lead_forms_una_activa on public.lead_forms ((true)) where activo;") && acta.includes("idempotency_key uuid not null unique"));
  check("4 · el bucket de las tarjetas es PRIVADO, 5 MB, solo imágenes", /values \('event-leads', 'event-leads', false, 5242880, array\['image\/jpeg'/.test(acta));
  check("4 · las columnas de la especificación y el estado de los correos", ["participant_type", "card_photo_path", "values_beans jsonb", "consent_at", "lang text not null check (lang in ('es', 'en', 'ja'))", "source", "email_immediate_sent_at", "followup_due_at timestamptz not null", "followup_sent_at", "unsubscribed_at", "replied_at"].every((c) => acta.includes(c)));
  check("4 · SCAJ 2026 nace APAGADO y con los correos apagados", /'scaj2026',[\s\S]*?'\/scaj2026',\s*'SCAJ2026',\s*false,/.test(acta) && acta.includes('"correo_inmediato": false, "seguimiento": false'));
  const filas = [{ key: "scaj2026", nombre: "x", descripcion: null, ruta: "/scaj2026", etiqueta_cabecera: "SCAJ2026", activo: true, vigente_desde: "2026-10-14T01:00:00Z", vigente_hasta: "2026-10-31T23:59:59Z", config: {}, created_at: "", updated_at: "" }];
  check("4 · la portada enseña el activo dentro de su vigencia, con source=web; fuera de vigencia o desconocido, nada", formularioActivoDe(filas, "2026-10-15T00:00:00Z")?.href === "/scaj2026?source=web" && formularioActivoDe(filas, "2026-10-13T00:00:00Z") === null && formularioActivoDe(filas, "2026-11-01T00:00:00Z") === null && formularioActivoDe([{ ...filas[0], key: "otro" }], "2026-10-15T00:00:00Z") === null && formularioActivoDe([{ ...filas[0], activo: false }], "2026-10-15T00:00:00Z") === null);
  const c = configDe({ seguimiento_dias: "99", agenda_url: "javascript:x", reply_to: "mal", firma: "  Yo  ", correo_inmediato: "true" });
  check("4 · la configuración se sanea: días 1-60, URLs válidas, correo válido, interruptores booleanos estrictos", c.seguimiento_dias === 7 && c.agenda_url === "" && c.reply_to === "info@ctcexport.com" && c.firma === "Yo" && c.correo_inmediato === false && configDe({ privacy_url: "/scaj2026/privacidad" }).privacy_url === "/scaj2026/privacidad");
  check("4 · V6.5: los dos interruptores de correo nacen ENCENDIDOS (ausentes → encendidos; presentes → booleanos estrictos) y la copia del seguimiento va a la casa", CONFIG_POR_DEFECTO.correo_inmediato === true && CONFIG_POR_DEFECTO.seguimiento === true && CONFIG_POR_DEFECTO.seguimiento_dias === 7 && CONFIG_POR_DEFECTO.copia_seguimiento === "ctcexportmain@gmail.com" && configDe({}).correo_inmediato === true && configDe({}).seguimiento === true && configDe({ correo_inmediato: false, seguimiento: false }).correo_inmediato === false && configDe({ seguimiento: false }).seguimiento === false && configDe({ copia_seguimiento: "no-es-correo" }).copia_seguimiento === "" && configDe({ copia_seguimiento: "" }).copia_seguimiento === "" && configDe({ copia_seguimiento: " otra@ctcexport.com " }).copia_seguimiento === "otra@ctcexport.com");
}

// ── 5. La página, la portada, la LCP, el cron ──────────────────────────────────────────────────────────────────────────────
{
  const form = lee("src/components/leadForms/LeadForm.tsx");
  const accion = lee("src/lib/leadForms/publicActions.ts");
  check("5 · honeypot: campo oculto que viaja en el envío y el servidor finge éxito sin guardar", form.includes('name="website"') && form.includes("website: hpRef.current?.value") && accion.includes("if (payload?.website && String(payload.website).trim() !== \"\") return { ok: true, leadId: \"\", repetido: false, codigo: \"\", testigo: \"\", pdfHref: \"\", completarHref: \"\" };"));
  check("5 · sello de tiempo anti-bot: emitido al pintar, exigido al enviar (3 s a 24 h)", lee("src/app/scaj2026/page.tsx").includes("sello={selloDeTiempo()}") && accion.includes("if (!selloValido(payload.sello))") && /const MIN_MS = 3_000;\s*const MAX_MS = 24 \* 60 \* 60 \* 1000;/.test(lee("src/lib/leadForms/sello.ts")));
  check("5 · idempotencia: un uuid por borrador; la base rechaza el doble (23505) y se responde con el lead que ya existe", form.includes("idempotencyKey: uuid()") && accion.includes('if (error.code === "23505")') && accion.includes("resultadoDe(def, (previo as { id: string }).id, true)"));
  check("5 · el borrador no se pierde: localStorage por formulario, recuperado al volver y borrado al enviar", form.includes("localStorage.setItem(claveDeBorrador(formKey)") && form.includes("localStorage.getItem(claveDeBorrador(formKey))") && form.includes("localStorage.removeItem(claveDeBorrador(formKey))"));
  check("5 · si falla la conexión, lo escrito sigue y se ofrece reintentar", form.includes('setError({ tipo: "network" })') && form.includes("t.retry"));
  check("5 · teclado de correo, áreas táctiles ≥ 44 px, selector ES · EN · 日本語, foto desde cámara o galería", form.includes('type="email" inputMode="email"') && /min-height: 4[4-9]px|min-height: 5\dpx/.test(lee("src/components/leadForms/LeadForm.module.css")) && form.includes('"日本語"') && form.includes('accept="image/*"') && form.includes('capture="environment"'));
  check("5 · granos de café, no estrellas: escala 1-5 por opción marcada; «Registrar a otra persona» vacía el formulario", form.includes("function Grano(") && form.includes("[1, 2, 3, 4, 5].map((n)") && form.includes("t.done_again") && form.includes("function otraPersona()"));
  check("5 · la foto va al bucket privado con URL firmada y nombre aleatorio, y el lead nunca se pierde por la foto", accion.includes("createSignedUploadUrl(path)") && accion.includes("const path = `${def.key}/${randomUUID()}.${ext}`;") && form.includes("const card_photo_path = await subirFoto();") && /for \(let intento = 0; intento < 2; intento \+= 1\)/.test(form));
  check("5 · el formulario APAGADO no recibe envíos ni URLs de subida", accion.includes("if (!fila) return { ok: false, error: \"cerrado\" };") && accion.includes("if (!(await formularioAbierto(service, def.key))) return { ok: false, error: \"cerrado\" };"));
  check("5 · el correo inmediato sale solo con el interruptor encendido y su resultado queda en la fila", accion.includes("if (config.correo_inmediato) await enviarCorreoInmediato(service, leadId);") && lee("src/lib/leadForms/envios.ts").includes("email_immediate_error: r.error"));
  check("5 · la baja: id + testigo HMAC, idempotente; ruta /scaj2026/baja", lee("src/lib/leadForms/sello.ts").includes("export function testigoDeBaja(") && accion.includes("if (!testigoDeBajaValido(leadId, testigo)) return { ok: false };") && existe("src/app/scaj2026/baja/page.tsx"));
  const header = lee("src/components/ctc-home/Header.tsx");
  check("5 · la cabecera de CTC Home enseña la insignia SOLO con formulario activo, y lleva a su página con source=web", header.includes("{formulario && (") && header.includes("href={formulario.href}") && lee("src/app/page.tsx").includes("const formulario = await formularioActivo(createServiceRoleClient());") && lee("src/app/page.tsx").includes("<Header formulario={formulario} />") && lee("src/app/page.tsx").includes("export const revalidate = 300;"));
  check("5 · encender o apagar revalida la portada en el acto", lee("src/app/lcp/(app)/formulariosActions.ts").includes('revalidatePath("/"); // la cabecera de CTC Home'));
  const rail = lee("src/lib/panel/consoles.ts");
  check("5 · «Interfaz de Leads» es un enlace del rail de la LCP · General y una página", rail.includes('{ href: "/lcp/formularios", label: "Interfaz de Leads" }') && existe("src/app/lcp/(app)/formularios/page.tsx") && existe("src/app/lcp/(app)/formularios/export/route.ts"));
  const acciones = lee("src/app/lcp/(app)/formulariosActions.ts");
  check("5 · clases: encender, configurar y mandar correo son «emite»; etapa y nota son «borrador» y están en la lista blanca", (acciones.match(/permisoDeEscritura\("lcp", "emite"\)/g) ?? []).length === 5 && (acciones.match(/permisoDeEscritura\("lcp", "borrador"\)/g) ?? []).length === 2 && lee("docs/BCP_USER_ADMIN_PLAN.md").includes("| `setEstadoLeadDeEvento` |") && lee("docs/BCP_USER_ADMIN_PLAN.md").includes("| `anotarLeadDeEvento` |"));
  check("5 · al encender uno se apagan los demás (la portada enseña uno solo)", acciones.includes('.update({ activo: false, updated_at: new Date().toISOString() }).eq("activo", true).neq("key", key)'));
  check("5 · el cron horario de seguimientos existe, está en vercel.json y exige CRON_SECRET en producción", existe("src/app/api/cron/seguimientos-leads/route.ts") && lee("vercel.json").includes('"path": "/api/cron/seguimientos-leads"') && lee("src/app/api/cron/seguimientos-leads/route.ts").includes("process.env.CRON_SECRET"));
  const envios = lee("src/lib/leadForms/envios.ts");
  check("5 · el seguimiento no sale si se dio de baja, si ya salió o si ya respondió (el Buzón), y el barrido es por formulario con el interruptor", envios.includes("if (c.lead.unsubscribed_at) return { ok: false, error: \"El lead se dio de baja: no se le escribe.\" };") && envios.includes("await yaRespondio(service, c.lead)") && envios.includes('.from("inbound_emails")') && envios.includes("if (!config.seguimiento) continue;"));
  check("5 · el export CSV y la foto de la tarjeta piden sesión de la LCP", lee("src/app/lcp/(app)/formularios/export/route.ts").includes('await requireConsoleAccess("lcp");') && lee("src/app/lcp/(app)/formularios/tarjeta/route.ts").includes('await requireConsoleAccess("lcp");'));
  check("5 · la LCP enseña los cuatro ejemplos de correo con los constructores reales", lee("src/app/lcp/(app)/formularios/page.tsx").includes("leadsDeEjemplo(def.key)") && lee("src/app/lcp/(app)/formularios/page.tsx").includes("construirCorreoInmediato(lead, config, enlaces(lead.id))"));
  check("5 · el registro conoce todo formulario con página: /scaj2026", Object.values(FORMULARIOS).every((d) => existe(`src/app${d.ruta}/page.tsx`)));
}

// ── 7. V6.4: dos pasos, el desplegable, el paso 2 que vuelve al mismo registro, el código, HTML + texto, el PDF ───────────
{
  const form = lee("src/components/leadForms/LeadForm.tsx");
  const accion = lee("src/lib/leadForms/publicActions.ts");
  const correos = lee("src/lib/leadForms/correos.ts");
  const envios = lee("src/lib/leadForms/envios.ts");
  check("7 · el paso 2 son «Tu operación» y «Qué valoras» (las claves del paso 2, visibles por tipo)", CAMPOS_PASO_2.join() === "green_volume,buys_colombian,profiles,grades_interest,purchase_format,certifications,roast_in_destination,regional_node_interest,producer_interest,about,values" && preguntasDelPaso2({ participant_type: "roaster", green_volume: "5_20t", buys_colombian: null, profiles: [], about: null, values_beans: {}, extra: {} }).map((q) => `${q.campo}:${q.respondida ? 1 : 0}`).join() === "green_volume:1,buys_colombian:0,profiles:0,grades_interest:0,purchase_format:0,certifications:0,values:0" && preguntasDelPaso2({ participant_type: "press", green_volume: null, buys_colombian: null, profiles: [], about: "x", values_beans: {}, extra: {} }).map((q) => q.campo).join() === "about");
  check("7 · el tipo de participante es un DESPLEGABLE y el paso 1 es «Quién eres» + «Qué sigue»", form.includes('<select className={styles.select} value={b.participant_type}') && form.includes('data-paso="1"') && form.includes('data-paso="2"') && /data-paso="1"[\s\S]*?<h2 className=\{styles\.seccion\}>\{t\.s1\}<\/h2>[\s\S]*?<h2 className=\{styles\.seccion\}>\{t\.s4\}<\/h2>/.test(form) && !/data-paso="1"[\s\S]*?\{t\.s2\}/.test(form.slice(form.indexOf('data-paso="1"'))));
  check("7 · el paso 1 GUARDA el lead; la pantalla de gracias ofrece el PDF, el paso 2 opcional y «otra persona»", form.includes("const r = await enviarLeadDeEvento(payload);") && form.includes('data-pantalla="gracias"') && form.includes('data-pdf="confirmacion"') && form.includes('data-paso2="abrir"') && form.includes("t.done_again"));
  check("7 · el paso 2 escribe sobre el MISMO registro (leadId + testigo), también desde el enlace del correo (modo complemento, prellenado)", form.includes("await completarLeadDeEvento({") && form.includes("leadId: registro.leadId,") && form.includes("testigo: registro.testigo,") && form.includes("complemento?: { leadId: string; testigo: string; participantType: string; valores: ValoresDelPaso2;") && form.includes("desdeComplemento(idiomaInicial, complemento.participantType, complemento.valores)") && existe("src/app/scaj2026/completar/page.tsx"));
  check("7 · completarLeadDeEvento: testigo firmado, solo columnas del paso 2, `extra` se fusiona, el tipo manda la visibilidad", accion.includes("export async function completarLeadDeEvento(") && accion.includes("if (!testigoDeLeadValido(String(payload.leadId ?? \"\"), payload.testigo)) return { ok: false, error: \"invalido\" };") && accion.includes("limpiarComplemento(payload, lead.participant_type)") && accion.includes("extra: { ...(lead.extra ?? {}), ...limpio.extra }"));
  const comp = limpiarComplemento({ green_volume: "5_20t", about: "no va", values: { price: 3 }, extra: { producer_interest: true, grades_interest: ["gold"] } }, "roaster");
  check("7 · limpiarComplemento respeta la visibilidad del tipo (tostador: sin `about` ni `producer_interest`)", comp.green_volume === "5_20t" && comp.about === null && comp.values_beans.price === 3 && comp.extra.producer_interest === undefined && comp.extra.grades_interest.join() === "gold");
  check("7 · el código del registro: FORMULARIO-8HEX, estable", codigoDeLead("scaj2026", "4a577f5b-2038-4265-b546-d98106af02f3") === "SCAJ2026-4A577F5B");
  check("7 · el envío devuelve el código, el testigo y las rutas del PDF y de completar (relativas)", accion.includes("codigo: codigoDeLead(def.key, leadId),") && accion.includes("testigo: testigoDeLead(leadId),") && accion.includes("pdfHref: rutaDelPdf(def.ruta, leadId),") && accion.includes("completarHref: rutaDeCompletar(def.ruta, leadId),"));
  check("7 · el testigo del lead es distinto del de baja (quien edita no da de baja y al revés)", lee("src/lib/leadForms/sello.ts").includes("firmar(`lead:${leadId.toLowerCase()}`)") && lee("src/lib/leadForms/sello.ts").includes("firmar(`baja:${leadId.toLowerCase()}`)"));
  // Los correos.
  const config = { ...CONFIG_POR_DEFECTO, firma: "Owner · CEO" };
  const enlaces = { baja: "https://www.ctcexport.com/scaj2026/baja?id=X&t=Y", completar: "https://www.ctcexport.com/scaj2026/completar?id=X&t=Z", pdf: "https://www.ctcexport.com/scaj2026/confirmacion?id=X&t=Z", cherryPicked: "https://cherry-picked.ctcexport.com", kaffetalRegal: "https://kaffetal-regal.ctcexport.com", catalogo: "https://www.ctcexport.com/ctcx-public-catalogue" };
  const [tostador] = leadsDeEjemplo("scaj2026").map((e) => e.lead);
  const parcial = { ...tostador, lang: "es", buys_colombian: null, profiles: ["washed"], values_beans: { traceability: 5 }, extra: { grades_interest: ["gold"] } };
  const i = construirCorreoInmediato(parcial, config, enlaces);
  const pre = preguntasPrellenadas(parcial, "es");
  check("7 · el correo inmediato lleva las preguntas del paso 2 PRELLENADAS (lo respondido con su respuesta, lo vacío marcado) y el botón que vuelve al registro", pre.some((q) => q.campo === "green_volume" && q.respuesta === "5–20 t") && pre.some((q) => q.campo === "buys_colombian" && q.respuesta === null) && pre.some((q) => q.campo === "values" && /Trazabilidad.*5 de 5 granos/.test(q.respuesta ?? "")) && i.text.includes("— Tu perfil (opcional) —") && i.text.includes("→ 5–20 t") && i.text.includes("→ (sin responder)") && i.text.includes(enlaces.completar) && i.html.includes("Completar o corregir mis respuestas") && i.html.includes(`href="${enlaces.completar.replace(/&/g, "&amp;")}"`));
  check("7 · el correo sale en HTML y en texto, con charset, el código en el asunto y el PDF enlazado; una respuesta se enruta por correo O por código", i.html.startsWith("<!doctype html>") && i.html.includes('<meta charset="utf-8">') && i.subject.endsWith(" · SCAJ2026-11111111") && i.text.includes(enlaces.pdf) && i.html.includes(`href="${enlaces.pdf.replace(/&/g, "&amp;")}"`) && envios.includes("html: correo.html") && envios.includes("subject.ilike.%${codigo}%"));
  check("7 · si no quedó nada por responder, el bloque no sale; el seguimiento recuerda el enlace solo si queda algo", preguntasPrellenadas({ ...tostador, lang: "es", participant_type: "press", about: "x" }, "es").length === 1 && !construirSeguimiento({ ...tostador, lang: "es", participant_type: "press", about: "x" }, config, enlaces).text.includes(enlaces.completar) && construirSeguimiento(parcial, config, enlaces).text.includes(enlaces.completar));
  // El PDF.
  const pdf = lee("src/lib/leadForms/pdf.ts");
  check("7 · el PDF: arriba la confirmación (SCAJ 2026, código, fecha de Japón, nombre, empresa, correo), luego qué sigue, CTCx, plataformas y redes con enlace clicable, línea legal", pdf.includes("export async function pdfDeConfirmacion(") && pdf.includes('timeZone: "Asia/Tokyo"') && pdf.includes("codigoDeLead(opts.formKey, lead.id)") && pdf.includes("INSTAGRAM_URL") && pdf.includes("YOUTUBE_URL") && pdf.includes("CTC_LEGAL_LINE") && pdf.includes('Subtype: "Link"') && (pdf.match(/titulo: "/g) ?? []).length === 3);
  check("7 · la ruta del PDF exige el testigo del lead (404 sin él) y entrega un adjunto", lee("src/app/scaj2026/confirmacion/route.ts").includes("if (!testigoDeLeadValido(id, t)) return NextResponse.json({ ok: false }, { status: 404 });") && lee("src/app/scaj2026/confirmacion/route.ts").includes('"content-disposition": `attachment; filename="${pdf.nombreDeArchivo}"`'));
  check("7 · sin fuente japonesa, el PDF del japonés sale en inglés y nunca dibuja «????»; con `public/fonts/NotoSansJP-Regular.otf` sale en japonés", pdf.includes('if (lang === "ja" && hayFuenteJaponesa())') && pdf.includes('if (lang === "ja") lang = "en";') && pdf.includes("const seguro = (s: string): string =>"));
  check("7 · la LCP enseña el código y los enlaces del lead (PDF y completar)", lee("src/app/lcp/(app)/formularios/page.tsx").includes("codigoDeLead(l.form_key, l.id)") && lee("src/app/lcp/(app)/formularios/page.tsx").includes("rutaDelPdf(FORMULARIOS[l.form_key]?.ruta") && lee("src/app/lcp/(app)/formularios/page.tsx").includes("rutaDeCompletar(FORMULARIOS[l.form_key]?.ruta"));
  check("7 · pdf-lib y fontkit están en package.json", /"pdf-lib": "\^1\.17/.test(lee("package.json")) && /"@pdf-lib\/fontkit": "\^1\.1/.test(lee("package.json")));
}

// ── 8. V6.5 (owner, 2026-10-12): respuesta automática con el PDF adjunto, copia del seguimiento, el PDF a la medida, la cámara, la cookie,
//      la necesidad de volumen, el lote que llamó la atención, LCL y «otro» ──────────────────────────────────────────────────────────
{
  const form = lee("src/components/leadForms/LeadForm.tsx");
  const accion = lee("src/lib/leadForms/publicActions.ts");
  const envios = lee("src/lib/leadForms/envios.ts");
  const pdf = lee("src/lib/leadForms/pdf.ts");
  const pagina = lee("src/app/scaj2026/page.tsx");
  const vitrina = lee("src/lib/leadForms/vitrina.ts");
  const lcp = lee("src/app/lcp/(app)/formularios/page.tsx");
  const acciones = lee("src/app/lcp/(app)/formulariosActions.ts");
  const def = formulario("scaj2026");
  // La limpieza de lo nuevo.
  const base8 = { formKey: "scaj2026", idempotencyKey: "4a577f5b-2038-4265-b546-d98106af02f3", lang: "en", participant_type: "roaster", full_name: "A B", company: "C", email: "a@b.co", consent: true, wants: ["sample_pack", "other"], extra: { volume_period: "quarterly", volume_kg: 1234, lots_of_interest: ["ctc-l-7k3m9p2q", "CTC-L-7K3M9P2Q", "CTC-L-INVALID!", "x"], wants_other: "  curvas  de tueste " } };
  const v8 = validarEnvio(base8);
  check("8 · la necesidad de volumen se guarda limpia: periodo conocido, kilos redondeados al paso del dial (100) y acotados a 100–10.000", v8.ok && v8.lead.extra.volume_period === "quarterly" && v8.lead.extra.volume_kg === 1200 && validarEnvio({ ...base8, extra: { volume_kg: 99999 } }).lead.extra.volume_kg === 10000 && validarEnvio({ ...base8, extra: { volume_kg: 50 } }).lead.extra.volume_kg === undefined && validarEnvio({ ...base8, extra: { volume_period: "weekly" } }).lead.extra.volume_period === undefined && VOLUMEN_KG_MIN === 100 && VOLUMEN_KG_MAX === 10000 && VOLUMEN_KG_PASO === 100);
  check("8 · el volumen es de quien compra (no se guarda a prensa ni a productor aunque venga); los lotes, de todos", validarEnvio({ ...base8, participant_type: "press", extra: { volume_period: "monthly", volume_kg: 500, lots_of_interest: ["CTC-L-7K3M9P2Q"] } }).lead.extra.volume_kg === undefined && validarEnvio({ ...base8, participant_type: "press", extra: { lots_of_interest: ["CTC-L-7K3M9P2Q"] } }).lead.extra.lots_of_interest.join() === "CTC-L-7K3M9P2Q" && visible("volume_period", "importer") && !visible("volume_kg", "producer"));
  check("8 · los lotes: solo referencias CTC-L- válidas, en mayúsculas, sin repetidos; «otro» solo si «otro» está marcado, recortado; LCL es una opción", v8.lead.extra.lots_of_interest.join() === "CTC-L-7K3M9P2Q" && v8.lead.extra.wants_other === "curvas de tueste" && validarEnvio({ ...base8, wants: ["lcl_batch"], extra: { wants_other: "x" } }).lead.extra.wants_other === undefined && OPCIONES.wants.includes("lcl_batch") && ["volume_period", "volume_kg", "lots_of_interest", "wants_other"].every((c) => COLUMNAS_CSV.includes(c)));
  check("8 · los textos nuevos en ES · EN · JA: volumen, lotes, LCL, «otro», tomar o elegir la foto", ["q_volume_need", "volume_period_hint", "volume_kg_label", "volume_unset", "kg", "q_lots", "lots_hint", "lots_none", "wants_other_ph", "card_take", "card_choose"].every((k) => IDIOMAS.every((l) => def.textos[l].ui[k])) && IDIOMAS.every((l) => def.textos[l].options.wants.lcl_batch && def.textos[l].options.wants.other && OPCIONES.volume_period.every((k) => def.textos[l].options.volume_period[k])));
  // Los correos.
  const config8 = { ...CONFIG_POR_DEFECTO, firma: "Owner · CEO" };
  const enlaces8 = { baja: "https://www.ctcexport.com/scaj2026/baja?id=X&t=Y", completar: "https://www.ctcexport.com/scaj2026/completar?id=X&t=Z", pdf: "https://www.ctcexport.com/scaj2026/confirmacion?id=X&t=Z", cherryPicked: "https://cherry-picked.ctcexport.com", kaffetalRegal: "https://kaffetal-regal.ctcexport.com", catalogo: "https://www.ctcexport.com/ctcx-public-catalogue" };
  const [tostador8] = leadsDeEjemplo("scaj2026").map((e) => e.lead);
  const i8 = construirCorreoInmediato(tostador8, config8, enlaces8, { lotes: [{ code: "CTC-L-7K3M9P2Q", name: "Caturra · Lavado · Huila 2026", grade: "blue" }] });
  check("8 · el correo inmediato responde al volumen (kilos y periodo), nombra los lotes marcados por su nombre público y su referencia, y atiende LCL y «otro»", i8.text.includes("600 kg per month") && i8.text.includes("Caturra · Lavado · Huila 2026 (CTC-L-7K3M9P2Q)") && i8.text.includes("LCL batch") && i8.text.includes("the roasting notes of the samples") && fraseDeVolumen({ volume_period: "monthly" }, "es").includes("una compra mensual") && fraseDeVolumen({ volume_kg: 500 }, "en").includes("about 500 kg") && fraseDeVolumen({}, "en") === null);
  check("8 · sin nombre de vitrina, solo la referencia; el seguimiento recuerda los lotes marcados; la vista previa de la LCP sigue valiendo con tres argumentos", construirCorreoInmediato(tostador8, config8, enlaces8).text.includes(": CTC-L-7K3M9P2Q.") && construirSeguimiento(tostador8, config8, enlaces8).text.includes("CTC-L- reference") && lcp.includes("construirCorreoInmediato(lead, config, enlaces(lead.id))"));
  // Los envíos.
  check("8 · el correo inmediato lleva el PDF ADJUNTO (Resend `attachments`); si el PDF falla, el correo sale igual y el fallo queda en la fila", envios.includes("attachments: adjuntos") && envios.includes("const pdf = await pdfDeConfirmacion(c.lead, {") && envios.includes("content: Buffer.from(pdf.bytes)") && envios.includes("avisoPdf = `Enviado sin el PDF adjunto: ${(e as Error).message}`") && envios.includes("email_immediate_error: avisoPdf"));
  check("8 · el seguimiento sale con copia (CC) a `copia_seguimiento`, y la LCP la configura y la valida", envios.includes("c.config.copia_seguimiento ? { cc: c.config.copia_seguimiento } : {}") && envios.includes("...(extras.cc ? { cc: extras.cc } : {})") && lcp.includes('name="copia_seguimiento"') && acciones.includes('copia_seguimiento: s("copia_seguimiento")') && acciones.includes("La copia del seguimiento no es un correo válido."));
  check("8 · el barrido horario manda también los inmediatos pendientes (14 días, nunca a quien se dio de baja) cuando el interruptor está encendido", envios.includes("if (config.correo_inmediato) {") && envios.includes('.is("email_immediate_sent_at", null)') && envios.includes("DIAS_DE_INMEDIATOS_PENDIENTES = 14") && envios.includes("out.inmediatosEnviados += 1") && envios.includes("if (!config.seguimiento && !config.correo_inmediato) continue;"));
  check("8 · el acta del 2026-10-12 enciende los dos interruptores y pone la copia (datos, después de desplegar)", /"correo_inmediato": true, "seguimiento": true, "copia_seguimiento": "ctcexportmain@gmail.com"/.test(lee("docs/migraciones/2026-10-12_leads_correos_encendidos.sql")));
  // El PDF.
  check("8 · el PDF: «Tus respuestas» (lo que buscas, cuándo, qué quieres, volumen, lotes, Master Roaster, el paso 2) y «Qué sigue» a la medida; una página o dos, con número de página; los lotes por su nombre público", pdf.includes('respuestas: "Tus respuestas"') && pdf.includes("sigueLcl") && pdf.includes("sigueLotes") && pdf.includes("sigueVolumen") && pdf.includes("sigueOtro") && pdf.includes("asegurar(h) {") && pdf.includes("if (paginas.length > 1)") && pdf.includes("lotes?: LoteParaElegir[]") && pdf.includes("valoresPrincipales(lead.values_beans ?? {})") && lee("src/app/scaj2026/confirmacion/route.ts").includes("lotes: await lotesDeInteres(lead)") && (pdf.match(/respuestas: "/g) ?? []).length === 3);
  // La página.
  check("8 · la cámara: un segundo selector con `capture=\"environment\"` («Tomar una foto») junto a «Elegir de la galería»; ninguno obliga", form.includes('capture="environment"') && form.includes("camaraRef.current?.click()") && form.includes("fotoRef.current?.click()") && form.includes("t.card_take") && form.includes("t.card_choose") && form.includes('data-foto="camara"') && form.includes('data-foto="galeria"'));
  check("8 · la cookie del registro: httpOnly, solo la ruta del formulario, 30 días, `<id>.<testigo>`; la página valida el testigo y abre en la confirmación; «otra persona» la borra", accion.includes("`${leadId}.${testigoDeLead(leadId)}`") && accion.includes("httpOnly: true") && accion.includes("path: ruta") && accion.includes("DIAS_DE_COOKIE = 30") && accion.includes("export async function olvidarRegistroDeEvento(") && pagina.includes("testigoDeLeadValido(id, testigo)") && pagina.includes("registroPrevio={registroPrevio}") && form.includes('useState<"form" | "gracias" | "guardado">(previo ? "gracias" : "form")') && form.includes("void olvidarRegistroDeEvento(formKey)") && nombreDeCookieDeRegistro("scaj2026") === "ctc-lead-scaj2026");
  check("8 · «Qué sigue» pregunta el volumen (fichas del periodo + dial de 100 a 10.000 kg) y el lote que llamó la atención (los de la vitrina, varios); «otro» abre un campo de texto", form.includes('type="range"') && form.includes("min={VOLUMEN_KG_MIN}") && form.includes("max={VOLUMEN_KG_MAX}") && form.includes("step={VOLUMEN_KG_PASO}") && form.includes('chips("volume_period", "volume_period", "una")') && form.includes('alternar("lots_of_interest", l.code)') && form.includes("t.lots_none") && form.includes('data-wants="otro"') && pagina.includes("lotesParaElegir()") && vitrina.includes("getSneakPeekPayload()"));
  check("8 · nada lleva al productor: los lotes van por su referencia y su nombre GENERADO (el de la vitrina, la lista blanca), nunca por la finca", !/finca|municipio|vereda/i.test(vitrina.replace(/nunca la finca/g, "")) && vitrina.includes("name: l.name") && !/finca_name|municipio/.test(pdf));
}

if (fallos.length) {
  console.error(`✗ qa-lead-forms: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-lead-forms: ${ok} comprobaciones OK, 0 fallos`);
