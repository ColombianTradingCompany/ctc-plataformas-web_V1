"use server";

// ── Coffeed · REDACCIÓN (V5.9, owner · revisión V5.0 A12) ────────────────────
// El módulo del ECP entre Entregas y Muro. Tres verbos:
//
//   refrescarNoticias  los feeds de la lista blanca → la bandeja (con el
//                      filtro de café de los generalistas). Es la ingesta
//                      automática que el spec dejó pendiente («falta el
//                      barrido automático») — mismos medios que alimentan el
//                      ticker de la portada, más los colombianos del owner.
//   generarPost        una noticia elegida → una ENTREGA completa: capítulo
//                      elaborado (Claude) + portada (Gemini) → cola de
//                      Entregas en estado «entregado». Producir es del taller
//                      —aunque el taller sea automático—; la luz verde y el
//                      publicar siguen siendo de la consola, como siempre.
//   descartarNoticia   fuera de la bandeja, sin borrar (queda el rastro).
//
// LA QUEJA QUE MANDA AQUÍ («too simple and almost not understandable»): los
// paneles del generador NO son telegramas. Cada panel son 2-4 frases COMPLETAS
// que se entienden solas; el prompt lo exige y el fallback determinista
// también lo respeta. Sin ANTHROPIC_API_KEY el módulo sigue operable (post
// determinista desde el sumario); sin GEMINI la entrega sale sin portada y lo
// dice — nada se rompe en silencio (la lección del OTP).

import { createServiceRoleClient } from "@/lib/supabase/server";
import { after } from "next/server";
import { emitEvent } from "@/lib/integraciones/emit";
import { coffeedGate } from "./requireEcp";
import { claude, parseJson, MODEL_CHEAP } from "./claude";
import { USOS } from "@/lib/ai/consumo";
import { geminiImagen, geminiImagenDisponible } from "./geminiImage";
import { parseFeed, pasaFiltroCafe } from "./feeds";
import { bajar } from "./feedFetch";

const NO_AUTH = "Tu sesión del ECP no está activa. Vuelve a entrar." as const;

// ── EL COSTE, dicho aquí para que la próxima decisión sea informada ─────────
// (tarifas de src/lib/ai/precios.ts, medidas con un post real de ~700 tokens de
// entrada y ~900 de salida)
//
//   ingesta de feeds (refrescarNoticias)   $0        — no toca ningún modelo
//   capítulo con Haiku  (MODEL_CHEAP)      ~$0.005
//   capítulo con Sonnet (MODEL_WRITE)      ~$0.010 hoy, ~$0.016 tras el 31/08
//   portada de Gemini                      el renglón MÁS caro del proceso
//
// SE ESCRIBE CON HAIKU a propósito (owner, 2026-08-20: «use smaller models and
// avoid work that can be done programmatically»). Un capítulo de 7 paneles a
// partir de un titular y un sumario no es una tarea de razonamiento: es
// redacción corta con una estructura dada. Si algún día la voz se queda corta,
// subir a MODEL_WRITE es cambiar esta constante — y cuesta el doble.
const MODELO_REDACTOR = MODEL_CHEAP;

/** Ventana de ingesta. Más de dos semanas ya no es noticia, es archivo. */
const VENTANA_DIAS = 14;
/** Medios por llamada — la lección de los 504 del barrido del Estudio. */
const CHUNK = 6;
const CLAVE_REFRESCO = "coffeed_redaccion";

export type Noticia = {
  id: string;
  outlet: string;
  categoria: string | null;
  titulo: string;
  url: string;
  resumen: string | null;
  kind: "articulo" | "video";
  publishedAt: string;
  estado: "nueva" | "elegida" | "descartada";
  deliverableId: string | null;
};

export type Redaccion = {
  noticias: Noticia[];
  refrescadoAt: string | null;
  /** true = hace >6 h del último refresco: la vista ofrece refrescar ya. */
  rancio: boolean;
};

type Service = ReturnType<typeof createServiceRoleClient>;

async function marcarRefresco(service: Service) {
  await service
    .from("platform_settings")
    .upsert({ key: CLAVE_REFRESCO, value: { refrescado_at: new Date().toISOString() } }, { onConflict: "key" });
}

export async function cargarRedaccion(): Promise<{ ok: true; data: Redaccion } | { ok: false; error: string }> {
  const who = await coffeedGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const service = createServiceRoleClient();

  const [{ data: filas }, { data: ajuste }] = await Promise.all([
    service
      .from("coffeed_noticias")
      .select("id, titulo, url, resumen, kind, published_at, estado, deliverable_id, coffeed_sources(name, category)")
      .neq("estado", "descartada")
      .order("published_at", { ascending: false })
      .limit(60),
    service.from("platform_settings").select("value").eq("key", CLAVE_REFRESCO).maybeSingle(),
  ]);

  const refrescadoAt =
    ajuste?.value && typeof (ajuste.value as { refrescado_at?: unknown }).refrescado_at === "string"
      ? ((ajuste.value as { refrescado_at: string }).refrescado_at)
      : null;

  return {
    ok: true,
    data: {
      noticias: (
        (filas ?? []) as unknown as {
          id: string; titulo: string; url: string; resumen: string | null; kind: "articulo" | "video";
          published_at: string; estado: Noticia["estado"]; deliverable_id: string | null;
          coffeed_sources: { name: string; category: string | null } | null;
        }[]
      ).map((f) => ({
        id: f.id,
        outlet: f.coffeed_sources?.name ?? "—",
        categoria: f.coffeed_sources?.category ?? null,
        titulo: f.titulo,
        url: f.url,
        resumen: f.resumen,
        kind: f.kind,
        publishedAt: f.published_at,
        estado: f.estado,
        deliverableId: f.deliverable_id,
      })),
      refrescadoAt,
      rancio: !refrescadoAt || Date.now() - new Date(refrescadoAt).getTime() > 6 * 3600 * 1000,
    },
  };
}

export type RefrescoOut =
  | { ok: true; nuevas: number; revisados: number; pendientes: number; fallidos: { id: string; name: string }[] }
  | { ok: false; error: string };

/**
 * Lee los feeds de la lista blanca y deposita lo nuevo en la bandeja. POR
 * TANDAS: cada llamada revisa hasta CHUNK medios (los menos recientemente
 * barridos primero) y devuelve cuántos quedan; la vista repite hasta 0.
 * El dedupe es la restricción única de `url` — refrescar nunca duplica.
 */
export async function refrescarNoticias(saltar: string[] = []): Promise<RefrescoOut> {
  const who = await coffeedGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const service = createServiceRoleClient();

  const { data: rows } = await service
    .from("coffeed_sources")
    .select("id, name, kind, feed_url, keywords, last_swept_at")
    .eq("list", "white")
    .eq("status", "approved")
    .eq("active", true)
    .not("feed_url", "is", null);

  const todos = ((rows ?? []) as {
    id: string; name: string; kind: "outlet" | "youtube"; feed_url: string; keywords: string[] | null; last_swept_at: string | null;
  }[]).filter((s) => !saltar.includes(s.id));

  // Los menos vistos primero: así una tanda corta no deja siempre fuera a los
  // mismos. (last_swept_at lo comparte el barrido del Estudio a propósito —
  // significa «este medio ya se miró hace poco», venga de donde venga.)
  todos.sort((a, b) => (a.last_swept_at ?? "").localeCompare(b.last_swept_at ?? ""));
  const tanda = todos.slice(0, CHUNK);
  if (!tanda.length) {
    await marcarRefresco(service);
    return { ok: true, nuevas: 0, revisados: 0, pendientes: 0, fallidos: [] };
  }

  const desde = Date.now() - VENTANA_DIAS * 24 * 3600 * 1000;
  let nuevas = 0;
  const fallidos: { id: string; name: string }[] = [];

  for (const s of tanda) {
    try {
      const xml = await bajar(s.feed_url);
      if (!xml) {
        fallidos.push({ id: s.id, name: s.name });
        continue;
      }
      const piezas = parseFeed(xml)
        .filter((p) => p.publishedAt && new Date(p.publishedAt).getTime() >= desde)
        .filter((p) => pasaFiltroCafe(p.title, s.keywords))
        .slice(0, 12);

      if (piezas.length) {
        // upsert-ignore contra la unique de `url`: lo repetido no choca ni
        // duplica, y el count de lo DEVUELTO es exactamente lo nuevo.
        const { data: insertadas } = await service
          .from("coffeed_noticias")
          .upsert(
            piezas.map((p) => ({
              source_id: s.id,
              titulo: p.title.slice(0, 300),
              url: p.url,
              kind: s.kind === "youtube" ? "video" : "articulo",
              published_at: p.publishedAt as string,
            })),
            { onConflict: "url", ignoreDuplicates: true }
          )
          .select("id");
        nuevas += insertadas?.length ?? 0;
      }
      await service.from("coffeed_sources").update({ last_swept_at: new Date().toISOString() }).eq("id", s.id);
    } catch {
      fallidos.push({ id: s.id, name: s.name });
    }
  }

  await marcarRefresco(service);
  return { ok: true, nuevas, revisados: tanda.length, pendientes: todos.length - tanda.length, fallidos };
}

export async function descartarNoticia(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const who = await coffeedGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const service = createServiceRoleClient();
  const { error } = await service.from("coffeed_noticias").update({ estado: "descartada" }).eq("id", id).eq("estado", "nueva");
  if (error) return { ok: false, error: "No se pudo descartar." };
  return { ok: true };
}

// ── El generador ────────────────────────────────────────────────────────────

type PanelGenerado = { role: string; text: string };

/** Los papeles del capítulo, en orden. El prompt los pide y el fallback los
 *  construye: la estructura es de la casa, no del modelo. */
const PAPELES = ["apertura", "contexto", "desarrollo", "desarrollo", "implicación", "mirada CTC", "cierre"] as const;

function fallbackPaneles(n: { titulo: string; resumen: string | null; outlet: string }): PanelGenerado[] {
  // Sin IA el post sale sobrio pero completo y COMPRENSIBLE: cada panel es una
  // frase entera sobre la pieza, no un telegrama. El owner lo edita después.
  const base = n.resumen?.trim() || n.titulo;
  return [
    { role: "apertura", text: `${n.outlet} publica: ${n.titulo}.` },
    { role: "contexto", text: `La pieza aborda un tema que toca directamente a la cadena del café. ${base}` },
    { role: "desarrollo", text: "Los datos concretos están en la fuente enlazada; este borrador se generó sin el redactor de IA y espera edición humana." },
    { role: "implicación", text: "Antes de publicar, completa qué significa esto para el caficultor o el comprador de la red." },
    { role: "cierre", text: "Fuente citada al pie. Edita este borrador desde la cola de Entregas antes de darle luz verde." },
  ];
}

export type GenerarOut = { ok: true; deliverableId: string; conPortada: boolean; aviso: string | null } | { ok: false; error: string };

export type GenerarOpts = {
  /** La portada de Gemini es el renglón más caro. Se pide explícitamente. */
  conPortada?: boolean;
  /** Rehacer una noticia ya generada. Solo si su entrega SIGUE en la cola sin
   *  luz verde — lo aceptado o publicado no se reescribe por detrás. */
  rehacer?: boolean;
};

/**
 * De una noticia de la bandeja a una ENTREGA completa en la cola. El capítulo
 * lo escribe Claude (elaborado, cada panel autosuficiente); la portada, Gemini
 * (sin texto encima — el texto rasterizado sale mal y la maqueta ya lo pone).
 * La entrega nace «entregado»: la luz verde y el publicar no se saltan.
 */
export async function generarPost(noticiaId: string, opts: GenerarOpts = {}): Promise<GenerarOut> {
  const { conPortada = true, rehacer = false } = opts;
  const who = await coffeedGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const service = createServiceRoleClient();

  const { data: n } = await service
    .from("coffeed_noticias")
    .select("id, titulo, url, resumen, kind, published_at, estado, deliverable_id, coffeed_sources(name)")
    .eq("id", noticiaId)
    .maybeSingle();
  if (!n) return { ok: false, error: "Esa noticia ya no está en la bandeja." };
  const noticia = n as unknown as {
    id: string; titulo: string; url: string; resumen: string | null; kind: string; published_at: string;
    estado: string; coffeed_sources: { name: string } | null;
  };
  // Rehacer: se borra la entrega anterior SOLO si sigue esperando luz verde.
  // Una entrega aceptada o publicada ya es contenido de la casa; reescribirla
  // por detrás dejaría el muro diciendo algo que nadie aprobó.
  if (noticia.estado === "elegida") {
    if (!rehacer) return { ok: false, error: "Esta noticia ya tiene su post en la cola de Entregas." };
    const { data: previa } = await service
      .from("coffeed_deliverables")
      .select("id, state")
      .eq("id", (noticia as unknown as { deliverable_id: string | null }).deliverable_id ?? "")
      .maybeSingle();
    const estadoPrevio = (previa as { state?: string } | null)?.state;
    if (estadoPrevio && estadoPrevio !== "entregado" && estadoPrevio !== "devuelto")
      return { ok: false, error: "Esa entrega ya tiene luz verde o está publicada: no se puede rehacer por detrás." };
    if (previa) await service.from("coffeed_deliverables").delete().eq("id", (previa as { id: string }).id);
  }
  const outlet = noticia.coffeed_sources?.name ?? "la fuente";

  // 1. El capítulo. Claude si hay clave; fallback determinista si no.
  let titulo = noticia.titulo.slice(0, 120);
  let hook: string | null = null;
  let paneles: PanelGenerado[] = [];
  let aviso: string | null = null;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const texto = await claude({
        model: MODELO_REDACTOR,
        superficie: USOS.coffeedRedaccion,
        system: [
          "Eres el redactor de Coffeed, el muro de noticias de la red cafetera CTC (Colombia).",
          "Voz: sobria, técnica, de gremio. Cero adjetivos de marketing. Español de Colombia.",
          "REGLA CENTRAL: cada panel debe entenderse SOLO, leído por alguien que no vio la noticia.",
          "2 a 4 frases COMPLETAS por panel. Un número sin explicar no informa: si citas una cifra, di qué significa.",
          "No inventes datos: lo que no esté en el titular o el sumario, no lo afirmes como hecho.",
        ].join("\n"),
        user: [
          `Noticia de ${outlet} (${noticia.published_at.slice(0, 10)}):`,
          `TITULAR: ${noticia.titulo}`,
          noticia.resumen ? `SUMARIO: ${noticia.resumen}` : "(sin sumario: trabaja solo con el titular, sin inventar)",
          `URL: ${noticia.url}`,
          "",
          "Escribe el capítulo para el muro como JSON, exactamente con esta forma:",
          `{"titulo": "…", "hook": "1-2 frases que atrapan sin exagerar", "paneles": [{"role": "apertura|contexto|desarrollo|implicación|mirada CTC|cierre", "text": "2-4 frases completas"}]}`,
          `Papeles en orden: ${PAPELES.join(" → ")} (7 paneles).`,
          "«implicación»: qué cambia para el caficultor o comprador colombiano. «mirada CTC»: cómo conversa con una red exportadora de café de origen — sin inventar acciones de CTC.",
        ].join("\n"),
        // 7 paneles de 2-4 frases caben de sobra en 1400; el techo de 2200 solo
        // pagaba divagación. El cap es coste real, no una red de seguridad.
        maxTokens: 1400,
      });
      const out = parseJson<{ titulo?: string; hook?: string; paneles?: PanelGenerado[] }>(texto);
      if (out?.paneles?.length && out.paneles.every((p) => p.text?.trim().length > 40)) {
        titulo = (out.titulo || titulo).slice(0, 140);
        hook = out.hook?.slice(0, 300) ?? null;
        paneles = out.paneles.slice(0, 8).map((p) => ({ role: String(p.role || "").slice(0, 24), text: String(p.text).slice(0, 900) }));
      } else {
        aviso = "El redactor devolvió un capítulo incompleto: salió el borrador determinista.";
        paneles = fallbackPaneles({ titulo: noticia.titulo, resumen: noticia.resumen, outlet });
      }
    } catch (e) {
      aviso = `El redactor falló (${(e as Error).message.slice(0, 80)}): salió el borrador determinista.`;
      paneles = fallbackPaneles({ titulo: noticia.titulo, resumen: noticia.resumen, outlet });
    }
  } else {
    aviso = "Sin ANTHROPIC_API_KEY: borrador determinista, edítalo antes de la luz verde.";
    paneles = fallbackPaneles({ titulo: noticia.titulo, resumen: noticia.resumen, outlet });
  }

  // 2. La portada. Sin Gemini la entrega sale sin imagen Y LO DICE.
  let imagenPath: string | null = null;
  let imagenError: string | null = null;
  if (!conPortada) {
    imagenError = "Sin portada (no se pidió): el post sale solo con texto.";
  } else if (geminiImagenDisponible()) {
    try {
      const img = await geminiImagen({
        prompt: [
          "Editorial cover illustration for a coffee-industry news wall, printed-paper aesthetic,",
          "muted export-stationery palette (cream, deep green, brick red accents), no text, no words, no letters,",
          `visual metaphor for: "${titulo}".`,
          "Colombian coffee context: beans, farms, sacks, ports, markets — pick what fits the headline.",
        ].join(" "),
        aspect: "4:5",
      });
      const ruta = `coffeed/redaccion/${noticia.id}.png`;
      const { error: subida } = await service.storage
        .from("kaffetal-media")
        .upload(ruta, img.bytes, { contentType: img.mime, upsert: true });
      if (subida) imagenError = "La portada no se pudo guardar en Storage.";
      else imagenPath = ruta;
    } catch (e) {
      imagenError = (e as Error).message.slice(0, 140);
    }
  } else {
    imagenError = "GEMINI_API_KEY sin configurar: la entrega sale sin portada.";
  }

  // 3. La entrega, a la cola. Nace «entregado»: la luz verde no se salta.
  const { data: entrega, error: errEntrega } = await service
    .from("coffeed_deliverables")
    .insert({
      kind: "noticia",
      app: "redaccion",
      title: titulo,
      excerpt: hook,
      state: "entregado",
      payload: {
        panels: paneles.map((p, i) => ({ position: i + 1, role: p.role, text: p.text })),
        fuente: { outlet, titulo: noticia.titulo, url: noticia.url, publishedAt: noticia.published_at },
        imagenPath,
        imagenError,
        aviso,
      },
      submitted_by: who.userId,
    })
    .select("id")
    .maybeSingle();
  if (errEntrega || !entrega) return { ok: false, error: "El post se generó pero no se pudo encolar. Inténtalo de nuevo." };

  await service
    .from("coffeed_noticias")
    .update({ estado: "elegida", deliverable_id: (entrega as { id: string }).id })
    .eq("id", noticiaId);

  // 4. El ecosistema se entera (Make): dominio de contenido/venta. `emitEvent`
  // nunca lanza; `after` para no sumarle su latencia a la respuesta.
  after(async () => {
    await emitEvent({
      dominio: "ventas_marketing",
      tipo: "coffeed.redaccion.post_creado",
      payload: { deliverableId: (entrega as { id: string }).id, titulo, outlet, url: noticia.url, conPortada: Boolean(imagenPath) },
    });
  });

  return { ok: true, deliverableId: (entrega as { id: string }).id, conPortada: Boolean(imagenPath), aviso: aviso ?? imagenError };
}
