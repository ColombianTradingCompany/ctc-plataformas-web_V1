import { cookies, headers } from "next/headers";
import { LeadForm, type RegistroPrevio } from "@/components/leadForms/LeadForm";
import { codigoDeLead, idiomaInicial, nombreDeCookieDeRegistro, valoresDelPaso2De } from "@/lib/leadForms/campos";
import { configDe, formulario, type FormularioDeLaBase } from "@/lib/leadForms/registro";
import { cargarLead, formularioActivo } from "@/lib/leadForms/servidor";
import { rutaDeCompletar, rutaDelPdf, selloDeTiempo, testigoDeLeadValido } from "@/lib/leadForms/sello";
import { lotesParaElegir } from "@/lib/leadForms/vitrina";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ── /scaj2026 · la página del formulario (V6.2 · V6.5) ───────────────────────────────────────────────────────────────────────
// Tres líneas de verdad: qué formulario es, si está ENCENDIDO en la LCP (si no, la página lo dice y no recibe envíos), el idioma del
// navegador y el sello de tiempo que el envío devuelve. Un formulario nuevo copia esta página con otra clave.
// V6.5 (owner, 2026-10-12): dos cosas más. La COOKIE del registro (`ctc-lead-<clave>`: `<id>.<testigo>`, httpOnly, solo esta ruta):
// si el navegador ya envió, la página valida el testigo (HMAC), carga el lead y abre en la pantalla de confirmación con su código y su
// PDF en vez de volver al principio; una cookie sin testigo válido se ignora (no se enseña nada). Y los LOTES de la vitrina (los de las
// redes) para «¿qué lote te llamó la atención?», leídos de la misma cinta pública que no lleva al productor.

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

  let registroPrevio: RegistroPrevio | null = null;
  const galleta = (await cookies()).get(nombreDeCookieDeRegistro(def.key))?.value ?? "";
  const punto = galleta.indexOf(".");
  if (punto > 0) {
    const id = galleta.slice(0, punto);
    const testigo = galleta.slice(punto + 1);
    if (testigoDeLeadValido(id, testigo)) {
      const lead = await cargarLead(service, id);
      if (lead && lead.form_key === def.key) {
        registroPrevio = {
          leadId: lead.id,
          testigo,
          codigo: codigoDeLead(def.key, lead.id),
          pdfHref: rutaDelPdf(def.ruta, lead.id),
          completarHref: rutaDeCompletar(def.ruta, lead.id),
          participantType: lead.participant_type,
          lang: lead.lang,
          valores: valoresDelPaso2De(lead),
        };
      }
    }
  }
  const lotes = abierto ? await lotesParaElegir() : [];

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
      lotes={lotes}
      registroPrevio={registroPrevio}
    />
  );
}
