// ── Coffeed · feeds ──────────────────────────────────────────────────────────
// Descubrir y leer el RSS/Atom de un medio, para que el barrido NO tenga que
// preguntarle a un modelo qué se publicó esta semana.
//
// POR QUÉ (2026-08-05): el barrido con búsqueda web tardaba minutos, expiraba en
// 6 de 14 medios y no sacaba NADA de los canales de YouTube — 0 de 5. Es que la
// herramienta no encaja: la búsqueda web no es un índice de «todo lo que sacó
// este medio esta semana», y desde luego no ve un canal de vídeo. Un feed sí:
// da títulos, enlaces y FECHA EXACTA, al instante, gratis y sin clave.
//
// Este módulo es PURO a propósito —no toca la red ni la base— para poder
// probarlo con XML de verdad en `scripts/qa-feeds-check.mjs`. Quien busca y
// descarga es `feedActions.ts`. Misma decisión que con `parseFnc.ts`.

export type FeedItem = {
  title: string;
  url: string;
  /** ISO. null si el feed no trae fecha utilizable — esa pieza se descarta. */
  publishedAt: string | null;
};

/** El feed de un canal de YouTube. Público y sin clave: es la vía que hace que
 *  un canal deje de ser invisible para el barrido. */
export function feedDeCanal(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

// ── Descubrimiento ──────────────────────────────────────────────────────────

/** Saca el `UC…` del HTML de una página de canal de YouTube. Una URL con
 *  `@handle` no sirve para el feed; el id canónico sí, y está en el propio HTML
 *  en varias formas. Se prueban todas porque YouTube cambia el marcado. */
export function canalIdDesdeHtml(html: string): string | null {
  const patrones = [
    /"channelId"\s*:\s*"(UC[\w-]{20,})"/,
    /"externalId"\s*:\s*"(UC[\w-]{20,})"/,
    /channel\/(UC[\w-]{20,})/,
  ];
  for (const p of patrones) {
    const m = p.exec(html);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** Autodescubrimiento estándar: el `<link rel="alternate" type=".../rss+xml">`
 *  que casi todos los medios llevan en el `<head>`. Devuelve la url absoluta. */
export function feedDesdeHtml(html: string, baseUrl: string): string | null {
  // Los atributos vienen en cualquier orden, así que se aísla cada <link> y se
  // mira dentro en vez de intentar un solo patrón que lo abarque todo.
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of links) {
    if (!/rel\s*=\s*["']?alternate/i.test(tag)) continue;
    if (!/type\s*=\s*["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    try {
      return new URL(decodeEntidades(href), baseUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

// ── Lectura ─────────────────────────────────────────────────────────────────

function decodeEntidades(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    // El &amp; va al FINAL: si se hiciera primero, un &amp;lt; acabaría
    // convertido en «<» y se estaría deshaciendo un escapado legítimo.
    .replace(/&amp;/g, "&");
}

/** Texto de una etiqueta, con CDATA resuelto. */
function tag(xml: string, nombre: string): string | null {
  const m = new RegExp(`<${nombre}\\b[^>]*>([\\s\\S]*?)</${nombre}>`, "i").exec(xml);
  if (!m) return null;
  const bruto = m[1].trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(bruto);
  return decodeEntidades((cdata ? cdata[1] : bruto).trim());
}

/** El enlace de una entrada. RSS lo pone como texto (`<link>url</link>`); Atom
 *  como atributo de una etiqueta vacía (`<link rel="alternate" href="url"/>`). */
function enlace(xml: string): string | null {
  const texto = tag(xml, "link");
  if (texto && /^https?:\/\//i.test(texto)) return texto;
  const tags = xml.match(/<link\b[^>]*\/?>/gi) ?? [];
  // Se prefiere el alternate; si no lo hay, el primero con href sirve.
  const alterno = tags.find((t) => /rel\s*=\s*["']?alternate/i.test(t)) ?? tags[0];
  const href = alterno ? /href\s*=\s*["']([^"']+)["']/i.exec(alterno)?.[1] : null;
  return href ? decodeEntidades(href) : null;
}

function fecha(xml: string): string | null {
  // Atom usa published/updated; RSS, pubDate (RFC 822). `Date` entiende ambos.
  for (const n of ["published", "pubDate", "updated", "dc:date"]) {
    const v = tag(xml, n);
    if (!v) continue;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/** Parsea un feed RSS 2.0 o Atom. Devuelve [] si no reconoce nada — nunca
 *  lanza: un medio con el feed roto no puede tumbar el barrido. */
export function parseFeed(xml: string): FeedItem[] {
  const bloques = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  const out: FeedItem[] = [];
  for (const b of bloques) {
    const title = tag(b, "title");
    const url = enlace(b);
    if (!title || !url) continue;
    out.push({ title, url, publishedAt: fecha(b) });
  }
  return out;
}

/** Lo publicado dentro de la ventana. SIN fecha se descarta: la regla de Coffeed
 *  es que una pieza sin fecha confirmada no entra, y aquí se puede cumplir de
 *  verdad porque la fecha la da el feed, no una suposición del modelo. */
export function dentroDeVentana(items: FeedItem[], desde: Date, hasta: Date): FeedItem[] {
  const d = desde.getTime();
  const h = hasta.getTime();
  return items.filter((i) => {
    if (!i.publishedAt) return false;
    const t = new Date(i.publishedAt).getTime();
    return t >= d && t <= h;
  });
}
