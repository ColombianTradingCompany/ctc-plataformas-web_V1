// ── Interfaz de Leads · los dos CORREOS de un lead de feria (V6.2) — PURO ─────────────────────────────────────────────────────
// La especificación del owner (SCAJ 2026): el correo INMEDIATO «tiene que leerse como una respuesta a lo que esa persona dijo, no
// como un boletín» —abre con lo que más valoró, el enfoque depende del tipo, responde a lo que pidió, añade el Master Roaster si lo
// marcó— y el SEGUIMIENTO a los siete días retoma `wants` y `timing` y propone un siguiente paso concreto. Los dos llevan baja.
//
// REGLA DURA (owner): «el correo no puede inventar nada: ni precios, ni disponibilidad, ni puntajes, ni plazos de envío, ni
// condiciones del Sample Pack. Solo afirma lo que esté publicado en mi sitio». Por eso son BLOQUES de texto, no un modelo: lo que
// dicen de Cherry Picked, Kaffetal Regal, el catálogo público, el Master Roaster y el nodo regional es lo que ya dicen las
// superficies. El guardián `qa-lead-forms-check` falla si asoma una cifra de dinero, un puntaje o un plazo.
//
// Idiomas: ES y EN. Quien llenó en japonés recibe el correo en INGLÉS hasta que un hablante nativo revise una versión japonesa
// (`config.ja_correo_en`; hoy no existe la versión JA, así que el japonés cae a inglés siempre). Texto plano, como el resto de los
// transaccionales de la casa (`leadEmails.ts`): se lee bien en el celular y pasa los filtros.

import { esComprador, valoresPrincipales, type IdiomaDeFormulario, type LeadLimpio } from "./campos";
import type { ConfigDeFormulario } from "./registro";
import { CTC_RAZON } from "@/lib/legal";

export type IdiomaDeCorreo = "es" | "en";
export type LeadParaCorreo = LeadLimpio & { id: string; created_at: string };
export type Correo = { subject: string; text: string; lang: IdiomaDeCorreo };

export type EnlacesDeCorreo = {
  /** La URL de baja de ESTE lead (con su testigo). */
  baja: string;
  cherryPicked: string;
  kaffetalRegal: string;
  catalogo: string;
};

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

const lista = (items: string[], lang: IdiomaDeCorreo): string => {
  if (items.length <= 1) return items[0] ?? "";
  const y = lang === "es" ? " y " : " and ";
  return items.slice(0, -1).join(", ") + y + items[items.length - 1];
};

const primerNombre = (fullName: string): string => fullName.trim().split(/\s+/)[0] ?? fullName;

function firma(config: ConfigDeFormulario, lang: IdiomaDeCorreo): string {
  const quien = config.firma ? `${config.firma}\n` : "";
  return `${lang === "es" ? "Un abrazo," : "Warm regards,"}\n${quien}${CTC_RAZON} · CTCx\n${config.reply_to}`;
}

function bajaLinea(baja: string, lang: IdiomaDeCorreo): string {
  return lang === "es"
    ? `Si no quieres recibir más correos sobre esta conversación, puedes darte de baja aquí: ${baja}`
    : `If you would rather not receive further emails about this conversation, you can unsubscribe here: ${baja}`;
}

/** El correo INMEDIATO: sale apenas se guarda el lead. */
export function construirCorreoInmediato(lead: LeadParaCorreo, config: ConfigDeFormulario, enlaces: EnlacesDeCorreo): Correo {
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
    p.push(
      es
        ? `El catálogo público de lotes, con la referencia de cada uno, está aquí: ${enlaces.catalogo}`
        : `The public lot catalogue, with each lot's reference, is here: ${enlaces.catalogo}`
    );
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
  p.push(firma(config, lang));
  p.push(bajaLinea(enlaces.baja, lang));

  return {
    lang,
    subject: es ? `${nombre}, gracias por pasar por el stand de CTC en SCAJ 2026` : `${nombre}, thank you for stopping by the CTC stand at SCAJ 2026`,
    text: p.join("\n\n"),
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
  p.push(
    es
      ? `Hace una semana nos conocimos en el stand de CTC en SCAJ 2026. Te escribo para retomar lo que hablamos.`
      : `A week ago we met at the CTC stand at SCAJ 2026. I am writing to pick up where we left off.`
  );
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
    p.push(
      es
        ? `Nos dijiste que piensas comprar en los próximos meses: es buen momento para elegir lotes y conversar cantidades. Respóndeme y lo concretamos.`
        : `You told us you plan to buy in the coming months: this is a good time to choose lots and talk quantities. Reply and we will make it concrete.`
    );
  } else if (lead.timing === "3_6m") {
    p.push(
      es
        ? `Nos dijiste que tu compra sería en tres a seis meses: te iremos contando qué entra al catálogo, y cuando quieras lo aterrizamos.`
        : `You told us your purchase would be in three to six months: we will keep you posted on what enters the catalogue, and we can land it whenever you are ready.`
    );
  } else if (lead.timing === "exploring") {
    p.push(
      es
        ? `Nos dijiste que estás explorando, sin prisa. Si te sirve, te mandamos material sobre cómo trabajamos cada lote; solo responde a este correo.`
        : `You told us you are exploring, no rush. If it helps, we can send you material on how we work each lot; just reply to this email.`
    );
  } else if (!wants.size) {
    p.push(
      es
        ? `Si hay algo en lo que te podamos ayudar —un café que buscas, una pregunta sobre cómo trabajamos—, respóndeme a este correo.`
        : `If there is anything we can help with — a coffee you are looking for, a question about how we work — just reply to this email.`
    );
  }
  p.push(firma(config, lang));
  p.push(bajaLinea(enlaces.baja, lang));

  return {
    lang,
    subject: es ? `${nombre}, ¿seguimos? · CTC después de SCAJ 2026` : `${nombre}, shall we continue? · CTC after SCAJ 2026`,
    text: p.join("\n\n"),
  };
}
