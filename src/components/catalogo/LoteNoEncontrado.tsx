"use client";

import { useLang, type Lang } from "@/components/lang/i18n";
import { SurfaceShell } from "@/components/services/SurfaceShell";
import { BuscadorDeLote } from "./BuscadorDeLote";
import { MarcaPortal } from "./MarcaPortal";
import { PuertasDelPortal } from "./PuertasDelPortal";
import styles from "./catalogoPublico.module.css";

// «Find my Lot» cuando la referencia no lleva a ningún lote (V5.199). Hasta aquí un 404 del portal era la página genérica del
// framework, en inglés y sin salida: quien llegó con una etiqueta en la mano se quedaba sin saber si se equivocó al escribir o si
// el lote todavía no está. Ahora lo dice, en los tres idiomas, y le deja el buscador y las puertas del portal a mano. Sigue
// respondiendo 404 (lo pinta `not-found.tsx` de la ruta): para un buscador, una referencia que no existe no es una página.

const T: Record<Lang, { titulo: string; texto: string; cierre: string }> = {
  es: {
    titulo: "No encontramos ese lote",
    texto: "Revise los ocho caracteres que siguen a «CTC-L-» en la etiqueta o en el Dossier. Si el lote todavía está en evaluación, aparecerá aquí cuando llegue al Catálogo Activo de CTCx.",
    cierre: "¿Buscaba otra cosa?",
  },
  en: {
    titulo: "We could not find that lot",
    texto: "Check the eight characters that follow «CTC-L-» on the label or in the Dossier. If the lot is still being evaluated, it will appear here once it reaches the CTCx Active Catalogue.",
    cierre: "Looking for something else?",
  },
  de: {
    titulo: "Dieses Los haben wir nicht gefunden",
    texto: "Prüfen Sie die acht Zeichen nach «CTC-L-» auf dem Etikett oder im Dossier. Wenn das Los noch bewertet wird, erscheint es hier, sobald es den aktiven Katalog von CTCx erreicht.",
    cierre: "Suchen Sie etwas anderes?",
  },
};

export function LoteNoEncontrado() {
  const lang = useLang();
  const t = T[lang];
  return (
    <SurfaceShell name="CTCx Public Catalogue">
      <section className={styles.hero}>
        <div className="wrap">
          <div className={styles.heroTexto}>
            <div className={styles.marcaFila}>
              <MarcaPortal size={34} />
              <p className={styles.eyebrow}>Find my Lot</p>
            </div>
            <h1 className={styles.titulo}>{t.titulo}</h1>
            <p className={styles.sub}>{t.texto}</p>
            <BuscadorDeLote />
          </div>
        </div>
      </section>
      <section className={styles.cierre}>
        <div className="wrap">
          <h2 className={styles.h2}>{t.cierre}</h2>
          <PuertasDelPortal />
        </div>
      </section>
    </SurfaceShell>
  );
}
