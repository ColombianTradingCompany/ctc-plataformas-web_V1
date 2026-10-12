import { headers } from "next/headers";
import { LeadForm } from "@/components/leadForms/LeadForm";
import { codigoDeLead, idiomaInicial, valoresDelPaso2De, type IdiomaDeFormulario, type LeadDeEvento } from "@/lib/leadForms/campos";
import { configDe, formulario, type FormularioDeLaBase } from "@/lib/leadForms/registro";
import { cargarLead } from "@/lib/leadForms/servidor";
import { rutaDelPdf, testigoDeLeadValido } from "@/lib/leadForms/sello";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ── /scaj2026/completar · el PASO 2 desde el enlace del correo (V6.4) ────────────────────────────────────────────────────────
// `?id=<lead>&t=<testigo>`: el enlace firmado que va en el correo de respuesta («Completar o corregir mis respuestas»). Abre el
// formulario en modo complemento, PRELLENADO con lo que el lead ya respondió, y guarda sobre el mismo registro. Sin testigo válido no
// se enseña nada del lead (ni su nombre). Funciona aunque el formulario esté apagado: es un registro que ya existe.

export const dynamic = "force-dynamic";

const CLAVE = "scaj2026";

export default async function CompletarPage({ searchParams }: { searchParams: Promise<{ id?: string; t?: string; lang?: string }> }) {
  const def = formulario(CLAVE)!;
  const { id, t, lang } = await searchParams;
  const h = await headers();
  const service = createServiceRoleClient();
  const base = {
    formKey: def.key,
    textos: def.textos,
    idiomas: def.idiomas,
    sello: "",
    source: null,
    abierto: true,
  };
  let privacyUrl = `${def.ruta}/privacidad`;
  const { data } = await service.from("lead_forms").select("config").eq("key", def.key).maybeSingle();
  const config = configDe((data as Pick<FormularioDeLaBase, "config"> | null)?.config);
  if (config.privacy_url) privacyUrl = config.privacy_url;

  const lead: LeadDeEvento | null = id && testigoDeLeadValido(id, t) ? await cargarLead(service, id) : null;
  if (!lead || lead.form_key !== def.key) {
    return <LeadForm {...base} idiomaInicial={idiomaInicial(h.get("accept-language"))} privacyUrl={privacyUrl} complementoInvalido />;
  }
  const valores = valoresDelPaso2De(lead);
  const idioma: IdiomaDeFormulario = lang === "es" || lang === "en" || lang === "ja" ? lang : lead.lang;
  return (
    <LeadForm
      {...base}
      idiomaInicial={idioma}
      privacyUrl={privacyUrl}
      complemento={{ leadId: lead.id, testigo: t!, participantType: lead.participant_type, valores, codigo: codigoDeLead(def.key, lead.id), pdfHref: rutaDelPdf(def.ruta, lead.id) }}
    />
  );
}
