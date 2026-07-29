"use server";

// ── Coffeed · el muro público de las superficies ─────────────────────────────
// KR, Cherry Picked y el Directorio montan el mismo muro de solo-lectura.
// Curaduría a la public_lot_catalog: SOLO capítulos published, SOLO columnas
// de exhibición (título, nº, fecha, paneles). Los anuncios internos NUNCA
// viajan por aquí — son del muro del Estudio. Sin gate de sesión a propósito:
// publicar ES la compuerta.

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { CoffeedWallChapter } from "./types";

export async function getCoffeedWall(): Promise<CoffeedWallChapter[]> {
  const service = createServiceRoleClient();
  type Row = {
    id: string;
    title: string;
    published_at: string | null;
    accepted_at: string | null;
    coffeed_cycles: { chapter_no: number } | null;
    coffeed_panels: { position: number; role: string | null; text: string }[];
  };
  const { data } = await service
    .from("coffeed_drafts")
    .select("id, title, published_at, accepted_at, coffeed_cycles(chapter_no), coffeed_panels(position, role, text)")
    .eq("state", "published")
    .order("published_at", { ascending: false })
    .limit(24);

  return ((data ?? []) as unknown as Row[]).map((c) => ({
    draftId: c.id,
    chapterNo: c.coffeed_cycles?.chapter_no ?? 0,
    title: c.title,
    state: "published" as const,
    publishedAt: c.published_at,
    acceptedAt: c.accepted_at,
    panels: c.coffeed_panels.sort((a, b) => a.position - b.position),
  }));
}
