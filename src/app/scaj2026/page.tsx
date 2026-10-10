import { headers } from "next/headers";
import { LeadForm } from "@/components/leadForms/LeadForm";
import { idiomaInicial } from "@/lib/leadForms/campos";
import { configDe, formulario, type FormularioDeLaBase } from "@/lib/leadForms/registro";
import { formularioActivo } from "@/lib/leadForms/servidor";
import { selloDeTiempo } from "@/lib/leadForms/sello";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ── /scaj2026 · la página del formulario (V6.2) ──────────────────────────────────────────────────────────────────────────────
// Tres líneas de verdad: qué formulario es, si está ENCENDIDO en la LCP (si no, la página lo dice y no recibe envíos), el idioma del
// navegador y el sello de tiempo que el envío devuelve. Un formulario nuevo copia esta página con otra clave.

export const dynamic = "force-dynamic";

const CLAVE = "scaj2026";

export default async function Scaj2026Page({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const def = formulario(CLAVE)!;
  const { source } = await searchParams;
  const h = await headers();
  const service = createServiceRoleClient();
  const activo = await formularioActivo(service);
  const abierto = activo?.key === def.key;
  let privacyUrl = `${def.ruta}/privacidad`;
  if (abierto) {
    const { data } = await service.from("lead_forms").select("config").eq("key", def.key).maybeSingle();
    const config = configDe((data as Pick<FormularioDeLaBase, "config"> | null)?.config);
    if (config.privacy_url) privacyUrl = config.privacy_url;
  }
  return (
    <LeadForm
      formKey={def.key}
      textos={def.textos}
      idiomas={def.idiomas}
      idiomaInicial={idiomaInicial(h.get("accept-language"))}
      sello={selloDeTiempo()}
      source={typeof source === "string" && source.trim() ? source.trim().slice(0, 60) : null}
      privacyUrl={privacyUrl}
      abierto={abierto}
    />
  );
}
