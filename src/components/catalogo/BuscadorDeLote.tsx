"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang, type Lang } from "@/components/lang/i18n";
import { PREFIJO_REFERENCIA, cuerpoDeReferencia, normalizaReferencia, rutaDelLote } from "@/lib/catalogo/codigoPublico";
import styles from "./catalogoPublico.module.css";

// «Find my Lot» · el buscador del portal público (V5.48; V5.199 por la REFERENCIA del lote).
//
// V5.199 (owner, 2026-10-10): «"Find my Lot" […] con la cual debo escribir solo los 8 dígitos después de "CTC-L-"». El prefijo va
// FIJO delante del campo y quien busca escribe solo los ocho caracteres que el lote lleva en la etiqueta de la muestra y en su
// Dossier. Si pega la referencia entera (con «CTC-L-»), el campo se queda con los ocho. Encuentra los lotes que llegaron al Triage
// de Catálogo Activo (la vista `public_lot_vitrina`), estén o no declarados todavía.
//
// POR QUÉ VALIDA EN EL CLIENTE Y NO EN UNA SERVER ACTION. `normalizaReferencia()` es una función PURA: decir «eso no es una
// referencia» no necesita ni base de datos ni red, y con una Server Action cada errata costaría un POST y un re-render. Además la
// landing que lo monta se rinde estática (`superficieConOverrides` existe justamente para eso).
//
// LO QUE SE RENUNCIA, Y POR QUÉ NO DUELE: sin JavaScript este campo no navega. El repuesto ya existe: la ruta
// `/ctcx-public-catalogue/[codigo]` CANONIZA sola (minúsculas, sin guiones, con o sin el prefijo), así que una referencia tecleada en
// la barra de direcciones llega igual. La compuerta de verdad no está aquí: está en la vista que consulta la ruta de destino.

const T: Record<Lang, { etiqueta: string; marcador: string; boton: string; ayuda: string; error: string }> = {
  es: {
    etiqueta: "Referencia del lote: los ocho caracteres después de CTC-L-",
    marcador: "XXXXXXXX",
    boton: "Buscar",
    ayuda: "Escriba los ocho caracteres que siguen a «CTC-L-» en la etiqueta de la muestra o en el Dossier del lote. Da igual si van en minúsculas.",
    error: "Esa referencia no está completa: son ocho caracteres (cifras y letras de la A a la F) después de «CTC-L-».",
  },
  en: {
    etiqueta: "Lot reference: the eight characters after CTC-L-",
    marcador: "XXXXXXXX",
    boton: "Search",
    ayuda: "Type the eight characters that follow «CTC-L-» on the sample label or in the lot's Dossier. Lower case is fine.",
    error: "That reference is not complete: it is eight characters (digits and letters A to F) after «CTC-L-».",
  },
  de: {
    etiqueta: "Losreferenz: die acht Zeichen nach CTC-L-",
    marcador: "XXXXXXXX",
    boton: "Suchen",
    ayuda: "Geben Sie die acht Zeichen ein, die auf dem Probenetikett oder im Dossier des Loses auf «CTC-L-» folgen. Kleinbuchstaben sind kein Problem.",
    error: "Diese Referenz ist unvollständig: Es sind acht Zeichen (Ziffern und Buchstaben A bis F) nach «CTC-L-».",
  },
};

export function BuscadorDeLote() {
  const lang = useLang();
  const t = T[lang];
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [malo, setMalo] = useState(false);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const referencia = normalizaReferencia(valor);
    if (!referencia) {
      setMalo(true);
      return;
    }
    router.push(`${rutaDelLote(referencia)}${lang === "es" ? "" : "?lang=en"}`);
  }

  return (
    <form className={styles.buscador} onSubmit={buscar} noValidate>
      <div className={styles.campo}>
        <div className={styles.entradaConPrefijo} data-invalido={malo || undefined}>
          <span className={styles.prefijo} aria-hidden>
            {PREFIJO_REFERENCIA}
          </span>
          <input
            id="codigo-lote"
            className={styles.entrada}
            name="referencia"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={t.marcador}
            aria-label={t.etiqueta}
            value={valor}
            aria-invalid={malo}
            aria-describedby={malo ? "codigo-lote-error" : "codigo-lote-ayuda"}
            onChange={(e) => {
              setValor(cuerpoDeReferencia(e.target.value));
              // El error se va en cuanto se sigue escribiendo: un mensaje que se queda mientras el campo ya cambió acusa a lo que no es.
              if (malo) setMalo(false);
            }}
          />
        </div>
        <button className={`btn btn-solid ${styles.boton}`} type="submit">
          {t.boton}
        </button>
      </div>
      {malo ? (
        <p id="codigo-lote-error" className={styles.error} role="alert">
          {t.error}
        </p>
      ) : (
        <p id="codigo-lote-ayuda" className={styles.ayuda}>
          {t.ayuda}
        </p>
      )}
    </form>
  );
}
