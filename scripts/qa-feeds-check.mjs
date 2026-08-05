// ── Guardián de los feeds ────────────────────────────────────────────────────
//   node --experimental-strip-types scripts/qa-feeds-check.mjs
//
// Parsear XML con expresiones regulares es frágil, y por eso esto existe: las
// formas que rompen (CDATA, entidades, <link/> vacío de Atom, atributos en otro
// orden) están todas aquí como XML de verdad, no como teoría.
//
// Puro: no toca red ni base. Si esto pasa, el barrido lee bien lo que le llegue.

import {
  canalIdDesdeHtml, feedDesdeHtml, feedDeCanal, parseFeed, dentroDeVentana,
} from "../src/lib/coffeed/feeds.ts";

let pass = 0;
const fails = [];
const check = (n, cond, detalle = "") => { if (cond) pass++; else fails.push(`${n}${detalle ? ` — ${detalle}` : ""}`); };

// ── Atom, tal y como lo sirve YouTube ───────────────────────────────────────
const ATOM_YT = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
 <title>James Hoffmann</title>
 <entry>
  <id>yt:video:abc123</id>
  <title>The truth about &quot;specialty&quot; grading, Q&amp;A</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=abc123"/>
  <published>2026-08-03T14:00:00+00:00</published>
  <updated>2026-08-04T09:00:00+00:00</updated>
 </entry>
 <entry>
  <id>yt:video:old999</id>
  <title>Un vídeo viejo</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=old999"/>
  <published>2026-05-01T10:00:00+00:00</published>
 </entry>
</feed>`;

const yt = parseFeed(ATOM_YT);
check("Atom: dos entradas", yt.length === 2, `${yt.length}`);
check("Atom: el enlace sale del atributo href, no del texto",
  yt[0].url === "https://www.youtube.com/watch?v=abc123", yt[0].url);
check("Atom: la fecha es `published`, no `updated`",
  yt[0].publishedAt?.startsWith("2026-08-03"), String(yt[0].publishedAt));
check("Atom: las entidades se decodifican",
  yt[0].title === 'The truth about "specialty" grading, Q&A', yt[0].title);
// El orden importa: si &amp; se resolviera ANTES, un &amp;quot; escapado a
// propósito acabaría convertido en comilla y se estaría deshaciendo un
// escapado legítimo del medio.
check("un &amp;quot; escapado a propósito NO se convierte en comilla",
  parseFeed('<rss><item><title>dice &amp;quot;hola&amp;quot;</title><link>https://x.com/a</link></item></rss>')[0].title
    === 'dice &quot;hola&quot;');

// ── RSS 2.0 con CDATA, que es lo normal en los medios ───────────────────────
const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
 <title>Daily Coffee News</title>
 <link>https://dailycoffeenews.com</link>
 <item>
  <title><![CDATA[Brazil's crop & the price of everything]]></title>
  <link>https://dailycoffeenews.com/2026/08/04/brazil-crop</link>
  <pubDate>Tue, 04 Aug 2026 11:30:00 +0000</pubDate>
 </item>
 <item>
  <title>Sin fecha utilizable</title>
  <link>https://dailycoffeenews.com/2026/08/02/otra</link>
  <pubDate>no es una fecha</pubDate>
 </item>
</channel></rss>`;

const rss = parseFeed(RSS);
check("RSS: dos ítems", rss.length === 2, `${rss.length}`);
check("RSS: CDATA resuelto y sin escapar de más",
  rss[0].title === "Brazil's crop & the price of everything", rss[0].title);
check("RSS: el enlace sale del TEXTO de <link>",
  rss[0].url === "https://dailycoffeenews.com/2026/08/04/brazil-crop", rss[0].url);
check("RSS: pubDate RFC822 se entiende",
  rss[0].publishedAt?.startsWith("2026-08-04"), String(rss[0].publishedAt));
check("RSS: una fecha basura queda en null, no revienta", rss[1].publishedAt === null);

// El caso que de verdad importa: el canal del feed NO se confunde con el del ítem.
check("el <link> del canal no se cuela como ítem",
  !rss.some((i) => i.url === "https://dailycoffeenews.com"));

// ── La ventana ──────────────────────────────────────────────────────────────
const desde = new Date("2026-07-30T00:00:00Z");
const hasta = new Date("2026-08-05T23:59:59Z");
check("solo lo de la ventana", dentroDeVentana(yt, desde, hasta).length === 1);
check("una pieza SIN fecha se descarta",
  dentroDeVentana(rss, desde, hasta).length === 1,
  `${dentroDeVentana(rss, desde, hasta).length}`);

// ── Feeds rotos: nunca lanzan ───────────────────────────────────────────────
check("xml vacío → []", parseFeed("").length === 0);
check("html en vez de xml → []", parseFeed("<html><body>ups</body></html>").length === 0);
check("item sin enlace se salta",
  parseFeed("<rss><item><title>Solo título</title></item></rss>").length === 0);

// ── Descubrimiento del canal de YouTube ─────────────────────────────────────
check("channelId del JSON incrustado",
  canalIdDesdeHtml('…"channelId":"UCMb0O2CdPBNi-QqPk5T3gsQ"…') === "UCMb0O2CdPBNi-QqPk5T3gsQ");
check("externalId como alternativa",
  canalIdDesdeHtml('{"externalId":"UCMb0O2CdPBNi-QqPk5T3gsQ"}') === "UCMb0O2CdPBNi-QqPk5T3gsQ");
check("o la url canónica",
  canalIdDesdeHtml('<link rel="canonical" href="https://www.youtube.com/channel/UCMb0O2CdPBNi-QqPk5T3gsQ">')
    === "UCMb0O2CdPBNi-QqPk5T3gsQ");
check("sin id → null", canalIdDesdeHtml("<html>nada</html>") === null);
check("el feed del canal se arma bien",
  feedDeCanal("UCabc") === "https://www.youtube.com/feeds/videos.xml?channel_id=UCabc");

// ── Autodescubrimiento del feed de un medio ─────────────────────────────────
check("link rel=alternate, ruta relativa → absoluta",
  feedDesdeHtml('<link rel="alternate" type="application/rss+xml" href="/feed">', "https://dailycoffeenews.com")
    === "https://dailycoffeenews.com/feed");
check("atributos en otro orden",
  feedDesdeHtml('<link type="application/atom+xml" href="https://x.com/atom.xml" rel="alternate"/>', "https://x.com")
    === "https://x.com/atom.xml");
check("no confunde un stylesheet con un feed",
  feedDesdeHtml('<link rel="stylesheet" href="/a.css"><link rel="alternate" type="application/rss+xml" href="/rss">', "https://x.com")
    === "https://x.com/rss");
check("sin feed → null", feedDesdeHtml("<head><title>x</title></head>", "https://x.com") === null);

console.log(`\nFeeds · ${pass}/${pass + fails.length} comprobaciones`);
if (fails.length) { console.log("\nFALLAN:"); for (const f of fails) console.log("  ·", f); process.exit(1); }
console.log("El parser aguanta CDATA, entidades, Atom, RSS y feeds rotos.\n");
