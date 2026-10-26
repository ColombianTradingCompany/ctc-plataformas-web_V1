// ── Interfaz de Leads · los dos CORREOS de un lead de feria (V6.2 · V6.4) — PURO ──────────────────────────────────────────────
// La especificación del owner (SCAJ 2026): el correo INMEDIATO «tiene que leerse como una respuesta a lo que esa persona dijo, no
// como un boletín» —abre con lo que más valoró, el enfoque depende del tipo, responde a lo que pidió, añade el Master Roaster si lo
// marcó— y el SEGUIMIENTO a los siete días retoma `wants` y `timing` y propone un siguiente paso concreto. Los dos llevan baja.
//
// V6.4 (owner, 2026-10-11): el formulario va en dos pasos y el segundo es opcional en el momento; «deben ser enviadas en el correo
// de respuesta (en algún formato estándar, no sé si HTML embebido sea posible), de tal manera que cuando respondan se enruten al
// mismo contacto. Si responde en el Form, las respuestas dadas deben ser pre-filled en el correo». Un formulario DENTRO del correo no
// es estándar (Gmail, Outlook y Apple Mail quitan los <form>), así que se hace lo que sí lo es: el correo sale en HTML y en texto,
// con las preguntas del paso 2 y la respuesta que ya dio cada una (prellenadas; las vacías, marcadas), un botón «Completar o corregir
// mis respuestas» que vuelve al MISMO registro con un enlace firmado, y el CÓDIGO del registro en el asunto: una respuesta por correo
// se enruta al mismo lead por ese código (`yaRespondio` lo busca por correo y por código; el Buzón está congelado desde el
// 2026-07-16, así que la señal viva es el «Ya respondió» del owner hasta la comprobación en Gmail de P24). El PDF de confirmación
// también va enlazado.
//
// REGLA DURA (owner): «el correo no puede inventar nada: ni precios, ni disponibilidad, ni puntajes, ni plazos de envío, ni
// condiciones del Sample Pack. Solo afirma lo que esté publicado en mi sitio». Por eso son BLOQUES de texto, no un modelo. El guardián
// `qa-lead-forms-check` falla si asoma una cifra de dinero, un puntaje o un plazo.
// Idiomas: ES y EN. Quien llenó en japonés recibe el correo en INGLÉS hasta que un hablante nativo revise una versión japonesa.
//
// V6.5 (owner, 2026-10-12): el correo inmediato responde también a lo nuevo del paso 1 —la necesidad de volumen (periodo y kilos),
// los lotes de la vitrina que llamaron la atención (por su nombre público y su referencia), el lote LCL y «otro»— y el PDF de
// confirmación va ADJUNTO (lo adjunta `envios.ts`); el seguimiento sale con copia a la casa.

import { codigoDeLead, esComprador, preguntasDelPaso2, valoresPrincipales, type CampoDelPaso2, type IdiomaDeFormulario, type LeadLimpio, type LoteParaElegir } from "./campos";
import { formulario, type ConfigDeFormulario, type TextosDeIdioma } from "./registro";
import { CTC_RAZON } from "@/lib/legal";

export type IdiomaDeCorreo = "es" | "en";
export type LeadParaCorreo = LeadLimpio & { id: string; created_at: string };
export type Correo = { subject: string; text: string; html: string; lang: IdiomaDeCorreo };

export type EnlacesDeCorreo = {
  /** La URL de baja de ESTE lead (con su testigo). */
  baja: string;
  /** V6.4: completar o corregir el paso 2 de ESTE lead (con su testigo) y su PDF de confirmación. */
  completar: string;
  pdf: string;
  cherryPicked: string;
  kaffetalRegal: string;
  catalogo: string;
};

/** V6.5: lo que el constructor necesita además del lead (los lotes marcados, con su nombre público de hoy). */
export type ExtrasDeCorreo = { lotes?: LoteParaElegir[] };

const PERIODO: Record<IdiomaDeCorreo, Record<string, string>> = {
  es: { monthly: "al mes", bimonthly: "cada dos meses", quarterly: "por trimestre", semester: "por semestre", yearly: "al año" },
  en: { monthly: "per month", bimonthly: "every two months", quarterly: "per quarter", semester: "every six months", yearly: "per year" },
};
const PERIODO_SOLO: Record<IdiomaDeCorreo, Record<string, string>> = {
  es: { monthly: "mensual", bimonthly: "bimestral", quarterly: "trimestral", semester: "semestral", yearly: "anual" },
  en: { monthly: "monthly", bimonthly: "bi-monthly", quarterly: "quarterly", semester: "every six months", yearly: "yearly" },
};

/** La frase de la necesidad de volumen estimada (kilos por periodo), o null si no la dio. */
export function fraseDeVolumen(extra: Record<string, unknown> | null | undefined, lang: IdiomaDeCorreo): string | null {
  const x = extra ?? {};
  const kg = typeof x.volume_kg === "number" && Number.isFinite(x.volume_kg) ? x.volume_kg : null;
  const periodo = typeof x.volume_period === "string" && PERIODO[lang][x.volume_period] ? x.volume_period : null;
  if (!kg && !periodo) return null;
  const es = lang === "es";
  const cifra = kg ? `${kg.toLocaleString(es ? "es-CO" : "en-US")} kg` : null;
  const cuanto = cifra && periodo ? `${cifra} ${PERIODO[lang][periodo]}` : cifra ? (es ? `unos ${cifra}` : `about ${cifra}`) : es ? `una compra ${PERIODO_SOLO[lang][periodo!]}` : `a ${PERIODO_SOLO[lang][periodo!]} purchase`;
  return es
    ? `Nos indicaste una necesidad estimada de ${cuanto}: con eso dimensionamos qué lotes y qué formato te convienen (sacos, pallet, carga consolidada o contenedor).`
    : `You indicated an estimated need of ${cuanto}: with that we size which lots and which format suit you (bags, pallet, consolidated shipment or container).`;
}

/** Los lotes marcados, por su nombre público y su referencia (sin nombre si ya salieron de la vitrina). */
function listaDeLotes(extra: Record<string, unknown> | null | undefined, lotes: LoteParaElegir[] | undefined): string[] {
  const refs = Array.isArray(extra?.lots_of_interest) ? (extra!.lots_of_interest as string[]) : [];
  return refs.map((code) => {
    const lote = lotes?.find((q) => q.code === code);
    return lote?.name ? `${lote.name} (${code})` : code;
  });
}

/** El idioma en que sale el correo: el del formulario, salvo el japonés, que cae a inglés mientras no haya versión revisada. */
export function idiomaDelCorreo(lang: IdiomaDeFormulario, config: Pick<ConfigDeFormulario, "ja_correo_en">): IdiomaDeCorreo {
  if (lang === "ja") return "en"; // `config.ja_correo_en` queda como interruptor para cuando exista la versión JA.
  void config;
  return lang;
}

const VALOR: Record<IdiomaDeCorreo, Record<string, string>> = {
  es: {
    traceability: "la trazabilidad de finca a taza",
    cup_quality: "la calidad de taza verificada",
    direct_relationship: "la relación directa con el productor",
    consistency: "la consistencia entre lotes y cosechas",
    small_lots: "los lotes pequeños o fraccionados",
    sustainability: "la sostenibilidad documentada",
    price: "un precio competitivo",
    origin_story: "una historia de origen para tus clientes",
  },
  en: {
    traceability: "farm-to-cup traceability",
    cup_quality: "verified cup quality",
    direct_relationship: "a direct relationship with the producer",
    consistency: "consistency across lots and harvests",
    small_lots: "small or fractioned lots",
    sustainability: "documented sustainability",
    price: "a competitive price",
    origin_story: "an origin story for your customers",
  },
};

const UI: Record<IdiomaDeCorreo, { perfilTitulo: string; perfilIntro: string; perfilBoton: string; sinResponder: string; pdf: string; granos: (n: number) => string; si: string; codigo: string; responder: string }> = {
  es: {
    perfilTitulo: "Tu perfil (opcional)",
    perfilIntro: "Dejaste estas preguntas para después. Si quieres, respóndelas debajo de cada una en este mismo correo, o complétalas en un minuto con el botón: las respuestas que ya diste van prellenadas.",
    perfilBoton: "Completar o corregir mis respuestas",
    sinResponder: "(sin responder)",
    pdf: "Tu comprobante de registro en PDF",
    granos: (n) => `${n} de 5 granos`,
    si: "Sí",
    codigo: "Tu código de registro",
    responder: "Responde a este correo y la conversación llega al mismo registro.",
  },
  en: {
    perfilTitulo: "Your profile (optional)",
    perfilIntro: "You left these questions for later. If you like, answer them under each one by replying to this email, or complete them in a minute with the button: the answers you already gave are pre-filled.",
    perfilBoton: "Complete or correct my answers",
    sinResponder: "(not answered)",
    pdf: "Your registration receipt in PDF",
    granos: (n) => `${n} of 5 beans`,
    si: "Yes",
    codigo: "Your registration code",
    responder: "Reply to this email and the conversation reaches the same registration.",
  },
};

const lista = (items: string[], lang: IdiomaDeCorreo): string => {
  if (items.length <= 1) return items[0] ?? "";
  const y = lang === "es" ? " y " : " and ";
  return items.slice(0, -1).join(", ") + y + items[items.length - 1];
};

const primerNombre = (fullName: string): string => fullName.trim().split(/\s+/)[0] ?? fullName;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function firma(config: ConfigDeFormulario, lang: IdiomaDeCorreo): string {
  const quien = config.firma ? `${config.firma}\n` : "";
  return `${lang === "es" ? "Un abrazo," : "Warm regards,"}\n${quien}${CTC_RAZON} · CTCx\n${config.reply_to}`;
}

function bajaLinea(baja: string, lang: IdiomaDeCorreo): string {
  return lang === "es"
    ? `Si no quieres recibir más correos sobre esta conversación, puedes darte de baja aquí: ${baja}`
    : `If you would rather not receive further emails about this conversation, you can unsubscribe here: ${baja}`;
}

/** El rótulo de una pregunta del paso 2 y su respuesta actual, en el idioma del correo (con los textos del formulario). */
export function preguntasPrellenadas(lead: LeadParaCorreo, lang: IdiomaDeCorreo): { campo: CampoDelPaso2; pregunta: string; respuesta: string | null }[] {
  const def = formulario(lead.form_key);
  const t: TextosDeIdioma | null = def ? def.textos[lang] : null;
  const ui = UI[lang];
  const rot = (grupo: string, clave: string) => t?.options[grupo]?.[clave] ?? clave;
  const x = lead.extra ?? {};
  const PREG: Record<CampoDelPaso2, [string, () => string | null]> = {
    green_volume: ["q_volume", () => (lead.green_volume ? rot("green_volume", lead.green_volume) : null)],
    buys_colombian: ["q_colombia", () => (lead.buys_colombian ? rot("buys_colombian", lead.buys_colombian) : null)],
    profiles: ["q_profiles", () => (lead.profiles.length ? lead.profiles.map((k) => rot("profiles", k)).join(", ") : null)],
    grades_interest: ["q_grades", () => (Array.isArray(x.grades_interest) && (x.grades_interest as string[]).length ? (x.grades_interest as string[]).map((k) => rot("grades_interest", k)).join(", ") : null)],
    purchase_format: ["q_format", () => (typeof x.purchase_format === "string" && x.purchase_format ? rot("purchase_format", x.purchase_format) : null)],
    certifications: ["q_certs", () => (Array.isArray(x.certifications) && (x.certifications as string[]).length ? (x.certifications as string[]).map((k) => rot("certifications", k)).join(", ") : null)],
    roast_in_destination: ["q_roast", () => (typeof x.roast_in_destination === "string" && x.roast_in_destination ? rot("roast_in_destination", x.roast_in_destination) : null)],
    regional_node_interest: ["q_node", () => (x.regional_node_interest === true ? ui.si : null)],
    producer_interest: ["q_producer", () => (x.producer_interest === true ? ui.si : null)],
    about: ["about", () => lead.about],
    values: [
      "q_values",
      () => {
        const e = Object.entries(lead.values_beans ?? {}).filter(([, v]) => Number(v) >= 0);
        return e.length ? e.sort((a, b) => Number(b[1]) - Number(a[1])).map(([k, v]) => `${rot("values", k)} · ${ui.granos(Number(v))}`).join("; ") : null;
      },
    ],
  };
  return preguntasDelPaso2(lead).map(({ campo }) => {
    const [clave, resp] = PREG[campo];
    return { campo, pregunta: t?.ui[clave] ?? clave, respuesta: resp() };
  });
}

function bloquePerfilTexto(lead: LeadParaCorreo, lang: IdiomaDeCorreo, enlaces: EnlacesDeCorreo): string {
  const ui = UI[lang];
  const preguntas = preguntasPrellenadas(lead, lang);
  if (!preguntas.length) return "";
  return [`— ${ui.perfilTitulo} —`, ui.perfilIntro, enlaces.completar, "", ...preguntas.map((p) => `· ${p.pregunta}\n  → ${p.respuesta ?? ui.sinResponder}`)].join("\n");
}

function html(lead: LeadParaCorreo, lang: IdiomaDeCorreo, parrafos: string[], enlaces: EnlacesDeCorreo, config: ConfigDeFormulario, conPerfil: boolean): string {
  const ui = UI[lang];
  const codigo = codigoDeLead(lead.form_key, lead.id);
  const preguntas = conPerfil ? preguntasPrellenadas(lead, lang) : [];
  const p = (s: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#1b2430">${esc(s).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color:#16436b">$1</a>')}</p>`;
  const perfil = preguntas.length
    ? `<div style="margin:22px 0;padding:18px 18px 8px;border:1px solid #dde1e7;border-radius:12px;background:#f5f6f8">
  <p style="margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5a6472">${esc(ui.perfilTitulo)}</p>
  <p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:#1b2430">${esc(ui.perfilIntro)}</p>
  ${preguntas.map((q) => `<p style="margin:0 0 10px;font-size:15px;line-height:1.45;color:#1b2430"><span style="color:#5a6472">${esc(q.pregunta)}</span><br><b>${q.respuesta ? esc(q.respuesta) : `<span style="color:#9aa6b2;font-weight:400">${esc(ui.sinResponder)}</span>`}</b></p>`).join("")}
  <p style="margin:14px 0 10px"><a href="${esc(enlaces.completar)}" style="display:inline-block;background:#e3a32c;color:#1b1405;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;font-size:15px">${esc(ui.perfilBoton)} →</a></p>
  <p style="margin:0 0 8px;font-size:13px;color:#5a6472">${esc(ui.responder)}</p>
</div>`
    : "";
  const firmaHtml = esc(firma(config, lang)).replace(/\n/g, "<br>");
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CTCx · SCAJ 2026</title></head><body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 20px 32px">
  <div style="background:#16436b;color:#fff;border-radius:12px;padding:16px 18px;margin-bottom:22px">
    <div style="font-size:20px;font-weight:700;letter-spacing:.02em">CTCx <span style="font-weight:400;font-size:14px;opacity:.9">· ${esc(CTC_RAZON)}</span></div>
    <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#f2c464;margin-top:6px">SCAJ 2026 · ${esc(ui.codigo)}: ${esc(codigo)}</div>
  </div>
  ${parrafos.map(p).join("")}
  ${perfil}
  <p style="margin:18px 0 0;font-size:15px"><a href="${esc(enlaces.pdf)}" style="color:#16436b">${esc(ui.pdf)} ↓</a></p>
  <p style="margin:22px 0 0;font-size:15px;line-height:1.5;color:#1b2430">${firmaHtml}</p>
  <hr style="border:0;border-top:1px solid #dde1e7;margin:26px 0 12px">
  <p style="margin:0;font-size:12px;line-height:1.5;color:#5a6472">${esc(bajaLinea(enlaces.baja, lang)).replace(/(https?:\/\/[^\s]+)/, '<a href="$1" style="color:#5a6472">$1</a>')}</p>
</div></body></html>`;
}

/** El correo INMEDIATO: sale apenas se guarda el lead. */
export function construirCorreoInmediato(lead: LeadParaCorreo, config: ConfigDeFormulario, enlaces: EnlacesDeCorreo, extras: ExtrasDeCorreo = {}): Correo {
  const lang = idiomaDelCorreo(lead.lang, config);
  const es = lang === "es";
  const nombre = primerNombre(lead.full_name);
  const comprador = esComprador(lead.participant_type);
  const top = valoresPrincipales(lead.values_beans).map((k) => VALOR[lang][k]).filter(Boolean);
  const wants = new Set(lead.wants);
  const extra = lead.extra ?? {};
  const p: string[] = [];

  p.push(es ? `Hola ${nombre},` : `Hello ${nombre},`);
  if (top.length) {
    p.push(
      es
        ? `Gracias por la conversación en SCAJ. Nos dijiste que lo que más pesa para ti es ${lista(top, lang)}: tomamos nota, porque así es exactamente como trabajamos cada lote.`
        : `Thank you for the conversation at SCAJ. You told us that what weighs most for you is ${lista(top, lang)}: noted, because that is exactly how we work every lot.`
    );
  } else {
    p.push(es ? `Gracias por la conversación en SCAJ y por dejarnos tus datos.` : `Thank you for the conversation at SCAJ and for leaving us your details.`);
  }

  if (comprador) {
    p.push(
      es
        ? `Nuestro catálogo para tostadores vive en Cherry Picked: lotes colombianos con su grado CTCx, su evaluación y su Dossier, que se compran a través de CTCx. ${enlaces.cherryPicked}`
        : `Our catalogue for roasters lives in Cherry Picked: Colombian lots with their CTCx grade, their evaluation and their Dossier, bought through CTCx. ${enlaces.cherryPicked}`
    );
  } else if (lead.participant_type === "producer") {
    p.push(
      es
        ? `Kaffetal Regal es nuestra plataforma para el productor: allí se registra la finca, se arma la ficha de cada lote y el café se evalúa con protocolo para recibir su grado CTCx y una oferta. ${enlaces.kaffetalRegal}`
        : `Kaffetal Regal is our platform for the producer: the farm is registered there, each lot gets its technical sheet and the coffee is evaluated under protocol to receive its CTCx grade and an offer. ${enlaces.kaffetalRegal}`
    );
    if (extra.producer_interest === true) {
      p.push(
        es
          ? `Nos marcaste interés en evaluar y vender tu café con CTCx: cuéntanos de tu finca y de tu café respondiendo a este correo y te decimos cómo empieza la evaluación.`
          : `You marked an interest in evaluating and selling your coffee with CTCx: tell us about your farm and your coffee by replying to this email and we will explain how the evaluation starts.`
      );
    }
  } else if (lead.participant_type === "press") {
    p.push(
      es
        ? `Con gusto conversamos contigo y te compartimos material sobre CTCx y el café colombiano con trazabilidad de finca a taza. Dinos qué formato te sirve (entrevista, imágenes, visita a origen) y lo preparamos.`
        : `We would be glad to talk and to share material about CTCx and Colombian coffee with farm-to-cup traceability. Tell us which format works for you (interview, images, a visit to origin) and we will prepare it.`
    );
  } else {
    p.push(
      es
        ? `Cuéntanos un poco más de lo que haces respondiendo a este correo, y te decimos por dónde podemos empezar.`
        : `Tell us a little more about what you do by replying to this email, and we will suggest where to start.`
    );
  }

  if (wants.has("sample_pack")) {
    p.push(
      es
        ? `Pediste el Sample Pack: respóndenos con la dirección de envío (empresa, calle, ciudad, código postal, país y un teléfono) y lo coordinamos contigo.`
        : `You asked for the Sample Pack: reply with the shipping address (company, street, city, postal code, country and a phone number) and we will coordinate it with you.`
    );
  }
  if (wants.has("lot_list")) {
    p.push(es ? `El catálogo público de lotes, con la referencia de cada uno, está aquí: ${enlaces.catalogo}` : `The public lot catalogue, with each lot's reference, is here: ${enlaces.catalogo}`);
  }
  if (wants.has("video_call")) {
    p.push(
      config.agenda_url
        ? es
          ? `Para la videollamada, elige el horario que te sirva aquí: ${config.agenda_url}`
          : `For the video call, pick the time that suits you here: ${config.agenda_url}`
        : es
          ? `Para la videollamada, respóndenos con dos horarios que te sirvan (hora de Japón) y te confirmamos uno.`
          : `For the video call, reply with two time slots that suit you (Japan time) and we will confirm one.`
    );
  }
  if (wants.has("lcl_batch")) {
    p.push(
      es
        ? `Pediste un lote LCL (carga consolidada): cuéntanos tu puerto o ciudad de destino y los kilos que necesitas en la primera entrega, y te explicamos cómo se consolida.`
        : `You asked for an LCL batch (consolidated shipment): tell us your destination port or city and the kilos you need in the first delivery, and we will explain how it is consolidated.`
    );
  }
  if (wants.has("other") && typeof extra.wants_other === "string" && extra.wants_other.trim()) {
    p.push(es ? `También nos pediste: «${extra.wants_other.trim()}». Lo tenemos presente.` : `You also asked for: “${extra.wants_other.trim()}”. We have it in mind.`);
  }
  if (lead.master_roaster_interest) {
    p.push(
      es
        ? `Nos marcaste interés en el rol de Master Roaster de CTC: el tostador socio en destino que recibe el contenedor, guarda el café verde y tuesta café que ya está vendido. Nos gustaría conversarlo contigo: respóndenos y agendamos.`
        : `You marked an interest in the CTC Master Roaster role: the partner roastery at destination that receives the container, stores the green coffee and roasts coffee that is already sold. We would like to talk it through with you: reply and we will set up a conversation.`
    );
  }
  if (extra.regional_node_interest === true) {
    p.push(
      es
        ? `También nos marcaste interés en operar como nodo logístico de CTC en Japón, el socio que recibe el contenedor y guarda el café verde para los tostadores de la región. Lo conversamos cuando quieras.`
        : `You also marked an interest in operating as a CTC logistics node in Japan, the partner that receives the container and stores the green coffee for the region's roasters. We can talk it through whenever you like.`
    );
  }
  if (lead.looking_for) {
    p.push(es ? `Lo que buscas ahora, en tus palabras: «${lead.looking_for}». Lo tenemos presente.` : `What you are looking for right now, in your words: “${lead.looking_for}”. We have it in mind.`);
  }
  const volumen = fraseDeVolumen(extra, lang);
  if (volumen) p.push(volumen);
  const lotes = listaDeLotes(extra, extras.lotes);
  if (lotes.length) {
    p.push(
      es
        ? `${lotes.length === 1 ? "El lote que te llamó la atención" : "Los lotes que te llamaron la atención"}: ${lista(lotes, lang)}. Cada uno tiene su Dossier público en Find my Lot, por su referencia: ${enlaces.catalogo}`
        : `${lotes.length === 1 ? "The lot that caught your eye" : "The lots that caught your eye"}: ${lista(lotes, lang)}. Each one has its public Dossier in Find my Lot, by its reference: ${enlaces.catalogo}`
    );
  }

  const codigo = codigoDeLead(lead.form_key, lead.id);
  const perfilTexto = bloquePerfilTexto(lead, lang, enlaces);
  const textoFinal = [...p, ...(perfilTexto ? [perfilTexto] : []), `${UI[lang].pdf}: ${enlaces.pdf}`, firma(config, lang), bajaLinea(enlaces.baja, lang)].join("\n\n");
  return {
    lang,
    // Filtro de Gmail F02: este asunto lo reconoce un filtro del buzón principal. Cambiarlo obliga a cambiar el filtro (unificación P18).
    subject: es ? `${nombre}, gracias por pasar por el stand de CTC en SCAJ 2026 · ${codigo}` : `${nombre}, thank you for stopping by the CTC stand at SCAJ 2026 · ${codigo}`,
    text: textoFinal,
    html: html(lead, lang, p, enlaces, config, true),
  };
}

/** El SEGUIMIENTO: un solo correo, `seguimiento_dias` después, que retoma `wants` y `timing` y propone un paso concreto. */
export function construirSeguimiento(lead: LeadParaCorreo, config: ConfigDeFormulario, enlaces: EnlacesDeCorreo): Correo {
  const lang = idiomaDelCorreo(lead.lang, config);
  const es = lang === "es";
  const nombre = primerNombre(lead.full_name);
  const wants = new Set(lead.wants);
  const p: string[] = [];

  p.push(es ? `Hola ${nombre},` : `Hello ${nombre},`);
  p.push(es ? `Hace una semana nos conocimos en el stand de CTC en SCAJ 2026. Te escribo para retomar lo que hablamos.` : `A week ago we met at the CTC stand at SCAJ 2026. I am writing to pick up where we left off.`);
  if (wants.has("sample_pack")) {
    p.push(
      es
        ? `Si todavía no nos has mandado la dirección de envío para el Sample Pack, respóndeme con ella (empresa, calle, ciudad, código postal, país y teléfono) y lo ponemos en marcha.`
        : `If you have not yet sent us the shipping address for the Sample Pack, reply with it (company, street, city, postal code, country and phone) and we will get it moving.`
    );
  }
  if (wants.has("lot_list")) {
    p.push(es ? `El catálogo público de lotes sigue aquí: ${enlaces.catalogo}` : `The public lot catalogue is still here: ${enlaces.catalogo}`);
  }
  if (wants.has("video_call")) {
    p.push(
      config.agenda_url
        ? es
          ? `Si aún no agendaste la videollamada, puedes hacerlo aquí: ${config.agenda_url}`
          : `If you have not booked the video call yet, you can do it here: ${config.agenda_url}`
        : es
          ? `Si aún no fijamos la videollamada, respóndeme con dos horarios (hora de Japón) y la confirmamos.`
          : `If we have not set the video call yet, reply with two time slots (Japan time) and we will confirm it.`
    );
  }
  if (lead.timing === "lt_3m") {
    p.push(es ? `Nos dijiste que piensas comprar en los próximos meses: es buen momento para elegir lotes y conversar cantidades. Respóndeme y lo concretamos.` : `You told us you plan to buy in the coming months: this is a good time to choose lots and talk quantities. Reply and we will make it concrete.`);
  } else if (lead.timing === "3_6m") {
    p.push(es ? `Nos dijiste que tu compra sería en tres a seis meses: te iremos contando qué entra al catálogo, y cuando quieras lo aterrizamos.` : `You told us your purchase would be in three to six months: we will keep you posted on what enters the catalogue, and we can land it whenever you are ready.`);
  } else if (lead.timing === "exploring") {
    p.push(es ? `Nos dijiste que estás explorando, sin prisa. Si te sirve, te mandamos material sobre cómo trabajamos cada lote; solo responde a este correo.` : `You told us you are exploring, no rush. If it helps, we can send you material on how we work each lot; just reply to this email.`);
  } else if (!wants.size) {
    p.push(es ? `Si hay algo en lo que te podamos ayudar —un café que buscas, una pregunta sobre cómo trabajamos—, respóndeme a este correo.` : `If there is anything we can help with — a coffee you are looking for, a question about how we work — just reply to this email.`);
  }
  if (listaDeLotes(lead.extra, undefined).length) {
    p.push(es ? `Si quieres retomar alguno de los lotes que marcaste, dime cuál (su referencia CTC-L-) y te mando su Dossier.` : `If you would like to pick up any of the lots you marked, tell me which one (its CTC-L- reference) and I will send you its Dossier.`);
  }
  // El paso 2 sigue abierto si quedó algo sin responder.
  const pendientes = preguntasDelPaso2(lead).some((q) => !q.respondida);
  if (pendientes) {
    p.push(es ? `Si quieres contarnos un poco más de tu operación y de lo que valoras, el enlace sigue abierto: ${enlaces.completar}` : `If you would like to tell us a little more about your business and what you value, the link is still open: ${enlaces.completar}`);
  }

  const codigo = codigoDeLead(lead.form_key, lead.id);
  return {
    lang,
    // Filtro de Gmail F02: este asunto lo reconoce un filtro del buzón principal. Cambiarlo obliga a cambiar el filtro (unificación P18).
    subject: es ? `${nombre}, ¿seguimos? · CTC después de SCAJ 2026 · ${codigo}` : `${nombre}, shall we continue? · CTC after SCAJ 2026 · ${codigo}`,
    text: [...p, firma(config, lang), bajaLinea(enlaces.baja, lang)].join("\n\n"),
    html: html(lead, lang, p, enlaces, config, false),
  };
}
