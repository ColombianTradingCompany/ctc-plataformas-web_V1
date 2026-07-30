"use server";

// ── Coffeed · el muro de las superficies ─────────────────────────────────────
// KR, Cherry Picked y el Directorio montan el mismo muro de solo-lectura.
// Curaduría a la public_lot_catalog: SOLO capítulos published, SOLO columnas
// de exhibición. Sin gate de sesión a propósito: publicar ES la compuerta.
//
// 2026-07-30 (decisión del owner): los ANUNCIOS viajan con los capítulos —
// el muro es el mismo dondequiera que se muestre Coffeed, no una versión
// recortada. Va también la identidad de marca (nombre/slogan/paleta/tipografía)
// para que el muro se vea de la misma familia que los posts descargables.

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { CoffeedAnnouncement, CoffeedWallBundle, CoffeedWallChapter } from "./types";

export async function getCoffeedWall(): Promise<CoffeedWallBundle> {
  const service = createServiceRoleClient();

  type ChapterRow = {
    id: string;
    title: string;
    excerpt: string | null;
    published_at: string | null;
    coffeed_cycles: { chapter_no: number } | null;
    coffeed_panels: { position: number; role: string | null; text: string }[];
  };

  const [{ data: chapterRows }, { data: annRows }, { data: brandRow }] = await Promise.all([
    service
      .from("coffeed_drafts")
      .select("id, title, excerpt, published_at, coffeed_cycles(chapter_no), coffeed_panels(position, role, text)")
      .eq("state", "published")
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

  const chapters: CoffeedWallChapter[] = ((chapterRows ?? []) as unknown as ChapterRow[]).map((c) => ({
    draftId: c.id,
    chapterNo: c.coffeed_cycles?.chapter_no ?? 0,
    title: c.title,
    excerpt: c.excerpt,
    publishedAt: c.published_at,
    panels: (c.coffeed_panels ?? []).sort((a, b) => a.position - b.position),
  }));

  const announcements: CoffeedAnnouncement[] = (
    (annRows ?? []) as { id: string; title: string; body: string | null; area: string | null; pinned: boolean; published_at: string }[]
  ).map((a) => ({ id: a.id, title: a.title, body: a.body, area: a.area, pinned: a.pinned, publishedAt: a.published_at }));

  return {
    chapters,
    announcements,
    brand: {
      companyName: (brandRow?.company_name as string) ?? "Colombian Trading Company",
      slogan: (brandRow?.slogan as string | null) ?? null,
      palette: Array.isArray(brandRow?.palette) ? (brandRow.palette as string[]) : [],
      fontFamily: (brandRow?.font_family as string) ?? "Fraunces",
    },
  };
}
