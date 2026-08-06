"use server";

// ── Coffeed · el muro de las superficies ─────────────────────────────────────
// KR, Cherry Picked y el Directorio montan el mismo muro de solo-lectura.
// Curaduría a la public_lot_catalog: SOLO entregas publicadas, SOLO columnas
// de exhibición. Sin gate de sesión a propósito: publicar ES la compuerta.
//
// 2026-07-30 (decisión del owner): los ANUNCIOS viajan con los capítulos —
// el muro es el mismo dondequiera que se muestre Coffeed, no una versión
// recortada. Va también la identidad de marca (nombre/slogan/paleta/tipografía)
// para que el muro se vea de la misma familia que los posts descargables.
//
// 2026-08-03: el muro dejó de leer `coffeed_drafts` y lee `coffeed_deliverables`.
// Ahora es un feed MIXTO — carruseles del Source Wrapper, videos de Datawave e
// incrustados de Instagram/YouTube — porque el Estudio produce con varias apps
// y todas desembocan aquí. Los paneles del carrusel se resuelven por su
// borrador; el medio de un video/incrustado sale de `payload`.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { createSignedUrl } from "./storage";
import type { CoffeedAnnouncement, CoffeedGuion, CoffeedMedia, CoffeedMediaProvider, CoffeedWallBundle, CoffeedWallItem } from "./types";

type WallRow = {
  id: string;
  kind: CoffeedWallItem["kind"];
  title: string;
  excerpt: string | null;
  published_at: string | null;
  payload: Record<string, unknown> | null;
  coffeed_drafts: {
    coffeed_cycles: { chapter_no: number } | null;
    coffeed_panels: { position: number; role: string | null; text: string }[];
  } | null;
};

export async function getCoffeedWall(): Promise<CoffeedWallBundle> {
  const service = createServiceRoleClient();

  const [{ data: itemRows }, { data: annRows }, { data: brandRow }] = await Promise.all([
    service
      .from("coffeed_deliverables")
      .select("id, kind, title, excerpt, published_at, payload, coffeed_drafts(coffeed_cycles(chapter_no), coffeed_panels(position, role, text))")
      .eq("state", "publicado")
      .order("published_at", { ascending: false })
      .limit(24),
    service
      .from("coffeed_announcements")
      .select("id, title, body, area, pinned, published_at")
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(20),
    service.from("coffeed_brand").select("company_name, slogan, palette, font_family").eq("id", true).maybeSingle(),
  ]);

  const items: CoffeedWallItem[] = await Promise.all(
    ((itemRows ?? []) as unknown as WallRow[]).map(async (r) => {
      let media: CoffeedMedia | null = null;
      if (r.kind === "video" || r.kind === "embed") {
        const p = r.payload ?? {};
        const assetPath = typeof p.assetPath === "string" ? p.assetPath : null;
        const rawUrl = typeof p.url === "string" ? p.url : null;
        // El archivo se firma en cada lectura del muro (TTL 1 h, patrón kaffetalMedia).
        const url = assetPath ? ((await createSignedUrl(service, assetPath)) ?? "") : (rawUrl ?? "");
        if (url) {
          media = {
            provider: (typeof p.provider === "string" ? p.provider : "archivo") as CoffeedMediaProvider,
            url,
            embedUrl: typeof p.embedUrl === "string" ? p.embedUrl : null,
            poster: typeof p.poster === "string" ? p.poster : null,
            aspect: typeof p.aspect === "string" ? p.aspect : null,
            caption: typeof p.caption === "string" ? p.caption : null,
          };
        }
      }
      // RT-Scriptor: la tira de fotogramas. Se firma en lote por entrega —
      // pueden ser treinta rutas y una a una serían treinta viajes por muro.
      let guion: CoffeedGuion | null = null;
      if (r.kind === "guion" && r.payload && typeof r.payload.projectId === "string") {
        const p = r.payload;
        const raw = Array.isArray(p.frames) ? (p.frames as { path?: string; label?: string }[]) : [];
        const paths = raw.map((f) => f.path).filter((x): x is string => typeof x === "string" && !!x);
        const signed: Record<string, string> = {};
        if (paths.length) {
          const { data } = await service.storage.from("kaffetal-media").createSignedUrls(paths, 60 * 60);
          for (const row of data ?? []) if (row.signedUrl && row.path) signed[row.path] = row.signedUrl;
        }
        guion = {
          projectId: p.projectId as string,
          projectTitle: typeof p.projectTitle === "string" ? p.projectTitle : "",
          aspect: typeof p.aspect === "string" ? p.aspect : "16:9",
          runtime: typeof p.runtime === "number" ? p.runtime : 0,
          scenes: Array.isArray(p.scenes) ? (p.scenes as CoffeedGuion["scenes"]) : [],
          frames: raw.map((f) => ({ url: f.path ? (signed[f.path] ?? "") : "", label: f.label ?? "" })).filter((f) => f.url),
        };
      }

      return {
        id: r.id,
        kind: r.kind,
        chapterNo: r.coffeed_drafts?.coffeed_cycles?.chapter_no ?? null,
        title: r.title,
        excerpt: r.excerpt,
        publishedAt: r.published_at,
        panels: (r.coffeed_drafts?.coffeed_panels ?? []).slice().sort((a, b) => a.position - b.position),
        media,
        guion,
      };
    })
  );

  const announcements: CoffeedAnnouncement[] = (
    (annRows ?? []) as { id: string; title: string; body: string | null; area: string | null; pinned: boolean; published_at: string }[]
  ).map((a) => ({ id: a.id, title: a.title, body: a.body, area: a.area, pinned: a.pinned, publishedAt: a.published_at }));

  return {
    items,
    announcements,
    brand: {
      companyName: (brandRow?.company_name as string) ?? "Colombian Trading Company",
      slogan: (brandRow?.slogan as string | null) ?? null,
      palette: Array.isArray(brandRow?.palette) ? (brandRow.palette as string[]) : [],
      fontFamily: (brandRow?.font_family as string) ?? "Fraunces",
    },
  };
}
