import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, PDFName, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { CTC_EMAIL, CTC_LEGAL_LINE, CTC_RAZON, CTC_SEDE, NIT } from "@/lib/legal";
import { INSTAGRAM_URL, YOUTUBE_URL } from "@/lib/redesSociales";
import { origenDeSuperficie, WWW_ORIGIN } from "@/lib/red/subdominios";
import type { IdiomaDeFormulario, LeadDeEvento } from "./campos";
import { codigoDeLead } from "./campos";

// ── Interfaz de Leads · la CONFIRMACIÓN en PDF (V6.4, owner 2026-10-11) ───────────────────────────────────────────────────────
// «Una vez enviado el Form, quiero que se le muestre al usuario un mensaje de agradecimiento y un PDF descargable que tenga arriba
// una confirmación de llenado con referencia al SCAJ2026 y la información clave de CTCx con enlaces a las redes.»
// Un documento de UNA página, generado en el servidor con pdf-lib (sin navegador ni servicio externo): arriba la confirmación (la
// feria, el código del registro, la fecha y hora de Japón, nombre, empresa y correo), luego qué sigue, luego CTCx en cuatro líneas,
// las plataformas con su enlace, las redes y la línea legal. Los enlaces son clicables (anotaciones URI).
//
// FUENTES: Helvetica (estándar, sin archivo) cubre español e inglés. El japonés necesita una fuente CJK; si existe
// `public/fonts/NotoSansJP-Regular.otf` (OFL; el owner decide incorporarla), se incrusta en subconjunto y el PDF sale en japonés.
// Sin ella, quien llenó en japonés recibe el PDF en INGLÉS y lo que no se pueda dibujar con Helvetica (un nombre en kanji) se
// sustituye por su correo, nunca por «????».

const AZUL = rgb(0.086, 0.263, 0.42); // --primary #16436B
const DORADO = rgb(0.89, 0.64, 0.17); // --accent #E3A32C
const TINTA = rgb(0.106, 0.141, 0.188);
const GRIS = rgb(0.353, 0.392, 0.447);

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
  queSigue: string;
  sigue: string[];
  quienes: string;
  ctcx: string[];
  plataformas: string;
  redes: string;
  privacidad: string;
  nota: string;
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
    queSigue: "Qué sigue",
    sigue: [
      "Hoy mismo te escribimos a tu correo con lo que marcaste; si no lo ves, revisa la carpeta de spam.",
      "En ese correo van las preguntas opcionales que dejaste para después, prellenadas: puedes completarlas desde el enlace o respondiendo al correo.",
      "Toda la conversación se enruta a este mismo registro con tu código.",
    ],
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
    queSigue: "What's next",
    sigue: [
      "We will write to your email today with what you selected; if you do not see it, please check your spam folder.",
      "That email carries the optional questions you left for later, pre-filled: complete them from the link or simply by replying.",
      "The whole conversation is routed to this same registration through your code.",
    ],
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
    queSigue: "今後について",
    sigue: [
      "本日中に、ご回答に合わせたメールをお送りします。届かない場合は迷惑メールフォルダをご確認ください。",
      "そのメールには、後回しにされた任意の質問が入力済みの状態で含まれます。リンクから、またはメールへの返信でご回答いただけます。",
      "やり取りはすべて、このコードでこの登録に紐づけられます。",
    ],
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
  },
};

const TIPO: Record<IdiomaDeFormulario, Record<string, string>> = {
  es: { roaster: "Tostador", importer: "Importador / trader de verde", cafe_horeca: "Cafetería / HORECA", distributor: "Distribuidor / retail", producer: "Productor / exportador", barista: "Barista / profesional", press: "Prensa / medios", other: "Otro" },
  en: { roaster: "Roaster", importer: "Green importer / trader", cafe_horeca: "Café / HORECA", distributor: "Distributor / retail", producer: "Producer / exporter", barista: "Barista / coffee professional", press: "Press / media", other: "Other" },
  ja: { roaster: "ロースター(焙煎)", importer: "生豆輸入・商社", cafe_horeca: "カフェ・飲食店", distributor: "卸売・小売", producer: "生産者・輸出業者", barista: "バリスタ・コーヒー関係者", press: "報道・メディア", other: "その他" },
};

/** ¿Helvetica puede dibujar este texto? (WinAnsi: latín, acentos, «·», «–»). */
const dibujable = (s: string) => /^[\u0000-ÿ–—‘’“”•…€]*$/.test(s);

export type PdfDeConfirmacion = { bytes: Uint8Array; nombreDeArchivo: string; lang: IdiomaDeFormulario };

export async function pdfDeConfirmacion(lead: LeadDeEvento, opts: { formKey: string; ruta: string; privacyUrl: string }): Promise<PdfDeConfirmacion> {
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
  const codigo = codigoDeLead(opts.formKey, lead.id);
  const fecha = new Date(lead.created_at).toLocaleString(lang === "ja" ? "ja-JP" : lang === "es" ? "es-CO" : "en-GB", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" });

  const page = doc.addPage([595.28, 841.89]); // A4
  const { width } = page.getSize();
  const M = 48;
  let y = 841.89 - M;

  // Cabecera azul con la marca y la feria.
  page.drawRectangle({ x: 0, y: 841.89 - 118, width, height: 118, color: AZUL });
  page.drawText("CTCx", { x: M, y: 841.89 - 52, size: 26, font: negrita, color: rgb(1, 1, 1) });
  page.drawText(CTC_RAZON, { x: M + 78, y: 841.89 - 50, size: 12, font: fuente, color: rgb(1, 1, 1) });
  page.drawText(t.titulo, { x: M, y: 841.89 - 84, size: 18, font: negrita, color: DORADO });
  dibujarParrafo(page, seguro(t.sub), { x: M, y: 841.89 - 104, size: 9.5, font: fuente, color: rgb(0.86, 0.9, 0.95), ancho: width - 2 * M, interlineado: 12 });
  y = 841.89 - 118 - 26;

  // El bloque de confirmación.
  page.drawText(seguro(t.confirmacion), { x: M, y, size: 11.5, font: negrita, color: TINTA });
  y -= 22;
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
  const cajaY = y + 10;
  const altoCaja = filas.length * 18 + 16;
  page.drawRectangle({ x: M, y: cajaY - altoCaja, width: width - 2 * M, height: altoCaja, borderColor: rgb(0.87, 0.88, 0.9), borderWidth: 1, color: rgb(0.97, 0.98, 0.99) });
  let fy = cajaY - 20;
  for (const [k, v] of filas) {
    page.drawText(k, { x: M + 12, y: fy, size: 9.5, font: fuente, color: GRIS });
    page.drawText(v, { x: M + 150, y: fy, size: k === t.codigo ? 12 : 10.5, font: negrita, color: k === t.codigo ? AZUL : TINTA });
    fy -= 18;
  }
  y = cajaY - altoCaja - 24;

  // Qué sigue.
  page.drawText(t.queSigue, { x: M, y, size: 12, font: negrita, color: AZUL });
  y -= 16;
  for (const linea of t.sigue) y = dibujarParrafo(page, "• " + seguro(linea), { x: M, y, size: 10, font: fuente, color: TINTA, ancho: width - 2 * M, interlineado: 13.5 }) - 4;
  y -= 10;

  // CTCx.
  page.drawText(t.quienes, { x: M, y, size: 12, font: negrita, color: AZUL });
  y -= 16;
  for (const linea of t.ctcx) y = dibujarParrafo(page, seguro(linea), { x: M, y, size: 10, font: fuente, color: TINTA, ancho: width - 2 * M, interlineado: 13.5 }) - 4;
  y -= 10;

  // Plataformas (enlaces clicables).
  const plataformas: [string, string][] = [
    ["ctcexport.com", WWW_ORIGIN],
    ["Cherry Picked", origenDeSuperficie("/cherry-picked")],
    ["Kaffetal Regal", origenDeSuperficie("/kaffetal-regal")],
    ["Find my Lot", `${WWW_ORIGIN}/ctcx-public-catalogue`],
  ];
  page.drawText(t.plataformas, { x: M, y, size: 12, font: negrita, color: AZUL });
  y -= 16;
  for (const [nombreP, url] of plataformas) {
    page.drawText(`${nombreP}  ·  ${url}`, { x: M, y, size: 10, font: fuente, color: TINTA });
    enlace(page, doc, { x: M, y: y - 3, w: fuente.widthOfTextAtSize(`${nombreP}  ·  ${url}`, 10), h: 12 }, url);
    y -= 15;
  }
  y -= 8;

  // Redes y contacto.
  page.drawText(t.redes, { x: M, y, size: 12, font: negrita, color: AZUL });
  y -= 16;
  for (const [nombreR, url] of [
    ["Instagram", INSTAGRAM_URL],
    ["YouTube", YOUTUBE_URL],
  ] as [string, string][]) {
    page.drawText(`${nombreR}  ·  ${url}`, { x: M, y, size: 10, font: fuente, color: TINTA });
    enlace(page, doc, { x: M, y: y - 3, w: fuente.widthOfTextAtSize(`${nombreR}  ·  ${url}`, 10), h: 12 }, url);
    y -= 15;
  }
  page.drawText(`${CTC_EMAIL}  ·  ${CTC_SEDE}  ·  ${NIT}`, { x: M, y, size: 10, font: fuente, color: TINTA });
  enlace(page, doc, { x: M, y: y - 3, w: fuente.widthOfTextAtSize(CTC_EMAIL, 10), h: 12 }, `mailto:${CTC_EMAIL}`);
  y -= 15;
  const privacy = opts.privacyUrl.startsWith("http") ? opts.privacyUrl : `${WWW_ORIGIN}${opts.privacyUrl}`;
  page.drawText(`${t.privacidad}  ·  ${privacy}`, { x: M, y, size: 9.5, font: fuente, color: GRIS });
  enlace(page, doc, { x: M, y: y - 3, w: fuente.widthOfTextAtSize(`${t.privacidad}  ·  ${privacy}`, 9.5), h: 12 }, privacy);

  // Pie.
  page.drawLine({ start: { x: M, y: 64 }, end: { x: width - M, y: 64 }, thickness: 0.6, color: rgb(0.85, 0.86, 0.88) });
  dibujarParrafo(page, seguro(CTC_LEGAL_LINE), { x: M, y: 50, size: 8, font: fuente, color: GRIS, ancho: width - 2 * M, interlineado: 10 });
  page.drawText(seguro(t.nota) + `  ·  ${codigo}`, { x: M, y: 32, size: 8, font: fuente, color: GRIS });

  const bytes = await doc.save();
  return { bytes, nombreDeArchivo: `CTCx-SCAJ2026-${codigo.split("-").pop()}.pdf`, lang };
}

/** Pinta un párrafo con salto de línea por anchura (por palabras; en japonés, por caracteres). Devuelve la `y` siguiente. */
function dibujarParrafo(page: PDFPage, texto: string, o: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb>; ancho: number; interlineado: number }): number {
  const porCaracteres = /[぀-ヿ一-鿿]/.test(texto);
  const unidades = porCaracteres ? texto.split("") : texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const u of unidades) {
    const prueba = porCaracteres ? actual + u : actual ? `${actual} ${u}` : u;
    if (o.font.widthOfTextAtSize(prueba, o.size) > o.ancho && actual) {
      lineas.push(actual);
      actual = u;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  let y = o.y;
  for (const l of lineas) {
    page.drawText(l, { x: o.x, y, size: o.size, font: o.font, color: o.color });
    y -= o.interlineado;
  }
  return y;
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
