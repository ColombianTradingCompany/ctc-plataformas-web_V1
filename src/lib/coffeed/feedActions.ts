"use server";

// ── Coffeed · descubrir el feed de cada medio ────────────────────────────────
// Se hace UNA vez por medio y queda guardado en `coffeed_sources.feed_url` (y
// `channel_id` para YouTube). Las columnas existían desde el principio y nadie
// las llenaba: 0 de 14.
//
// A partir de ahí el barrido lee el feed en vez de preguntarle a un modelo qué
// se publicó esta semana — instantáneo, con fecha exacta y sin clave.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { studioGate } from "./studioGate";
import { canalIdDesdeHtml, feedDeCanal, feedDesdeHtml, parseFeed } from "./feeds";
import type { CoffeedResult } from "./types";

const NO_AUTH: CoffeedResult = { ok: false, error: "Tu sesión del Estudio no está activa. Vuelve a entrar." };

/** Un navegador cualquiera. Sin esto, bastantes medios devuelven 403 a un
 *  cliente sin `user-agent` y el feed parecería no existir. */
const UA =
  "Mozilla/5.0 (compatible; CoffeedBot/1.0; +https://www.ctcexport.com) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function bajar(url: string, timeoutMs = 15_000): Promise<string | null> {
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

/** Rutas que prueban casi todos los gestores de contenido, por si la página no
 *  declara su feed en el `<head>`. Se prueban DESPUÉS del autodescubrimiento,
 *  que es el que da la respuesta correcta cuando existe. */
const RUTAS = ["/feed", "/feed/", "/rss", "/rss.xml", "/index.xml", "/atom.xml", "/feed.xml"];

/** Devuelve la url del feed de un medio, o null. Comprueba SIEMPRE que lo que
 *  encuentra se parsea y trae al menos una entrada: una ruta que devuelve una
 *  página de error con 200 es más común de lo que parece. */
async function descubrirFeedOutlet(url: string): Promise<string | null> {
  const html = await bajar(url);
  if (html) {
    const declarado = feedDesdeHtml(html, url);
    if (declarado) {
      const xml = await bajar(declarado);
      if (xml && parseFeed(xml).length) return declarado;
    }
  }
  for (const ruta of RUTAS) {
    let candidata: string;
    try {
      candidata = new URL(ruta, url).toString();
    } catch {
      continue;
    }
    const xml = await bajar(candidata);
    if (xml && parseFeed(xml).length) return candidata;
  }
  return null;
}

async function descubrirCanalYoutube(url: string): Promise<{ channelId: string; feedUrl: string } | null> {
  // Si la URL ya trae el id canónico, no hace falta descargar nada.
  const yaEsta = canalIdDesdeHtml(url);
  if (yaEsta) return { channelId: yaEsta, feedUrl: feedDeCanal(yaEsta) };

  const html = await bajar(url);
  if (!html) return null;
  const channelId = canalIdDesdeHtml(html);
  if (!channelId) return null;
  const feedUrl = feedDeCanal(channelId);
  // Se comprueba que el feed responde: un id sacado del HTML puede ser el de un
  // vídeo incrustado o el de un canal recomendado, no el del canal que se mira.
  const xml = await bajar(feedUrl);
  if (!xml || !parseFeed(xml).length) return null;
  return { channelId, feedUrl };
}

/** Cuántos medios se investigan por llamada. Descubrir un feed puede costar
 *  hasta ocho descargas (la portada más las rutas habituales), así que esto
 *  también va por tandas — la misma lección que el barrido, aprendida a base de
 *  dos 504 seguidos. */
const RESOLVER_CHUNK = 4;

export type ResolverFeedsOut =
  | { ok: true; resueltos: number; sinFeed: { id: string; name: string }[]; pendientes: number }
  | { ok: false; error: string };

/**
 * Busca el feed de los medios que aún no lo tienen. Es idempotente y se puede
 * repetir: un medio sin feed hoy puede tenerlo mañana, y uno ya resuelto no se
 * vuelve a tocar.
 */
export async function resolverFeeds(
  /** Ids que ya se investigaron sin éxito en esta misma vuelta. Sin esto el
   *  bucle no termina: un medio sin feed deja `feed_url` en null, vuelve a
   *  salir en la siguiente llamada y `pendientes` no bajaría nunca. */
  saltar: string[] = []
): Promise<ResolverFeedsOut> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH.ok ? "" : NO_AUTH.error };
  const service = createServiceRoleClient();

  const { data: rows } = await service
    .from("coffeed_sources")
    .select("id, name, kind, url, feed_url")
    .eq("list", "white")
    .eq("status", "approved")
    .eq("active", true)
    .is("feed_url", null);

  const todosPendientes = ((rows ?? []) as { id: string; name: string; kind: string; url: string | null }[])
    .filter((s) => !saltar.includes(s.id));
  if (!todosPendientes.length) return { ok: true, resueltos: 0, sinFeed: [], pendientes: 0 };
  const pendientes = todosPendientes.slice(0, RESOLVER_CHUNK);

  let resueltos = 0;
  const sinFeed: { id: string; name: string }[] = [];

  for (const s of pendientes) {
    if (!s.url) {
      sinFeed.push({ id: s.id, name: s.name });
      continue;
    }
    try {
      if (s.kind === "youtube") {
        const hallado = await descubrirCanalYoutube(s.url);
        if (!hallado) {
          sinFeed.push({ id: s.id, name: s.name });
          continue;
        }
        await service
          .from("coffeed_sources")
          .update({ channel_id: hallado.channelId, feed_url: hallado.feedUrl })
          .eq("id", s.id);
      } else {
        const feedUrl = await descubrirFeedOutlet(s.url);
        if (!feedUrl) {
          sinFeed.push({ id: s.id, name: s.name });
          continue;
        }
        await service.from("coffeed_sources").update({ feed_url: feedUrl }).eq("id", s.id);
      }
      resueltos++;
    } catch {
      // Un medio que se resiste no tumba la resolución de los demás.
      sinFeed.push({ id: s.id, name: s.name });
    }
  }

  // Los que no tienen feed quedan con `feed_url` en null, así que volverían a
  // salir en la próxima llamada. Se descuentan aquí para que el bucle termine:
  // quien llama repite mientras `pendientes` sea mayor que cero.
  return { ok: true, resueltos, sinFeed, pendientes: todosPendientes.length - pendientes.length };
}

/** Lee el feed de un medio y devuelve el XML crudo, o null. La usa el barrido. */
export async function bajarFeed(feedUrl: string): Promise<string | null> {
  return bajar(feedUrl, 20_000);
}
