import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient, createServiceRoleClient } from "@/lib/supabase/server";
import { stableStringify } from "@/lib/stableStringify";

type NextStepContext = {
  lotId: string;
  lotCode: string;
  stageLabel: string;
  panes: { id: string; label: string; done: boolean }[];
  productName: string;
  species: string;
  estate: string;
  varietyCount: number;
  scaTotal: number;
  primaryDefect: number;
  secondaryDefect: number;
  force?: boolean;
};

const SYSTEM_PROMPT = `Eres un asistente interno embebido en la Ficha Técnica de Kaffetal Regal, la herramienta donde un caficultor colombiano documenta un lote de café antes de enviarlo a evaluación.

Tu única función es decirle al productor, en UNA sola frase corta en español (máximo 25 palabras), cuál es el siguiente paso concreto para avanzar ESTE lote específico. No respondas preguntas abiertas, no converses, no saludes, no expliques el proceso en general -- solo la instrucción directa siguiente, basada en el estado real que se te da. Si la ficha ya está completa, dilo y sugiere avanzar hacia el envío de la muestra.`;

export async function POST(request: NextRequest) {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ configured: false });
  }

  const context = (await request.json()) as NextStepContext;
  const { lotId, force, ...comparable } = context;

  const { data: lot } = await sessionClient.from("lots").select("producer_id, ai_next_step_advice, ai_next_step_context").eq("id", lotId).maybeSingle();
  if (!lot || lot.producer_id !== user.id) {
    return NextResponse.json({ error: "Lote no encontrado." }, { status: 404 });
  }

  if (!force && lot.ai_next_step_advice && stableStringify(comparable) === stableStringify(lot.ai_next_step_context)) {
    return NextResponse.json({ configured: true, advice: lot.ai_next_step_advice, cached: true });
  }

  const pendingPanes = context.panes.filter((p) => !p.done).map((p) => p.label);

  const userContent = `Lote: ${context.lotCode}
Etapa actual: ${context.stageLabel}
Nombre del producto: ${context.productName || "(sin definir)"}
Especie: ${context.species || "(sin definir)"}
Finca/estate: ${context.estate || "(sin definir)"}
Variedades registradas: ${context.varietyCount}
Puntaje SCA total: ${context.scaTotal || "(sin catación registrada)"}
Defectos primarios/secundarios: ${context.primaryDefect}/${context.secondaryDefect}
Paneles de la ficha aún incompletos: ${pendingPanes.length ? pendingPanes.join(", ") : "ninguno -- todos completos"}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 120,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ configured: true, error: `Anthropic API error: ${errText}` }, { status: 502 });
    }

    const json = await res.json();
    const advice: string = json.content?.[0]?.text?.trim() || "No se pudo generar una recomendación.";

    const service = createServiceRoleClient();
    await service.from("lots").update({ ai_next_step_advice: advice, ai_next_step_context: comparable }).eq("id", lotId);

    return NextResponse.json({ configured: true, advice, cached: false });
  } catch (err) {
    return NextResponse.json({ configured: true, error: err instanceof Error ? err.message : "Error desconocido." }, { status: 502 });
  }
}
