"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang, type Lang } from "@/components/lang/i18n";
import { normalizaCodigo, rutaDelCodigo } from "@/lib/catalogo/codigoPublico";
import styles from "./catalogoPublico.module.css";

// «Find my Lot» · el buscador del portal público (V5.48).
//
// POR QUÉ VALIDA EN EL CLIENTE Y NO EN UNA SERVER ACTION. `normalizaCodigo()`
// es una función PURA: decir «eso no es un código» no necesita ni base de datos
// ni red, y con una Server Action cada errata costaría un POST y un re-render.
// Además la landing que lo monta se rinde estática (`superficieConOverrides`
// existe justamente para eso), y leer `searchParams` para pintar un error la
// volvería dinámica a cambio de nada.
//
// LO QUE SE RENUNCIA, Y POR QUÉ NO DUELE: sin JavaScript este campo no navega.
// El repuesto ya existe y no hay que construirlo — la ruta
// `/ctcx-public-catalogue/[codigo]` CANONIZA sola (minúsculas, sin guiones, con
// o sin prefijo, y las tres letras que se confunden con cifras), así que un
// código tecleado directamente en la barra de direcciones llega igual. Si algún
// día hace falta el camino sin JS, es una Server Action de tres líneas cuyo
// cuerpo entero es `redirect(...)`, sin base de datos y fuera de todo try.
//
// La compuerta de verdad no está aquí: está en la vista `public_lot_catalog`
// que consulta la ruta de destino. Este campo no autoriza nada.

const T: Record<
  Lang,
  { etiqueta: string; marcador: string; boton: string; ayuda: string; error: string }
> = {
  es: {
    etiqueta: "Código del lote",
    marcador: "CTCX-XXXX-XXXX",
    boton: "Buscar",
    ayuda:
      "El código va impreso en la bolsa y en la ficha del lote. Da igual si lo escribe en minúsculas o sin guiones.",
    error: "Ese no parece un código de lote. Son ocho caracteres, con o sin el prefijo CTCX.",
  },
  en: {
    etiqueta: "Lot code",
    marcador: "CTCX-XXXX-XXXX",
    boton: "Search",
    ayuda: "The code is printed on the bag and on the lot's sheet. Lower case or no dashes is fine.",
    error: "That doesn't look like a lot code. It's eight characters, with or without the CTCX prefix.",
  },
  de: {
    etiqueta: "Losnummer",
    marcador: "CTCX-XXXX-XXXX",
    boton: "Suchen",
    ayuda:
      "Der Code steht auf dem Beutel und auf dem Datenblatt des Loses. Kleinbuchstaben oder fehlende Bindestriche sind kein Problem.",
    error: "Das sieht nicht nach einer Losnummer aus. Es sind acht Zeichen, mit oder ohne das Präfix CTCX.",
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
    const codigo = normalizaCodigo(valor);
    if (!codigo) {
      setMalo(true);
      return;
    }
    router.push(rutaDelCodigo(codigo));
  }

  return (
    <form className={styles.buscador} onSubmit={buscar} noValidate>
      <label className="sr-only" htmlFor="codigo-lote">
        {t.etiqueta}
      </label>
      <div className={styles.campo}>
        <input
          id="codigo-lote"
          className={styles.entrada}
          name="codigo"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={t.marcador}
          value={valor}
          aria-invalid={malo}
          aria-describedby={malo ? "codigo-lote-error" : "codigo-lote-ayuda"}
          onChange={(e) => {
            setValor(e.target.value);
            // El error se va en cuanto se sigue escribiendo: un mensaje que se
            // queda mientras el campo ya cambió acusa a lo que no es.
            if (malo) setMalo(false);
          }}
        />
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
