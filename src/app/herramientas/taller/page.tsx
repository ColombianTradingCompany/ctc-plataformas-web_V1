import { redirect } from "next/navigation";
import { LangProvider } from "@/components/lang/i18n";
import { superficieConOverrides } from "@/lib/seo/openGraph";
import { cargarTaller } from "@/lib/tools/taller";
import { TallerBarra } from "@/components/tools/TallerBarra";
import { TallerAlbum } from "@/components/tools/TallerAlbum";
import styles from "./taller.module.css";

// ── /herramientas/taller · la rejilla de trabajo (A8/A9, 2026-08-19) ────────
// Detrás de la puerta: la landing pública es el carrusel; ESTO es donde se
// trabaja. Todo el catálogo compartible, cada herramienta con su estado a la
// vista — abrir, o candado con «Solicitar» dentro (A9: una Plus se LISTA, no
// se esconde). Sin sesión, a la puerta.
//
// Segunda pasada del owner (mismo día): la barra con identidad y salida
// arriba, y las tarjetas con la MISMA captura del carrusel — el taller ya no
// es una lista de texto.
export const generateMetadata = superficieConOverrides({
  route: "/herramientas",
  title: "El taller · Herramientas del Café · CTC",
  description: "Las herramientas de trabajo de la red CTC, con tus trabajos guardados.",
  siteName: "Herramientas del Café · CTC",
  image: "herramientas.jpg",
  imageAlt: "Logotipo de Herramientas del Café sobre fondo azul corporativo",
});

export const dynamic = "force-dynamic";

export default async function TallerPage() {
  const taller = await cargarTaller();
  if (!taller.autenticado) redirect("/herramientas/acceso");

  // Lo Plus, dicho con todas las letras (queja del owner: tenía Plus activo y
  // nada en pantalla se lo decía): cuántas Plus abre esta cuenta, arriba.
  const plusAbiertas = taller.herramientas.filter((h) => h.esPlus && h.veredicto.abre).length;
  const plusTotales = taller.herramientas.filter((h) => h.esPlus).length;

  return (
    <div data-theme="ctc-home">
      <LangProvider storageKey="ctc-lang">
        <TallerBarra email={taller.email} />
        <main className={styles.marco}>
          <header className={styles.cabeza}>
            <h1>El taller</h1>
            <p>
              Las herramientas de trabajo de la red, con tu cuenta. Toca una carátula para ver qué es; ábrela desde su
              reverso. Las marcadas «Memoria» guardan tus trabajos — con nombre y fecha — para retomarlos desde
              cualquier equipo.
            </p>
            {plusTotales > 0 && (
              <p className={styles.plusEstado} data-activa={plusAbiertas > 0 ? "" : undefined}>
                {plusAbiertas > 0
                  ? `Plus ACTIVO en tu cuenta: abres ${plusAbiertas} de ${plusTotales} herramienta${plusTotales === 1 ? "" : "s"} Plus.`
                  : `Hay ${plusTotales} herramienta${plusTotales === 1 ? "" : "s"} Plus: se activan por solicitud, desde su propia página.`}
              </p>
            )}
          </header>

          {!taller.esMiembro && (
            <p className={styles.avisoMembresia}>
              Tu cuenta todavía no es de productor (Kaffetal Regal), comprador (Cherry Picked) ni experto del
              Directorio del Café — que son las tres puertas que abren las herramientas. Completa tu perfil en la que
              te corresponda y vuelve.
            </p>
          )}

          <TallerAlbum
            herramientas={taller.herramientas.map((h) => ({
              id: h.id,
              nombre: h.nombre,
              descripcion: h.descripcion,
              esPlus: h.esPlus,
              soportaMemoria: h.soportaMemoria,
              abre: h.veredicto.abre,
              viaPlus: h.veredicto.abre && h.esPlus && h.veredicto.via !== "default" ? h.veredicto.via : null,
              sePuedeSolicitar: !h.veredicto.abre && h.veredicto.motivo === "sin-permiso",
              trabajos: h.trabajos,
            }))}
          />
        </main>
      </LangProvider>
    </div>
  );
}
