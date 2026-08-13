import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { parseFeed } from "@/lib/coffeed/feeds";

// ── La cinta de mercado de ctcexport.com ─────────────────────────────────────
// Lo que corre bajo el hero: las referencias que cualquiera del oficio mira por
// la mañana y los titulares del día. Todo público, nada propio de CTC.
//
// TRES PROCEDENCIAS, y ninguna se cae con las otras:
//   · Bolsas y divisas → el endpoint de gráficos de Yahoo Finance. Sin clave,
//     sin cuenta. Es NO oficial: si un día deja de responder, esa referencia
//     simplemente no sale y la cinta sigue andando con las demás.
//   · Precio interno de la FNC → `market_anchors`, que YA se llena sola con el
//     cron diario del OCP (api/cron/market-anchors). No se vuelve a pedir a la
//     Federación desde aquí: la lectura del día ya está en casa.
//   · Titulares → los medios aprobados de Coffeed que tienen feed resuelto. Se
//     reusa el `parseFeed` del barrido; el owner los administra en el ECP y la
//     cinta se entera sola.
//
// El coste se paga UNA vez cada cuarto de hora, no una vez por visita: las
// llamadas de red van por la caché de datos de Next (`next.revalidate`).

const UA = "Mozilla/5.0 (compatible; CTCExportBot/1.0; +https://ctcexport.com)";

/** Un cuarto de hora para precios; media hora para titulares, que cambian menos. */
const TTL_QUOTES = 900;
const TTL_NEWS = 1800;

export type QuoteId = "nyc" | "robusta" | "fnc" | "inventarios" | "usdcop" | "eurusd" | "usdbrl";

export type TickerQuote = {
  id: QuoteId;
  /** El valor crudo. Lo formatea el cliente, que es quien sabe en qué lengua. */
  value: number;
  unit: string;
  decimals: number;
  /** Variación contra el cierre anterior, en %. null si no se pudo calcular. */
  changePct: number | null;
  /** Día de la lectura (ISO corto) cuando la fuente lo da. */
  asOf: string | null;
  href: string | null;
};

export type TickerNews = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
};

export type TickerPayload = {
  quotes: TickerQuote[];
  news: TickerNews[];
  generatedAt: string;
};

// ── Bolsas y divisas ────────────────────────────────────────────────────────

type YahooReading = { price: number; prev: number | null };

async function yahoo(symbol: string): Promise<YahooReading | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      // Timeout explícito (auditoría 2026-08-13, EST-3): el módulo degrada por
      // fuente (nunca lanza), pero un socket colgado estancaría el Promise.all
      // hasta el maxDuration=20 de la ruta y convertiría la degradación elegante
      // en un 504. 8 s corta el hueco.
      { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(8000), next: { revalidate: TTL_QUOTES } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart?: { result?: { meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number } }[] };
    };
    const meta = json?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(price)) return null;
    const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);
    return { price, prev: Number.isFinite(prev) ? prev : null };
  } catch {
    // Una referencia que no responde no es un error de la página: es una
    // referencia que hoy no sale.
    return null;
  }
}

const pct = (r: YahooReading): number | null =>
  r.prev && r.prev !== 0 ? ((r.price - r.prev) / r.prev) * 100 : null;

/** Los símbolos, con la unidad en que cotiza cada uno y a dónde lleva el clic.
 *
 *  NO está el robusta de Londres, y no por olvido: Yahoo no lo publica (probados
 *  RC=F, RM=F, LRC=F y su propio buscador — todos vacíos, 2026-08-11), y tampoco
 *  los inventarios certificados de ICE. Los dos entran por `market_anchors`, la
 *  misma puerta por la que ya entra el precio de la Federación: en cuanto haya
 *  una lectura anotada, salen solos en la cinta. Ver `anchorQuotes()`. */
const SYMBOLS: { id: QuoteId; symbol: string; unit: string; decimals: number; href: string }[] = [
  // El contrato "C" de arábica en Nueva York cotiza en centavos de dólar por libra.
  { id: "nyc", symbol: "KC=F", unit: "¢/lb", decimals: 2, href: "https://finance.yahoo.com/quote/KC%3DF" },
  { id: "usdcop", symbol: "COP=X", unit: "COP", decimals: 0, href: "https://finance.yahoo.com/quote/COP%3DX" },
  { id: "eurusd", symbol: "EURUSD=X", unit: "USD", decimals: 4, href: "https://finance.yahoo.com/quote/EURUSD%3DX" },
  { id: "usdbrl", symbol: "BRL=X", unit: "BRL", decimals: 2, href: "https://finance.yahoo.com/quote/BRL%3DX" },
];

async function marketQuotes(): Promise<TickerQuote[]> {
  const readings = await Promise.all(SYMBOLS.map((s) => yahoo(s.symbol)));
  const out: TickerQuote[] = [];
  SYMBOLS.forEach((s, i) => {
    const r = readings[i];
    if (!r) return;
    out.push({
      id: s.id,
      value: r.price,
      unit: s.unit,
      decimals: s.decimals,
      changePct: pct(r),
      asOf: null,
      href: s.href,
    });
  });
  return out;
}

// ── Las anclas de mercado ───────────────────────────────────────────────────
// Lo que ya vive en casa. Hoy solo hay lecturas de `fnc_carga` (las trae el cron
// diario); los otros dos quedan declarados y aparecen SOLOS en la cinta el día
// que tengan una lectura anotada. Una ancla sin datos no dibuja nada.

const ANCHOR_ON_TICKER: { kind: string; id: QuoteId; unit: string; decimals: number; href: string }[] = [
  {
    kind: "fnc_carga",
    id: "fnc",
    unit: "COP/carga",
    decimals: 0,
    href: "https://federaciondecafeteros.org/estadisticas-cafeteras/",
  },
  { kind: "robusta_londres", id: "robusta", unit: "USD/t", decimals: 0, href: "https://www.ice.com/products/37089079/Robusta-Coffee-Futures" },
  { kind: "ice_certificados", id: "inventarios", unit: "sacos", decimals: 0, href: "https://www.ice.com/marketdata/reports/176" },
];

async function anchorQuotes(): Promise<TickerQuote[]> {
  try {
    const service = createServiceRoleClient();
    const readings = await Promise.all(
      ANCHOR_ON_TICKER.map(async (a) => {
        // Dos lecturas: la última y la anterior, para poder decir si subió o bajó.
        const { data } = await service
          .from("market_anchors")
          .select("value, as_of, source_url")
          .eq("kind", a.kind)
          .order("as_of", { ascending: false })
          .limit(2);
        const rows = (data ?? []) as { value: number | string; as_of: string; source_url: string | null }[];
        if (!rows.length) return null;
        const value = Number(rows[0].value);
        if (!Number.isFinite(value)) return null;
        const prev = rows[1] ? Number(rows[1].value) : NaN;
        const quote: TickerQuote = {
          id: a.id,
          value,
          unit: a.unit,
          decimals: a.decimals,
          changePct: Number.isFinite(prev) && prev !== 0 ? ((value - prev) / prev) * 100 : null,
          asOf: rows[0].as_of,
          href: rows[0].source_url ?? a.href,
        };
        return quote;
      })
    );
    return readings.filter((r): r is TickerQuote => r !== null);
  } catch {
    return [];
  }
}

// ── Los titulares ───────────────────────────────────────────────────────────

async function coffeeNews(limit: number): Promise<TickerNews[]> {
  try {
    const service = createServiceRoleClient();
    const { data } = await service
      .from("coffeed_sources")
      .select("name, feed_url")
      .eq("list", "white")
      .eq("status", "approved")
      .eq("active", true)
      .eq("kind", "outlet")
      .not("feed_url", "is", null)
      .limit(8);
    const sources = (data ?? []) as { name: string; feed_url: string }[];
    if (!sources.length) return [];

    const perSource = await Promise.all(
      sources.map(async (s) => {
        try {
          const res = await fetch(s.feed_url, {
            headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml" },
            // Timeout explícito (auditoría 2026-08-13, EST-3): mismo motivo que el
            // fetch de Yahoo — un feed colgado no debe estancar la cinta entera.
            signal: AbortSignal.timeout(8000),
            next: { revalidate: TTL_NEWS },
          });
          if (!res.ok) return [];
          // Tres por medio como mucho: sin este tope, un medio que publica diez
          // veces al día se queda con la cinta entera.
          return parseFeed(await res.text())
            .slice(0, 3)
            .map((i) => ({
              id: `${s.name}:${i.url}`,
              title: i.title,
              url: i.url,
              source: s.name,
              publishedAt: i.publishedAt,
            }));
        } catch {
          return [];
        }
      })
    );

    return perSource
      .flat()
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .slice(0, limit);
  } catch {
    return [];
  }
}

// ── El ensamblado ───────────────────────────────────────────────────────────

export async function getTickerPayload(): Promise<TickerPayload> {
  const [mercado, anclas, news] = await Promise.all([marketQuotes(), anchorQuotes(), coffeeNews(6)]);
  // Orden de lectura: primero las bolsas, después lo que se mide en casa (precio
  // interno, robusta, inventarios) y al final las divisas. Las anclas no son una
  // divisa más: son la referencia con la que se negocia.
  const bolsas = mercado.filter((q) => q.id === "nyc");
  const divisas = mercado.filter((q) => q.id !== "nyc");
  return {
    quotes: [...bolsas, ...anclas, ...divisas],
    news,
    generatedAt: new Date().toISOString(),
  };
}
