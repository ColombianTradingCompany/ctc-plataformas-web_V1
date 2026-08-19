import { redirect } from "next/navigation";
import { LangProvider } from "@/components/lang/i18n";
import { createSessionClient } from "@/lib/supabase/server";
import { superficieConOverrides } from "@/lib/seo/openGraph";
import { AccesoTaller } from "./AccesoTaller";

// ── /herramientas/acceso · la puerta del taller (A8) ────────────────────────
// Cuelga de la superficie, así el proxy la sirve por construcción en
// herramientas.ctcexport.com (gotcha 12). Con sesión no se ve: directo al taller.
export const generateMetadata = superficieConOverrides({
  route: "/herramientas",
  title: "Entrar al taller · Herramientas del Café · CTC",
  description: "Entra con tu cuenta de Kaffetal Regal, Cherry Picked o el Directorio del Café.",
  siteName: "Herramientas del Café · CTC",
  image: "herramientas.jpg",
  imageAlt: "Logotipo de Herramientas del Café sobre fondo azul corporativo",
});

export const dynamic = "force-dynamic";

export default async function AccesoTallerPage() {
  // ⚠️ `redirect()` FUERA del try: lanza NEXT_REDIRECT por dentro, y un catch
  // envolvente se lo tragaría — la página fingiría no tener sesión.
  let conSesion = false;
  try {
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    conSesion = !!user;
  } catch {
    // Sin sesión legible se queda en la puerta, que es exactamente para eso.
  }
  if (conSesion) redirect("/herramientas/taller");

  return (
    <div data-theme="ctc-home">
      <LangProvider storageKey="ctc-lang">
        <main style={{ minHeight: "70vh", padding: "0 20px" }}>
          <AccesoTaller />
        </main>
      </LangProvider>
    </div>
  );
}
