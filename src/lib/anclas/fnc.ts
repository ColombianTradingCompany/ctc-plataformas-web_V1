import "server-only";
import { parseFncPrice } from "./parseFnc";

// ── Anclas de mercado · la lectura del precio FNC ────────────────────────────
// Portado del `fncFetch` de la Calculadora de Mermas V15, con una diferencia que
// importa: allí corría en el navegador y necesitaba proxies CORS prestados
// (allorigins, corsproxy, r.jina.ai) para saltarse el mismo-origen. Aquí corre
// en el SERVIDOR, así que va directo a la Federación — sin intermediarios de
// terceros y sin depender de que sigan vivos.
//
// El parseo vive aparte (./parseFnc) para poder probarse sin Next.

export const FNC_PAGE = "https://federaciondecafeteros.org/estadisticas-cafeteras/";

export type FncReading = { value: number; asOf: string; sourceUrl: string };

export async function fetchFncPrice(signal?: AbortSignal): Promise<FncReading | null> {
  const res = await fetch(FNC_PAGE, {
    signal,
    headers: {
      // Sin un UA de navegador la Federación responde con un muro.
      "user-agent": "Mozilla/5.0 (compatible; CTCExportBot/1.0; +https://ctcexport.com)",
      accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const value = parseFncPrice(await res.text());
  if (value === null) return null;
  return { value, asOf: new Date().toISOString().slice(0, 10), sourceUrl: FNC_PAGE };
}
