"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang, type Lang } from "@/components/lang/i18n";
import { SurfaceShell } from "@/components/services/SurfaceShell";
import { PuertasDelPortal } from "./PuertasDelPortal";
import styles from "./catalogoPublico.module.css";

// El PAQUETE PÚBLICO de un lote — lo que devuelve «Find my Lot» (V5.48).
//
// ⚠️ ESTE COMPONENTE NO LEE NADA. Recibe un objeto ya proyectado por la página
// de servidor, que es donde vive la compuerta: la vista `public_lot_catalog`
// decide si el lote existe para el público, y `fichaPublica()` (lista blanca)
// decide qué claves del `datasheet` sobreviven. Aquí solo se pinta.
//
// Es un componente de CLIENTE porque las etiquetas se traducen y `useLang()`
// lo es. Eso significa que todo lo que viaja en `LotePublico` cruza al
// navegador — exactamente igual que `SneakPeekLot` en la cinta —, así que el
// tipo de abajo es la segunda declaración de qué es público: si un campo no
// tiene dónde ponerse aquí, no puede filtrarse por descuido.

export type FilaSCA = { campo: string; valor: string | number };

export type LotePublico = {
  codigo: string;
  /** Solo para enlazar la ficha técnica completa (`/docs/ficha/[lotId]`), que
   *  aplica la MISMA lista blanca. No se muestra. */
  lotId: string;
  nombre: string;
  /** El sello del grado, desde `lib/grados/definicion.ts` — la fuente única. */
  sello: string | null;
  gradoNombre: string | null;
  /** Ya formateado con los dos decimales de la escala. */
  puntaje: string | null;
  /** El puntaje es el autorreporte del productor, no una catación aceptada. */
  puntajeEstimado: boolean;
  finca: string;
  lugar: string;
  altura: string | null;
  variedad: string | null;
  proceso: string | null;
  procesoEspecial: string | null;
  especie: string | null;
  cosecha: string | null;
  notasCata: string | null;
  sca: FilaSCA[];
  tieneFicha: boolean;
};

const T: Record<
  Lang,
  {
    volver: string;
    eyebrow: string;
    sca: string;
    estimado: string;
    notas: string;
    fichaCompleta: string;
    nota: string;
    firma: string;
    filas: Record<string, string>;
    atributos: Record<string, string>;
  }
> = {
  es: {
    volver: "← Buscar otro lote",
    eyebrow: "Paquete público del lote",
    sca: "Análisis SCA",
    estimado: "puntaje declarado por el productor, sin catación oficial",
    notas: "Notas de cata",
    fichaCompleta: "Ver la ficha técnica completa",
    nota: "Este paquete recoge los datos de exhibición del lote. Los documentos comerciales y la declaración de diligencia debida (DDS) viajan con cada despacho.",
    firma: "Registrado y exportado por Colombian Trading Company · ctcexport.com. El productor lo publica desde Kaffetal Regal; el tostador lo compra en Cherry Picked.",
    filas: {
      finca: "Finca",
      origen: "Origen",
      altura: "Altura",
      variedad: "Variedad",
      proceso: "Proceso",
      procesoEspecial: "Proceso especial",
      especie: "Especie",
      cosecha: "Cosecha",
    },
    atributos: {
      sca_fragrance: "Fragancia / Aroma",
      sca_flavor: "Sabor",
      sca_aftertaste: "Residual",
      sca_acidity: "Acidez",
      sca_body: "Cuerpo",
      sca_balance: "Balance",
      sca_uniformity: "Uniformidad",
      sca_clean_cup: "Taza limpia",
      sca_sweetness: "Dulzor",
      sca_cuppers: "Catador",
    },
  },
  en: {
    volver: "← Search another lot",
    eyebrow: "Lot's public package",
    sca: "SCA analysis",
    estimado: "score declared by the grower, without an official cupping",
    notas: "Cupping notes",
    fichaCompleta: "See the full technical sheet",
    nota: "This package holds the lot's display data. Commercial documents and the due diligence statement (DDS) travel with each shipment.",
    firma: "Recorded and exported by Colombian Trading Company · ctcexport.com. The grower publishes it from Kaffetal Regal; the roaster buys it on Cherry Picked.",
    filas: {
      finca: "Farm",
      origen: "Origin",
      altura: "Altitude",
      variedad: "Variety",
      proceso: "Process",
      procesoEspecial: "Special process",
      especie: "Species",
      cosecha: "Harvest",
    },
    atributos: {
      sca_fragrance: "Fragrance / Aroma",
      sca_flavor: "Flavour",
      sca_aftertaste: "Aftertaste",
      sca_acidity: "Acidity",
      sca_body: "Body",
      sca_balance: "Balance",
      sca_uniformity: "Uniformity",
      sca_clean_cup: "Clean cup",
      sca_sweetness: "Sweetness",
      sca_cuppers: "Cupper",
    },
  },
  de: {
    volver: "← Ein anderes Los suchen",
    eyebrow: "Öffentliches Paket des Loses",
    sca: "SCA-Analyse",
    estimado: "vom Produzenten angegebene Bewertung, ohne offizielle Verkostung",
    notas: "Verkostungsnotizen",
    fichaCompleta: "Vollständiges Datenblatt ansehen",
    nota: "Dieses Paket enthält die Ausstellungsdaten des Loses. Handelsdokumente und die Sorgfaltserklärung (DDS) reisen mit jeder Sendung.",
    firma: "Erfasst und exportiert von Colombian Trading Company · ctcexport.com. Der Produzent veröffentlicht es über Kaffetal Regal; der Röster kauft es bei Cherry Picked.",
    filas: {
      finca: "Finca",
      origen: "Herkunft",
      altura: "Höhe",
      variedad: "Varietät",
      proceso: "Aufbereitung",
      procesoEspecial: "Spezielle Aufbereitung",
      especie: "Art",
      cosecha: "Ernte",
    },
    atributos: {
      sca_fragrance: "Duft / Aroma",
      sca_flavor: "Geschmack",
      sca_aftertaste: "Nachgeschmack",
      sca_acidity: "Säure",
      sca_body: "Körper",
      sca_balance: "Balance",
      sca_uniformity: "Gleichmäßigkeit",
      sca_clean_cup: "Sauberkeit",
      sca_sweetness: "Süße",
      sca_cuppers: "Verkoster",
    },
  },
};

export function PaquetePublico({ lote }: { lote: LotePublico }) {
  const lang = useLang();
  const t = T[lang];

  const filas: [string, string | null][] = [
    [t.filas.finca, lote.finca],
    [t.filas.origen, lote.lugar],
    [t.filas.altura, lote.altura],
    [t.filas.variedad, lote.variedad],
    [t.filas.proceso, lote.proceso],
    [t.filas.procesoEspecial, lote.procesoEspecial],
    [t.filas.especie, lote.especie],
    [t.filas.cosecha, lote.cosecha],
  ];

  return (
    <SurfaceShell name="CTCx Public Catalogue">
      <article className={styles.paquete}>
        <Link className={styles.volver} href="/ctcx-public-catalogue">
          {t.volver}
        </Link>

        <header className={styles.cabeza}>
          {lote.sello && (
            <Image className={styles.sello} src={lote.sello} alt={lote.gradoNombre ?? ""} width={220} height={220} />
          )}
          <div>
            <p className={styles.codigo}>
              {t.eyebrow} · {lote.codigo}
            </p>
            <h1 className={styles.tituloLote}>{lote.nombre}</h1>
            {lote.puntaje && (
              <p className={styles.puntaje}>
                <b>{lote.puntaje}</b> SCA
                {lote.gradoNombre ? ` · ${lote.gradoNombre}` : ""}
                {lote.puntajeEstimado && <span className={styles.estimado}> · {t.estimado}</span>}
              </p>
            )}
          </div>
        </header>

        <table className={styles.tabla}>
          <tbody>
            {filas
              .filter(([, v]) => v != null && v !== "")
              .map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
          </tbody>
        </table>

        {lote.notasCata && (
          <section className={styles.bloque}>
            <h2>{t.notas}</h2>
            <p>{lote.notasCata}</p>
          </section>
        )}

        {lote.sca.length > 0 && (
          <section className={styles.bloque}>
            <h2>{t.sca}</h2>
            <table className={styles.tabla}>
              <tbody>
                {lote.sca.map((f) => (
                  <tr key={f.campo}>
                    <th scope="row">{t.atributos[f.campo] ?? f.campo}</th>
                    <td>{f.valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {lote.tieneFicha && (
          <p className={styles.bloque}>
            <Link className="btn btn-sm" href={`/docs/ficha/${lote.lotId}`}>
              {t.fichaCompleta}
            </Link>
          </p>
        )}

        <p className={styles.nota}>{t.nota}</p>

        {/* La firma, también aquí (V5.50). A esta pantalla se llega escaneando
            un código o abriendo un enlace que alguien pasó por WhatsApp — casi
            nunca desde la portada. Quien aterriza aquí necesita saber de quién
            es el dato sin tener que subir a buscarlo. */}
        <div className={styles.firma}>
          <Image
            className={styles.firmaLogo}
            src="/images/ctcx-public-catalogue/logo-ctc.webp"
            alt="Colombian Trading Company"
            width={480}
            height={264}
          />
          <p className={styles.firmaTexto}>{t.firma}</p>
        </div>

        <PuertasDelPortal compacto />
      </article>
    </SurfaceShell>
  );
}
