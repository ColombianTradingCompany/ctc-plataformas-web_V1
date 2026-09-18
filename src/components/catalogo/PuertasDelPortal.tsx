"use client";

import { useContactModal } from "@/components/ctc-home/ContactModal";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./catalogoPublico.module.css";

// Las TRES puertas del portal público (V5.48): al productor (Kaffetal Regal),
// al comprador (Cherry Picked) y a nosotros (el «Escríbenos» de la casa).
//
// El tercer botón NO es un formulario nuevo: abre el `ContactModal` que ya
// existe, con `openForm("general")` — el que trae el selector de Tema completo
// (consulta general, vender, comprar, CTC Tech, CaaS, Varietales, logística,
// red, prensa). Un formulario propio aquí sería un cuarto sitio donde un lead
// puede caer sin tablero que lo mire: `leads.pillar` tiene un CHECK con cuatro
// valores y cada uno tiene su tablero en una consola distinta.
//
// Se monta en las DOS pantallas del portal (el pivote y el paquete del lote),
// así que vive aparte: si mañana cambia un destino, cambia en las dos a la vez.

// Los dos destinos son SUPERFICIES CON SUBDOMINIO, así que en producción se
// enlazan absolutos y en desarrollo por su ruta. Es el mismo desdoblamiento de
// `ContactModal.tsx` y `SurfaceShell.tsx`, y por la misma razón: `NODE_ENV` es
// constante de compilación en servidor y cliente, así que no puede desincronizar
// la hidratación.
const PROD = process.env.NODE_ENV === "production";
const U = (sub: string, path: string) => (PROD ? `https://${sub}.ctcexport.com` : path);

const KR = U("kaffetal-regal", "/kaffetal-regal");
// La PORTADA de Cherry Picked, que reparte sus cuatro programas (CaaS, Green,
// Roast y X) — no la tienda Green directamente: quien llega aquí desde una
// bolsa todavía no ha elegido por dónde compra.
const CP = U("cherry-picked", "/cherry-picked");

const T: Record<Lang, { kr: string; cp: string; escribir: string; nota: string }> = {
  es: {
    kr: "Soy productor · Kaffetal Regal",
    cp: "Quiero comprar · Cherry Picked",
    escribir: "Escríbenos",
    nota: "Kaffetal Regal es la puerta del productor; Cherry Picked, la del tostador.",
  },
  en: {
    kr: "I grow coffee · Kaffetal Regal",
    cp: "I want to buy · Cherry Picked",
    escribir: "Write to us",
    nota: "Kaffetal Regal is the grower's door; Cherry Picked, the roaster's.",
  },
  de: {
    kr: "Ich bin Produzent · Kaffetal Regal",
    cp: "Ich möchte kaufen · Cherry Picked",
    escribir: "Schreiben Sie uns",
    nota: "Kaffetal Regal ist die Tür des Produzenten; Cherry Picked die des Rösters.",
  },
};

export function PuertasDelPortal({ compacto = false }: { compacto?: boolean }) {
  const lang = useLang();
  const t = T[lang];
  const { openForm } = useContactModal();
  const tam = compacto ? " btn-sm" : "";

  return (
    <>
      <div className={styles.puertas}>
        <a className={`btn btn-solid${tam}`} href={KR}>
          {t.kr}
        </a>
        <a className={`btn${tam}`} href={CP}>
          {t.cp}
        </a>
        <button className={`btn btn-solid-accent${tam}`} type="button" onClick={() => openForm("general")}>
          {t.escribir}
        </button>
      </div>
      {!compacto && <p className={styles.puertasNota}>{t.nota}</p>}
    </>
  );
}
