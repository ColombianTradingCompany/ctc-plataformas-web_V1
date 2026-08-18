"use server";

import { revalidatePath } from "next/cache";
import { registrarConsumo, usoDesdeAnthropic, USOS } from "@/lib/ai/consumo";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireGvgOwner } from "./requireGvgOwner";
import { sanitizeStrings, type GvgApplication, type GvgEvent, type MatchResult } from "./cvData";
import { REPORT_CRITERIA, computeReportMetrics, type ReportCriterionId, type ReportMetrics } from "./reportData";
import { renderReportHtml, type ReportInterpretation } from "./reportTemplate";

const CV_PATH = "/bcp/gvg/cv";

type Result = { ok: true } | { ok: false; error: string };

export type GvgReport = {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  criteria: ReportCriterionId[];
  metrics: ReportMetrics;
  interpretation: ReportInterpretation | null;
  html: string | null;
  error: string | null;
  created_at: string;
};

function normalize(r: Record<string, unknown>): GvgReport {
  return {
    id: r.id as string,
    title: (r.title as string) ?? "",
    period_start: r.period_start as string,
    period_end: r.period_end as string,
    criteria: (r.criteria as ReportCriterionId[]) ?? [],
    metrics: (r.metrics as ReportMetrics) ?? ({} as ReportMetrics),
    interpretation: (r.interpretation as ReportInterpretation | null) ?? null,
    html: (r.html as string | null) ?? null,
    error: (r.error as string | null) ?? null,
    created_at: (r.created_at as string) ?? "",
  };
}

export async function loadGvgReports(): Promise<GvgReport[]> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { data } = await service.from("gvg_reports").select("*").order("created_at", { ascending: false });
  return ((data as Record<string, unknown>[] | null) ?? []).map(normalize);
}

const REPORT_SYSTEM = `You are the analyst inside GVG-Space CV App Manager, writing the reading of a job-search report for Gabriel Vasquez — the person whose search it is. He is the only reader.

You receive a JSON payload of figures ALREADY COMPUTED from his application record for one period. Your job is interpretation, never arithmetic: do not recompute, restate every number, or invent a figure that is not in the payload. Quote a number only when it carries the point.

Return ONE JSON object in a \`\`\`json fenced block at the very END of your response, nothing after it:

{
  "headline": "one sentence, max 22 words: the honest verdict on this period",
  "sections": { "<criterion id>": "2-3 sentences reading THAT section alone: what the shape of the data says, and what it implies for what he should do next" },
  "overall": "4-6 sentences reading the sections TOGETHER: the story across them, the tension or confirmation between them, and the single most useful change to make next period"
}

Rules:
- Include one entry in "sections" for every criterion id present in the payload, and no others.
- Be specific and useful, not encouraging. If the numbers are thin or the period is quiet, say so plainly; a small sample is a real finding, not something to paper over.
- If "log_covers_period" is false, treat matched/rendered counts as under-reported and say so once rather than drawing conclusions from them.
- Write to him directly ("you"), in plain English, no corporate filler, no bullet lists inside the strings.
- NEVER use an em dash (—) anywhere. Use a comma, a full stop, a colon, or rewrite. This is a hard rule.`;

type AnthropicBlock = { type: string; text?: string };

async function interpret(metrics: ReportMetrics, criteria: ReportCriterionId[]): Promise<ReportInterpretation> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const labels = REPORT_CRITERIA.filter((c) => criteria.includes(c.id)).map((c) => `${c.id}: ${c.label} — ${c.blurb}`);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "server-side-fallback-2026-07-01",
    },
    body: JSON.stringify({
      model: "claude-opus-5",
      max_tokens: 4000,
      fallbacks: "default",
      system: [{ type: "text", text: REPORT_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Criteria in this report:\n${labels.join("\n")}\n\nFigures:\n${JSON.stringify(metrics, null, 1)}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { stop_reason?: string; content?: AnthropicBlock[] };
  void registrarConsumo({ proveedor: "anthropic", modelo: "claude-opus-5", superficie: USOS.gvgReporte,
    uso: usoDesdeAnthropic((json as { usage?: unknown }).usage), ok: json.stop_reason !== "refusal",
    error: json.stop_reason === "refusal" ? "refusal" : null });
  if (json.stop_reason === "refusal") throw new Error("The model declined to write this report.");

  const text = (json.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
  const fence = text.match(/```json\s*([\s\S]*?)```\s*$/) ?? text.match(/```json\s*([\s\S]*?)```/);
  if (!fence) throw new Error("The model returned no JSON block.");
  const parsed = JSON.parse(fence[1]) as ReportInterpretation;
  if (!parsed.headline || !parsed.overall) throw new Error("The interpretation is missing its headline or overall reading.");
  return sanitizeStrings(parsed);
}

/**
 * Emit a report: compute the figures deterministically, have the model read
 * them, render the document, and freeze all three on the row. The metrics are
 * stored as computed so a report never silently changes when later data lands.
 */
export async function emitGvgReport(input: {
  title: string;
  start: string;
  end: string;
  criteria: ReportCriterionId[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireGvgOwner();
  const service = createServiceRoleClient();

  if (!input.criteria.length) return { ok: false, error: "Pick at least one criterion." };
  if (!input.start || !input.end) return { ok: false, error: "Set a start and an end date." };
  if (input.start > input.end) return { ok: false, error: "The start date is after the end date." };

  const [{ data: apps }, { data: evs }] = await Promise.all([
    service.from("gvg_applications").select("*"),
    service.from("gvg_application_events").select("id, application_id, kind, detail, at"),
  ]);

  const applications = ((apps as Record<string, unknown>[] | null) ?? []).map(
    (a) =>
      ({
        ...a,
        match: (a.match as MatchResult | null) ?? null,
      }) as unknown as GvgApplication
  );
  const events = ((evs as Record<string, unknown>[] | null) ?? []) as unknown as GvgEvent[];

  const metrics = computeReportMetrics({ applications, events, start: input.start, end: input.end, criteria: input.criteria });

  const title = input.title.trim() || `Job search report · ${input.start} to ${input.end}`;
  const { data: row, error } = await service
    .from("gvg_reports")
    .insert({
      title,
      period_start: input.start,
      period_end: input.end,
      criteria: input.criteria,
      metrics,
    })
    .select("id")
    .single();
  if (error || !row) return { ok: false, error: "Could not create the report." };
  const id = row.id as string;

  try {
    const interpretation = await interpret(metrics, input.criteria);
    const html = renderReportHtml({ title, metrics, criteria: input.criteria, interpretation });
    await service.from("gvg_reports").update({ interpretation, html, error: null }).eq("id", id);
    revalidatePath(CV_PATH);
    return { ok: true, id };
  } catch (err) {
    // The figures are already saved and are the durable part; render the
    // document without the reading so the report still exists and can be
    // re-interpreted later rather than being lost to a model hiccup.
    const html = renderReportHtml({ title, metrics, criteria: input.criteria, interpretation: null });
    await service
      .from("gvg_reports")
      .update({ html, error: err instanceof Error ? err.message.slice(0, 300) : "Interpretation failed." })
      .eq("id", id);
    revalidatePath(CV_PATH);
    return { ok: false, error: err instanceof Error ? err.message : "The interpretation failed; the figures were saved." };
  }
}

/** Re-run only the reading, against the frozen figures. */
export async function reinterpretGvgReport(reportId: string): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { data: r } = await service.from("gvg_reports").select("*").eq("id", reportId).maybeSingle();
  if (!r) return { ok: false, error: "Report not found." };

  try {
    const metrics = r.metrics as ReportMetrics;
    const criteria = r.criteria as ReportCriterionId[];
    const interpretation = await interpret(metrics, criteria);
    const html = renderReportHtml({ title: r.title as string, metrics, criteria, interpretation });
    await service.from("gvg_reports").update({ interpretation, html, error: null }).eq("id", reportId);
    revalidatePath(CV_PATH);
    return { ok: true };
  } catch (err) {
    await service
      .from("gvg_reports")
      .update({ error: err instanceof Error ? err.message.slice(0, 300) : "Interpretation failed." })
      .eq("id", reportId);
    revalidatePath(CV_PATH);
    return { ok: false, error: err instanceof Error ? err.message : "The interpretation failed." };
  }
}

export async function deleteGvgReport(reportId: string): Promise<Result> {
  await requireGvgOwner();
  const service = createServiceRoleClient();
  const { error } = await service.from("gvg_reports").delete().eq("id", reportId);
  if (error) return { ok: false, error: "Could not delete the report." };
  revalidatePath(CV_PATH);
  return { ok: true };
}
