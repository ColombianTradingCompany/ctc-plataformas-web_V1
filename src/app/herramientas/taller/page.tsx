import Link from "next/link";
import { redirect } from "next/navigation";
import { LangProvider } from "@/components/lang/i18n";
import { superficieConOverrides } from "@/lib/seo/openGraph";
import { cargarTaller } from "@/lib/tools/taller";
import { TallerBarra } from "@/components/tools/TallerBarra";
import { CapturaMiniatura } from "@/components/tools/CapturaMiniatura";
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

  return (
    <div data-theme="ctc-home">
      <LangProvider storageKey="ctc-lang">
        <TallerBarra email={taller.email} />
        <main className={styles.marco}>
          <header className={styles.cabeza}>
            <h1>El taller</h1>
            <p>
              Las herramientas de trabajo de la red, con tu cuenta. Las marcadas «con memoria» guardan tus trabajos —
              con nombre y fecha — para retomarlos desde cualquier equipo. Las Plus se activan por solicitud: pídelas
              desde su propia página y CTC las habilita en tu cuenta.
            </p>
          </header>

          {!taller.esMiembro && (
            <p className={styles.avisoMembresia}>
              Tu cuenta todavía no es de productor (Kaffetal Regal), comprador (Cherry Picked) ni experto del
              Directorio del Café — que son las tres puertas que abren las herramientas. Completa tu perfil en la que
              te corresponda y vuelve.
            </p>
          )}

          <div className={styles.rejilla}>
            {taller.herramientas.map((h) => (
              <Link key={h.id} href={`/herramientas/taller/${h.id}?volver=${encodeURIComponent("/herramientas/taller")}`} className={styles.tarjeta}>
                <CapturaMiniatura toolId={h.id} className={styles.miniatura} />
                <div className={styles.fila}>
                  <h2>{h.nombre}</h2>
                  {h.esPlus && (
                    <span className={`${styles.sello} ${h.veredicto.abre ? styles.selloAbre : styles.selloPlus}`}>
                      {h.veredicto.abre ? "Plus · activa" : "Plus"}
                    </span>
                  )}
                  {h.soportaMemoria && <span className={`${styles.sello} ${styles.selloMemoria}`}>Con memoria</span>}
                </div>
                <p>{h.descripcion}</p>
                <div className={styles.pie}>
                  <span>{h.veredicto.abre ? "Abrir →" : h.veredicto.motivo === "sin-permiso" ? "Ver y solicitar →" : "Ver →"}</span>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </LangProvider>
    </div>
  );
}
