import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, PDFName, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { CTC_EMAIL, CTC_LEGAL_LINE, CTC_RAZON, CTC_SEDE, NIT } from "@/lib/legal";
import { INSTAGRAM_URL, YOUTUBE_URL } from "@/lib/redesSociales";
import { origenDeSuperficie, WWW_ORIGIN } from "@/lib/red/subdominios";
import { codigoDeLead, valoresPrincipales, type IdiomaDeFormulario, type LeadDeEvento, type LoteParaElegir } from "./campos";
import { formulario } from "./registro";

// ── Interfaz de Leads · la CONFIRMACIÓN en PDF (V6.4, owner 2026-10-11 · V6.5, owner 2026-10-12) ─────────────────────────────
// «Una vez enviado el Form, quiero que se le muestre al usuario un mensaje de agradecimiento y un PDF descargable que tenga arriba
// una confirmación de llenado con referencia al SCAJ2026 y la información clave de CTCx con enlaces a las redes.»
// V6.5: «haz que el PDF tenga más información relevante a los datos seleccionados en el Form». Después de la confirmación va la
// sección «Tus respuestas» (lo que buscas, cuándo, qué quieres recibir, la necesidad de volumen, los lotes que marcaste, el Master
// Roaster y, si ya está, el paso 2) y «Qué sigue» se adapta a lo marcado (Sample Pack, lista de lotes, videollamada, lote LCL,
// «otro», los lotes, el volumen). Sin cifras de dinero, puntajes ni plazos: la misma regla dura de los correos.
// Un documento generado en el servidor con pdf-lib (sin navegador ni servicio externo), de una página o dos si las respuestas lo
// piden: arriba la confirmación (la feria, el código del registro, la fecha y hora de Japón, nombre, empresa y correo), luego las
// respuestas, qué sigue, CTCx en tres líneas, las plataformas con su enlace, las redes y la línea legal. Los enlaces son clicables
// (anotaciones URI). Va ADJUNTO al correo inmediato y se descarga desde la pantalla de gracias, el correo y la LCP.
//
// FUENTES: Helvetica (estándar, sin archivo) cubre español e inglés. El japonés necesita una fuente CJK; si existe
// `public/fonts/NotoSansJP-Regular.otf` (OFL; el owner decide incorporarla), se incrusta en subconjunto y el PDF sale en japonés.
// Sin ella, quien llenó en japonés recibe el PDF en INGLÉS y lo que no se pueda dibujar con Helvetica (un nombre en kanji) se
// sustituye por su correo, nunca por «????».

const AZUL = rgb(0.086, 0.263, 0.42); // --primary #16436B
const DORADO = rgb(0.89, 0.64, 0.17); // --accent #E3A32C
const TINTA = rgb(0.106, 0.141, 0.188);
const GRIS = rgb(0.353, 0.392, 0.447);
const A4: [number, number] = [595.28, 841.89];
const M = 48;
/** Lo que reserva el pie en cada página (línea legal, nota y número de página). */
const PIE = 86;

const RUTA_FUENTE_JP = path.join(process.cwd(), "public", "fonts", "NotoSansJP-Regular.otf");
export const hayFuenteJaponesa = (): boolean => existsSync(RUTA_FUENTE_JP);

type Textos = {
  titulo: string;
  sub: string;
  confirmacion: string;
  codigo: string;
  fecha: string;
  nombre: string;
  empresa: string;
  correo: string;
  tipo: string;
  respuestas: string;
  buscas: string;
  cuando: string;
  quieres: string;
  volumen: string;
  lotes: string;
  masterRoaster: string;
  perfil: string;
  si: string;
  porPeriodo: Record<string, string>;
  queSigue: string;
  sigue: string[];
  sigueSample: string;
  sigueLista: string;
  sigueVideo: string;
  sigueLcl: string;
  sigueOtro: string;
  sigueLotes: string;
  sigueMr: string;
  sigueVolumen: string;
  quienes: string;
  ctcx: string[];
  plataformas: string;
  redes: string;
  privacidad: string;
  nota: string;
  pagina: string;
};

const T: Record<IdiomaDeFormulario, Textos> = {
  es: {
    titulo: "Confirmación de registro",
    sub: "SCAJ 2026 · Tokyo Big Sight · 14–17 de octubre de 2026 · stand con la Embajada de Colombia y ProColombia",
    confirmacion: "Recibimos tus respuestas. Este documento es tu comprobante.",
    codigo: "Código de registro",
    fecha: "Fecha y hora (Japón)",
    nombre: "Nombre",
    empresa: "Empresa",
    correo: "Correo",
    tipo: "Perfil",
    respuestas: "Tus respuestas",
    buscas: "Qué buscas ahora",
    cuando: "Cuándo piensas comprar",
    quieres: "Qué quieres recibir",
    volumen: "Necesidad de volumen estimada",
    lotes: "Lotes que te llamaron la atención",
    masterRoaster: "Interés en el rol de Master Roaster",
    perfil: "Tu operación y lo que valoras",
    si: "Sí",
    porPeriodo: { monthly: "al mes", bimonthly: "cada dos meses", quarterly: "por trimestre", semester: "por semestre", yearly: "al año" },
    queSigue: "Qué sigue",
    sigue: [
      "Este comprobante también te llegó adjunto al correo de respuesta; si no lo ves, revisa la carpeta de spam.",
      "En ese correo van las preguntas opcionales que dejaste para después, prellenadas: puedes completarlas desde el enlace o respondiendo al correo.",
      "Toda la conversación se enruta a este mismo registro con tu código.",
    ],
    sigueSample: "Pediste el Sample Pack: en el correo te pedimos la dirección de envío para coordinarlo contigo.",
    sigueLista: "Pediste la lista de lotes: el catálogo público, con la referencia de cada lote, está en «Find my Lot» (enlace abajo).",
    sigueVideo: "Pediste una videollamada: en el correo va cómo agendarla.",
    sigueLcl: "Pediste un lote LCL (carga consolidada): cuéntanos tu puerto o ciudad de destino y los kilos de la primera entrega, y te explicamos cómo se consolida.",
    sigueOtro: "También nos pediste: «{otro}». Lo tenemos presente.",
    sigueLotes: "Los lotes que marcaste tienen su Dossier público en «Find my Lot»: búscalos por su referencia CTC-L-.",
    sigueMr: "Te interesa el rol de Master Roaster (el tostador socio en destino): lo conversamos contigo.",
    sigueVolumen: "Con tu volumen estimado dimensionamos el formato que te conviene: sacos, pallet, carga consolidada o contenedor.",
    quienes: "CTCx · Colombian Trading Company",
    ctcx: [
      "Exportamos café verde colombiano con trazabilidad de finca a taza: cada lote lleva su referencia CTC-L-, su evaluación con protocolo (CVA; SCA 2004 equivale) y su Dossier.",
      "Kaffetal Regal es la plataforma del productor; Cherry Picked, la del tostador y el comprador; «Find my Lot» busca cualquier lote por su referencia.",
      "El Master Roaster es el tostador socio en destino: recibe el contenedor, guarda el verde y tuesta café que ya está vendido.",
    ],
    plataformas: "Plataformas",
    redes: "Redes",
    privacidad: "Aviso de privacidad",
    nota: "Documento generado automáticamente por ctcexport.com.",
    pagina: "Página",
  },
  en: {
    titulo: "Registration confirmation",
    sub: "SCAJ 2026 · Tokyo Big Sight · 14–17 October 2026 · stand with the Embassy of Colombia and ProColombia",
    confirmacion: "We received your answers. This document is your receipt.",
    codigo: "Registration code",
    fecha: "Date and time (Japan)",
    nombre: "Name",
    empresa: "Company",
    correo: "Email",
    tipo: "Profile",
    respuestas: "Your answers",
    buscas: "What you are looking for now",
    cuando: "When you plan to buy",
    quieres: "What you would like to receive",
    volumen: "Estimated volume need",
    lotes: "Lots that caught your eye",
    masterRoaster: "Interest in the Master Roaster role",
    perfil: "Your business and what you value",
    si: "Yes",
    porPeriodo: { monthly: "per month", bimonthly: "every two months", quarterly: "per quarter", semester: "every six months", yearly: "per year" },
    queSigue: "What's next",
    sigue: [
      "This receipt also reached you attached to our reply email; if you do not see it, please check your spam folder.",
      "That email carries the optional questions you left for later, pre-filled: complete them from the link or simply by replying.",
      "The whole conversation is routed to this same registration through your code.",
    ],
    sigueSample: "You asked for the Sample Pack: in the email we ask for your shipping address to coordinate it with you.",
    sigueLista: "You asked for the lot list: the public catalogue, with each lot's reference, is in “Find my Lot” (link below).",
    sigueVideo: "You asked for a video call: the email explains how to book it.",
    sigueLcl: "You asked for an LCL batch (consolidated shipment): tell us your destination port or city and the kilos of the first delivery, and we will explain how it is consolidated.",
    sigueOtro: "You also asked for: “{otro}”. We have it in mind.",
    sigueLotes: "The lots you marked have their public Dossier in “Find my Lot”: look them up by their CTC-L- reference.",
    sigueMr: "You are interested in the Master Roaster role (the partner roastery at destination): we will talk it through with you.",
    sigueVolumen: "With your estimated volume we size the format that suits you: bags, pallet, consolidated shipment or container.",
    quienes: "CTCx · Colombian Trading Company",
    ctcx: [
      "We export Colombian green coffee with farm-to-cup traceability: every lot carries its CTC-L- reference, its protocol evaluation (CVA; SCA 2004 is equivalent) and its Dossier.",
      "Kaffetal Regal is the producer's platform; Cherry Picked, the roaster's and buyer's; “Find my Lot” finds any lot by its reference.",
      "The Master Roaster is the partner roastery at destination: it receives the container, stores the green coffee and roasts coffee that is already sold.",
    ],
    plataformas: "Platforms",
    redes: "Social",
    privacidad: "Privacy notice",
    nota: "Document generated automatically by ctcexport.com.",
    pagina: "Page",
  },
  ja: {
    titulo: "登録確認書",
    sub: "SCAJ 2026 · 東京ビッグサイト · 2026年10月14日〜17日 · コロンビア大使館・ProColombia ブース",
    confirmacion: "ご回答を受け付けました。本書はその控えです。",
    codigo: "登録コード",
    fecha: "日時(日本時間)",
    nombre: "お名前",
    empresa: "会社名",
    correo: "メール",
    tipo: "区分",
    respuestas: "ご回答内容",
    buscas: "いま探しているもの",
    cuando: "購入予定時期",
    quieres: "ご希望の内容",
    volumen: "想定される必要量",
    lotes: "気になったロット",
    masterRoaster: "マスターロースターへの関心",
    perfil: "事業内容と重視する点",
    si: "はい",
    porPeriodo: { monthly: "/ 月", bimonthly: "/ 2か月", quarterly: "/ 四半期", semester: "/ 半年", yearly: "/ 年" },
    queSigue: "今後について",
    sigue: [
      "この控えは返信メールにも添付してお送りしています。届かない場合は迷惑メールフォルダをご確認ください。",
      "そのメールには、後回しにされた任意の質問が入力済みの状態で含まれます。リンクから、またはメールへの返信でご回答いただけます。",
      "やり取りはすべて、このコードでこの登録に紐づけられます。",
    ],
    sigueSample: "サンプルパックをご希望の方へ:メールで配送先住所をお伺いし、手配いたします。",
    sigueLista: "ロット一覧をご希望の方へ:各ロットの参照番号付きの公開カタログは「Find my Lot」でご覧いただけます(下記リンク)。",
    sigueVideo: "ビデオ通話をご希望の方へ:予約方法はメールでご案内します。",
    sigueLcl: "LCL(混載)でのロットをご希望の方へ:仕向け地の港または都市と、初回納品のキロ数をお知らせください。混載の流れをご説明します。",
    sigueOtro: "その他のご希望:「{otro}」。承知しました。",
    sigueLotes: "選択されたロットの公開ドシエは「Find my Lot」で参照番号(CTC-L-)から検索できます。",
    sigueMr: "マスターロースター(消費国側のパートナー焙煎所)にご関心をお持ちですね。詳しくご相談させてください。",
    sigueVolumen: "想定数量をもとに、袋・パレット・混載・コンテナのうち最適な形態をご提案します。",
    quienes: "CTCx · Colombian Trading Company",
    ctcx: [
      "農園からカップまでトレーサビリティのあるコロンビア産生豆を輸出しています。各ロットには CTC-L- の参照番号、プロトコルに基づく評価(CVA。SCA 2004 と同等)、ドシエが付きます。",
      "Kaffetal Regal は生産者向け、Cherry Picked はロースターとバイヤー向けのプラットフォームです。「Find my Lot」で参照番号からロットを検索できます。",
      "マスターロースターは消費国側のパートナー焙煎所です。コンテナを受け取り、生豆を保管し、販売先の決まったコーヒーを焙煎します。",
    ],
    plataformas: "プラットフォーム",
    redes: "SNS",
    privacidad: "プライバシーポリシー",
    nota: "本書は ctcexport.com により自動生成されました。",
    pagina: "ページ",
  },
};

const TIPO: Record<IdiomaDeFormulario, Record<string, string>> = {
  es: { roaster: "Tostador", importer: "Importador / trader de verde", cafe_horeca: "Cafetería / HORECA", distributor: "Distribuidor / retail", producer: "Productor / exportador", barista: "Barista / profesional", press: "Prensa / medios", other: "Otro" },
  en: { roaster: "Roaster", importer: "Green importer / trader", cafe_horeca: "Café / HORECA", distributor: "Distributor / retail", producer: "Producer / exporter", barista: "Barista / coffee professional", press: "Press / media", other: "Other" },
  ja: { roaster: "ロースター(焙煎)", importer: "生豆輸入・商社", cafe_horeca: "カフェ・飲食店", distributor: "卸売・小売", producer: "生産者・輸出業者", barista: "バリスタ・コーヒー関係者", press: "報道・メディア", other: "その他" },
};

/** ¿Helvetica puede dibujar este texto? (WinAnsi: latín, acentos, «·», «–»). */
const dibujable = (s: string) => /^[\u0000-ÿ–—‘’“”•…€]*$/.test(s);
const formatoKg = (n: number, lang: IdiomaDeFormulario): string => n.toLocaleString(lang === "es" ? "es-CO" : lang === "ja" ? "ja-JP" : "en-GB");

export type PdfDeConfirmacion = { bytes: Uint8Array; nombreDeArchivo: string; lang: IdiomaDeFormulario };
export type OpcionesDelPdf = {
  formKey: string;
  ruta: string;
  privacyUrl: string;
  /** V6.5: los lotes de la vitrina que el lead marcó, con su nombre público de hoy (sin él, solo la referencia). */
  lotes?: LoteParaElegir[];
};

/** El cursor de dibujo: la página actual y la altura; `asegurar` abre otra página cuando lo que sigue no cabe sobre el pie. */
type Lienzo = { page: PDFPage; y: number; asegurar: (alto: number) => void };

export async function pdfDeConfirmacion(lead: LeadDeEvento, opts: OpcionesDelPdf): Promise<PdfDeConfirmacion> {
  const doc = await PDFDocument.create();
  doc.setTitle("CTCx · SCAJ 2026");
  doc.setAuthor(CTC_RAZON);
  doc.setLanguage(lead.lang);

  // La fuente: Helvetica salvo que haya la japonesa y el lead sea japonés.
  let lang: IdiomaDeFormulario = lead.lang;
  let fuente: PDFFont;
  let negrita: PDFFont;
  if (lang === "ja" && hayFuenteJaponesa()) {
    doc.registerFontkit(fontkit);
    const bytes = readFileSync(RUTA_FUENTE_JP);
    fuente = await doc.embedFont(bytes, { subset: true });
    negrita = fuente;
  } else {
    if (lang === "ja") lang = "en";
    fuente = await doc.embedFont(StandardFonts.Helvetica);
    negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  }
  const cjk = lang === "ja";
  const seguro = (s: string): string => (cjk || dibujable(s) ? s : s.replace(/[^\u0000-ÿ–—‘’“”•…€]/g, "").trim());
  const t = T[lang];
  const tx = formulario(opts.formKey)?.textos[lang] ?? null;
  const rot = (grupo: string, clave: string) => tx?.options[grupo]?.[clave] ?? clave;
  const preg = (clave: string, porDefecto: string) => tx?.ui[clave] ?? porDefecto;
  const codigo = codigoDeLead(opts.formKey, lead.id);
  const fecha = new Date(lead.created_at).toLocaleString(lang === "ja" ? "ja-JP" : lang === "es" ? "es-CO" : "en-GB", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" });
  const [width, alto] = A4;
  const ancho = width - 2 * M;

  const l: Lienzo = {
    page: doc.addPage(A4),
    y: alto - M,
    asegurar(h) {
      if (l.y - h < PIE) {
        l.page = doc.addPage(A4);
        l.y = alto - M;
      }
    },
  };
  const titulo = (s: string) => {
    l.asegurar(44);
    l.page.drawText(seguro(s), { x: M, y: l.y, size: 12, font: negrita, color: AZUL });
    l.y -= 16;
  };
  const parrafo = (s: string, o: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; interlineado?: number } = {}) =>
    dibujarParrafo(l, seguro(s), { x: o.x ?? M, size: o.size ?? 10, font: o.font ?? fuente, color: o.color ?? TINTA, ancho: ancho - ((o.x ?? M) - M), interlineado: o.interlineado ?? 13.5 });
  const vineta = (s: string) => {
    parrafo("• " + s);
    l.y -= 4;
  };
  /** Una respuesta: el rótulo en gris y, debajo, el valor en negrita (una línea por elemento si es una lista). */
  const fila = (rotuloDeFila: string, valor: string | string[]) => {
    const valores = (Array.isArray(valor) ? valor : [valor]).map(seguro).filter(Boolean);
    if (!valores.length) return;
    l.asegurar(30);
    l.page.drawText(seguro(rotuloDeFila), { x: M + 12, y: l.y, size: 9, font: fuente, color: GRIS });
    l.y -= 13;
    for (const v of valores) parrafo(v, { x: M + 12, size: 10.5, font: negrita, interlineado: 14 });
    l.y -= 5;
  };

  // Cabecera azul con la marca y la feria (solo en la primera página).
  l.page.drawRectangle({ x: 0, y: alto - 118, width, height: 118, color: AZUL });
  l.page.drawText("CTCx", { x: M, y: alto - 52, size: 26, font: negrita, color: rgb(1, 1, 1) });
  l.page.drawText(CTC_RAZON, { x: M + 78, y: alto - 50, size: 12, font: fuente, color: rgb(1, 1, 1) });
  l.page.drawText(t.titulo, { x: M, y: alto - 84, size: 18, font: negrita, color: DORADO });
  let ySub = alto - 104;
  for (const linea of partir(seguro(t.sub), fuente, 9.5, ancho)) {
    l.page.drawText(linea, { x: M, y: ySub, size: 9.5, font: fuente, color: rgb(0.86, 0.9, 0.95) });
    ySub -= 12;
  }
  l.y = alto - 118 - 26;

  // El bloque de confirmación.
  l.page.drawText(seguro(t.confirmacion), { x: M, y: l.y, size: 11.5, font: negrita, color: TINTA });
  l.y -= 22;
  const nombre = seguro(lead.full_name) || lead.email;
  const empresa = seguro(lead.company) || "—";
  const filas: [string, string][] = [
    [t.codigo, codigo],
    [t.fecha, fecha],
    [t.nombre, nombre],
    [t.empresa, empresa],
    [t.correo, lead.email],
    [t.tipo, lead.participant_type === "other" && lead.participant_other ? seguro(lead.participant_other) || TIPO[lang].other : TIPO[lang][lead.participant_type] ?? lead.participant_type],
  ];
  const cajaY = l.y + 10;
  const altoCaja = filas.length * 18 + 16;
  l.page.drawRectangle({ x: M, y: cajaY - altoCaja, width: ancho, height: altoCaja, borderColor: rgb(0.87, 0.88, 0.9), borderWidth: 1, color: rgb(0.97, 0.98, 0.99) });
  let fy = cajaY - 20;
  for (const [k, v] of filas) {
    l.page.drawText(k, { x: M + 12, y: fy, size: 9.5, font: fuente, color: GRIS });
    l.page.drawText(v, { x: M + 150, y: fy, size: k === t.codigo ? 12 : 10.5, font: negrita, color: k === t.codigo ? AZUL : TINTA });
    fy -= 18;
  }
  l.y = cajaY - altoCaja - 24;

  // V6.5 · Tus respuestas: lo que marcó en el paso 1 y, si ya lo dio, el paso 2.
  const x = (lead.extra ?? {}) as Record<string, unknown>;
  const wants = new Set(lead.wants);
  const otro = typeof x.wants_other === "string" ? x.wants_other.trim() : "";
  const kg = typeof x.volume_kg === "number" && Number.isFinite(x.volume_kg) ? x.volume_kg : null;
  const periodo = typeof x.volume_period === "string" ? x.volume_period : null;
  const refs = Array.isArray(x.lots_of_interest) ? (x.lots_of_interest as string[]) : [];
  const respuestas: [string, string | string[]][] = [];
  if (lead.looking_for) respuestas.push([t.buscas, lead.looking_for]);
  if (lead.timing) respuestas.push([t.cuando, rot("timing", lead.timing)]);
  if (lead.wants.length) respuestas.push([t.quieres, lead.wants.map((w) => (w === "other" && otro ? `${rot("wants", w)}: ${otro}` : rot("wants", w)))]);
  if (kg || periodo) respuestas.push([t.volumen, kg ? `${formatoKg(kg, lang)} kg ${periodo ? t.porPeriodo[periodo] ?? rot("volume_period", periodo) : ""}`.trim() : rot("volume_period", periodo!)]);
  if (refs.length) {
    respuestas.push([
      t.lotes,
      refs.map((code) => {
        const lote = opts.lotes?.find((q) => q.code === code);
        return lote?.name ? `${lote.name} · ${code}` : code;
      }),
    ]);
  }
  if (lead.master_roaster_interest) respuestas.push([t.masterRoaster, t.si]);
  const paso2: [string, string | string[]][] = [];
  if (lead.green_volume) paso2.push([preg("q_volume", "Green volume"), rot("green_volume", lead.green_volume)]);
  if (lead.buys_colombian) paso2.push([preg("q_colombia", "Colombian coffee"), rot("buys_colombian", lead.buys_colombian)]);
  if (lead.profiles.length) paso2.push([preg("q_profiles", "Profiles"), lead.profiles.map((k) => rot("profiles", k)).join(" · ")]);
  if (Array.isArray(x.grades_interest) && (x.grades_interest as string[]).length) paso2.push([preg("q_grades", "Grades"), (x.grades_interest as string[]).map((k) => rot("grades_interest", k)).join(" · ")]);
  if (typeof x.purchase_format === "string" && x.purchase_format) paso2.push([preg("q_format", "Format"), rot("purchase_format", x.purchase_format)]);
  if (Array.isArray(x.certifications) && (x.certifications as string[]).length) paso2.push([preg("q_certs", "Certifications"), (x.certifications as string[]).map((k) => rot("certifications", k)).join(" · ")]);
  if (typeof x.roast_in_destination === "string" && x.roast_in_destination) paso2.push([preg("q_roast", "Green or roasted"), rot("roast_in_destination", x.roast_in_destination)]);
  if (x.regional_node_interest === true) paso2.push([preg("q_node", "Regional node"), t.si]);
  if (x.producer_interest === true) paso2.push([preg("q_producer", "Evaluate with CTCx"), t.si]);
  if (lead.about) paso2.push([preg("about", "About you"), lead.about]);
  const top = valoresPrincipales(lead.values_beans ?? {});
  if (top.length) paso2.push([preg("q_values", "What you value"), top.map((k) => rot("values", k)).join(" · ")]);
  if (respuestas.length || paso2.length) {
    titulo(t.respuestas);
    for (const [k, v] of respuestas) fila(k, v);
    if (paso2.length) {
      l.asegurar(30);
      l.page.drawText(seguro(t.perfil), { x: M, y: l.y, size: 10.5, font: negrita, color: AZUL });
      l.y -= 16;
      for (const [k, v] of paso2) fila(k, v);
    }
    l.y -= 6;
  }

  // Qué sigue: lo de siempre más lo que corresponde a lo marcado.
  const sigue = [...t.sigue];
  if (wants.has("sample_pack")) sigue.push(t.sigueSample);
  if (wants.has("lot_list")) sigue.push(t.sigueLista);
  if (wants.has("video_call")) sigue.push(t.sigueVideo);
  if (wants.has("lcl_batch")) sigue.push(t.sigueLcl);
  if (wants.has("other") && otro) sigue.push(t.sigueOtro.replace("{otro}", otro));
  if (refs.length) sigue.push(t.sigueLotes);
  if (lead.master_roaster_interest) sigue.push(t.sigueMr);
  if (kg || periodo) sigue.push(t.sigueVolumen);
  titulo(t.queSigue);
  for (const linea of sigue) vineta(linea);
  l.y -= 6;

  // CTCx.
  titulo(t.quienes);
  for (const linea of t.ctcx) {
    parrafo(linea);
    l.y -= 4;
  }
  l.y -= 6;

  // Plataformas (enlaces clicables).
  const plataformas: [string, string][] = [
    ["ctcexport.com", WWW_ORIGIN],
    ["Cherry Picked", origenDeSuperficie("/cherry-picked")],
    ["Kaffetal Regal", origenDeSuperficie("/kaffetal-regal")],
    ["Find my Lot", `${WWW_ORIGIN}/ctcx-public-catalogue`],
  ];
  titulo(t.plataformas);
  for (const [nombreP, url] of plataformas) {
    l.asegurar(15);
    l.page.drawText(`${nombreP}  ·  ${url}`, { x: M, y: l.y, size: 10, font: fuente, color: TINTA });
    enlace(l.page, doc, { x: M, y: l.y - 3, w: fuente.widthOfTextAtSize(`${nombreP}  ·  ${url}`, 10), h: 12 }, url);
    l.y -= 15;
  }
  l.y -= 8;

  // Redes y contacto.
  titulo(t.redes);
  for (const [nombreR, url] of [
    ["Instagram", INSTAGRAM_URL],
    ["YouTube", YOUTUBE_URL],
  ] as [string, string][]) {
    l.asegurar(15);
    l.page.drawText(`${nombreR}  ·  ${url}`, { x: M, y: l.y, size: 10, font: fuente, color: TINTA });
    enlace(l.page, doc, { x: M, y: l.y - 3, w: fuente.widthOfTextAtSize(`${nombreR}  ·  ${url}`, 10), h: 12 }, url);
    l.y -= 15;
  }
  l.asegurar(32);
  l.page.drawText(`${CTC_EMAIL}  ·  ${CTC_SEDE}  ·  ${NIT}`, { x: M, y: l.y, size: 10, font: fuente, color: TINTA });
  enlace(l.page, doc, { x: M, y: l.y - 3, w: fuente.widthOfTextAtSize(CTC_EMAIL, 10), h: 12 }, `mailto:${CTC_EMAIL}`);
  l.y -= 15;
  const privacy = opts.privacyUrl.startsWith("http") ? opts.privacyUrl : `${WWW_ORIGIN}${opts.privacyUrl}`;
  l.page.drawText(`${t.privacidad}  ·  ${privacy}`, { x: M, y: l.y, size: 9.5, font: fuente, color: GRIS });
  enlace(l.page, doc, { x: M, y: l.y - 3, w: fuente.widthOfTextAtSize(`${t.privacidad}  ·  ${privacy}`, 9.5), h: 12 }, privacy);

  // Pie en cada página (y el número de página si hay más de una).
  const paginas = doc.getPages();
  paginas.forEach((pg, i) => {
    pg.drawLine({ start: { x: M, y: 64 }, end: { x: width - M, y: 64 }, thickness: 0.6, color: rgb(0.85, 0.86, 0.88) });
    let yl = 50;
    for (const linea of partir(seguro(CTC_LEGAL_LINE), fuente, 8, ancho)) {
      pg.drawText(linea, { x: M, y: yl, size: 8, font: fuente, color: GRIS });
      yl -= 10;
    }
    pg.drawText(seguro(t.nota) + `  ·  ${codigo}`, { x: M, y: 30, size: 8, font: fuente, color: GRIS });
    if (paginas.length > 1) {
      const num = `${seguro(t.pagina)} ${i + 1} / ${paginas.length}`;
      pg.drawText(num, { x: width - M - fuente.widthOfTextAtSize(num, 8), y: 30, size: 8, font: fuente, color: GRIS });
    }
  });

  const bytes = await doc.save();
  return { bytes, nombreDeArchivo: `CTCx-SCAJ2026-${codigo.split("-").pop()}.pdf`, lang };
}

/** Parte un texto en líneas por anchura (por palabras; en japonés, por caracteres). */
function partir(texto: string, font: PDFFont, size: number, ancho: number): string[] {
  const porCaracteres = /[぀-ヿ一-鿿]/.test(texto);
  const unidades = porCaracteres ? texto.split("") : texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const u of unidades) {
    const prueba = porCaracteres ? actual + u : actual ? `${actual} ${u}` : u;
    if (font.widthOfTextAtSize(prueba, size) > ancho && actual) {
      lineas.push(actual);
      actual = u;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/** Pinta un párrafo sobre el lienzo, línea a línea, abriendo página si hace falta. Deja `l.y` debajo de la última línea. */
function dibujarParrafo(l: Lienzo, texto: string, o: { x: number; size: number; font: PDFFont; color: ReturnType<typeof rgb>; ancho: number; interlineado: number }): void {
  for (const linea of partir(texto, o.font, o.size, o.ancho)) {
    l.asegurar(o.interlineado);
    l.page.drawText(linea, { x: o.x, y: l.y, size: o.size, font: o.font, color: o.color });
    l.y -= o.interlineado;
  }
}

/** Una anotación de enlace (URI) sobre un rectángulo de la página. */
function enlace(page: PDFPage, doc: PDFDocument, r: { x: number; y: number; w: number; h: number }, url: string) {
  const ctx = doc.context;
  const anot = ctx.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [r.x, r.y, r.x + r.w, r.y + r.h],
    Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: ctx.obj(url) },
  });
  const ref = ctx.register(anot);
  const existentes = page.node.Annots();
  if (existentes) existentes.push(ref);
  else page.node.set(PDFName.of("Annots"), ctx.obj([ref]));
}
