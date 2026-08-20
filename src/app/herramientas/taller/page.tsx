import { redirect } from "next/navigation";
import Image from "next/image";
import { LangProvider } from "@/components/lang/i18n";
import { superficieConOverrides } from "@/lib/seo/openGraph";
import { cargarTaller } from "@/lib/tools/taller";
import { BarraHerramienta } from "@/components/tools/BarraHerramienta";
import { CoverFlow, type CoverItem } from "@/components/tools/CoverFlow";
import { ObtenerPlus } from "@/components/tools/ObtenerPlus";
import styles from "./taller.module.css";

// ── /herramientas/taller · la rejilla de trabajo (A8/A9, 2026-08-19) ────────
// Detrás de la puerta: la landing pública es el carrusel; ESTO es donde se
// trabaja. Sin sesión, a la puerta.
//
// V5.8 (owner): las herramientas se enseñan en COVER FLOW —la mecánica de Cool
// PDF, que fue la referencia que pidió— y en DOS estantes: las abiertas
// arriba, las Plus en su propio estante debajo. Arriba del todo, el botón que
// explica qué es Plus y manda la solicitud.
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

  const aCover = (h: (typeof taller.herramientas)[number]): CoverItem => ({
    id: h.id,
    nombre: h.nombre,
    descripcion: h.descripcion,
    esPlus: h.esPlus,
    soportaMemoria: h.soportaMemoria,
    abre: h.veredicto.abre,
    viaPlus: h.veredicto.abre && h.esPlus && h.veredicto.via !== "default" ? h.veredicto.via : null,
    sePuedeSolicitar: !h.veredicto.abre && h.veredicto.motivo === "sin-permiso",
    trabajos: h.trabajos,
  });

  // Dos estantes (owner): lo abierto y lo Plus. El reparto es por NIVEL, no por
  // si esta cuenta lo abre — una Plus ya activa sigue siendo Plus, y verla en
  // su estante con el sello «ACTIVA» es justo lo que el owner echaba en falta.
  const abiertas = taller.herramientas.filter((h) => !h.esPlus).map(aCover);
  const plus = taller.herramientas.filter((h) => h.esPlus).map(aCover);

  const plusAbiertas = plus.filter((h) => h.abre).length;
  const plusPorPedir = plus.filter((h) => !h.abre);

  return (
    <div data-theme="ctc-home">
      <LangProvider storageKey="ctc-lang">
        <BarraHerramienta
          nombre="Herramientas del Café"
          email={taller.email}
          red={taller.red}
          volverHref="/herramientas"
          volverEtiqueta="Salir del taller"
        />
        <main className={styles.marco}>
          <header className={styles.cabeza}>
            <Image
              className={styles.marca}
              src="/images/shared/herramientas-logo.png"
              alt="Herramientas del Café"
              width={720}
              height={675}
              priority
            />
            <div>
              <h1>El taller</h1>
              <p>
                Las herramientas de trabajo de la red, con tu cuenta. Arrastra las portadas o usa las flechas; abre la
                que necesites desde su ficha. Las marcadas «Memoria» guardan tus trabajos — con nombre y fecha — para
                retomarlos desde cualquier equipo.
              </p>
              {plus.length > 0 && (
                <p className={styles.plusEstado} data-activa={plusAbiertas > 0 ? "" : undefined}>
                  {plusAbiertas > 0
                    ? `Plus ACTIVO en tu cuenta: abres ${plusAbiertas} de ${plus.length} herramienta${plus.length === 1 ? "" : "s"} Plus.`
                    : `Hay ${plus.length} herramienta${plus.length === 1 ? "" : "s"} Plus: se activan por solicitud.`}
                </p>
              )}
            </div>
          </header>

          {!taller.esMiembro && (
            <p className={styles.avisoMembresia}>
              Tu cuenta todavía no es de productor (Kaffetal Regal), comprador (Cherry Picked) ni experto del
              Directorio del Café — que son las tres puertas que abren las herramientas. Completa tu perfil en la que
              te corresponda y vuelve.
            </p>
          )}

          {plusPorPedir.length > 0 && (
            <ObtenerPlus cuantas={plusPorPedir.length} nombres={plusPorPedir.map((h) => h.nombre)} />
          )}

          {abiertas.length > 0 && (
            <section className={styles.estante}>
              <h2 className={styles.estanteTitulo}>
                Tus herramientas <span>{abiertas.length}</span>
              </h2>
              <CoverFlow items={abiertas} idPrefijo="abiertas" />
            </section>
          )}

          {plus.length > 0 && (
            <section className={styles.estante}>
              <h2 className={`${styles.estanteTitulo} ${styles.estantePlus}`}>
                Herramientas Plus <span>{plus.length}</span>
              </h2>
              <p className={styles.estanteNota}>
                Las que CTC habilita una a una y por cuenta. {plusAbiertas > 0 && `Tu cuenta abre ${plusAbiertas}.`}
              </p>
              <CoverFlow items={plus} idPrefijo="plus" />
            </section>
          )}
        </main>
      </LangProvider>
    </div>
  );
}
