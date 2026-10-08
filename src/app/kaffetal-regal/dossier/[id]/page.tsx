import type { Metadata } from "next";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { cargarDossier, type Lang } from "@/lib/kaffetal/dossierDatos";
import { DossierCtcx } from "@/components/kaffetal-regal/dossier/DossierCtcx";
import { tituloDeLote } from "@/lib/kaffetal/tituloDeDocumento";
import { tieneConsola } from "@/lib/panel/requireConsoleAccess";

export const dynamic = "force-dynamic";
// V5.169: el título (= el nombre del PDF) lleva el nombre del lote y su código.
export async function generateMetadata({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  // V5.192: abierto desde el OCP, el título (= el nombre del PDF) también lleva el nombre del lote y su código.
  return tituloDeLote((await searchParams).lang === "en" ? "Lot dossier" : "Dossier del lote", (await params).id, { verificarDueno: !(await tieneConsola("ocp")) });
}

// ── /kaffetal-regal/dossier/[id]?lang=es|en ─────────────────────────────────────────────────────────────────────────────
// V5.79: el dossier del lote para el productor, UN documento en dos idiomas. V5.166 (owner, 2026-10-06): formato CTCx por
// hojas A4, con la Visa EUDR dentro, el mapa de los cafetales, la finca y el productor, el grado por El Punto y la Tríada y
// las gráficas de la caracterización (`components/kaffetal-regal/dossier/DossierCtcx.tsx`). Mismo patrón de compuerta que la
// Visa (`certificacion-lote/[id]`): se autentica con la cookie compartida y, verificada la propiedad, se lee con el service
// role (`lib/kaffetal/dossierDatos.ts`). No exige Visa lista: el dossier dice en qué punto va cada cosa.
// V5.192 (owner, 2026-10-08): «el Dossier completo debe también ser accesible desde [la vista del lote en el OCP]». La SEGUNDA llave
// es un operador activo del OCP (`tieneConsola`, sin redirigir; la cookie del panel se comparte entre subdominios), y solo se
// pregunta cuando no es el dueño quien lo abre. Es solo lectura: el dossier no escribe nada.

function gate(message: string, lang: Lang) {
  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: 24, fontFamily: "system-ui, sans-serif", textAlign: "center", color: "#333" }}>
      <h1 style={{ fontSize: 20 }}>{lang === "en" ? "Lot dossier" : "Dossier del lote"}</h1>
      <p style={{ color: "#666" }}>{message}</p>
      <p style={{ marginTop: 20 }}>
        <a href="/kaffetal-regal">{lang === "en" ? "Back to my panel" : "Volver a mi panel"}</a>
      </p>
    </div>
  );
}

export default async function LotDossierPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const lang: Lang = sp.lang === "en" ? "en" : "es";

  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  let delOcp: boolean | null = null;
  const esDelOcp = async () => (delOcp ??= await tieneConsola("ocp"));
  if (!user && !(await esDelOcp())) return gate(lang === "en" ? "Sign in to see your lot dossier." : "Inicie sesión para ver el dossier de su lote.", lang);

  const datos = await cargarDossier(createServiceRoleClient(), id, lang);
  const delDueno = Boolean(datos && user && datos.producerId === user.id);
  if (!datos || (!delDueno && !(await esDelOcp()))) return gate(lang === "en" ? "We could not find this lot in your account." : "No encontramos este lote en su cuenta.", lang);

  return <DossierCtcx d={datos} />;
}
