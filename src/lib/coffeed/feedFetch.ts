import "server-only";

// ── Coffeed · descarga de feeds (helper interno, NO una Server Action) ────────
// Vive aparte de `feedActions.ts` a propósito (auditoría 2026-08-13, SEG-2):
// todo `export` de un módulo `"use server"` es un endpoint POST invocable por
// cualquier cliente, con o sin botón en la UI. `bajarFeed` hacía `fetch` de una
// URL arbitraria y DEVOLVÍA el cuerpo — una primitiva SSRF anónima. Al vivir en
// un módulo `server-only` normal deja de ser una acción: solo lo importa código
// de servidor (el barrido, ya con `studioGate()`, y `feedActions`), y las URLs
// que recibe salen siempre de la lista blanca curada de `coffeed_sources`.

/** Un navegador cualquiera. Sin esto, bastantes medios devuelven 403 a un
 *  cliente sin `user-agent` y el feed parecería no existir. */
export const UA =
  "Mozilla/5.0 (compatible; CoffeedBot/1.0; +https://www.ctcexport.com) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

export async function bajar(url: string, timeoutMs = 15_000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/rss+xml, application/atom+xml, text/xml, text/html;q=0.8" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Lee el feed de un medio y devuelve el XML crudo, o null. La usa el barrido. */
export function bajarFeed(feedUrl: string): Promise<string | null> {
  return bajar(feedUrl, 20_000);
}
