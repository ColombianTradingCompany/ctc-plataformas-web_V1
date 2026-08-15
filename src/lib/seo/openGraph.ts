import type { Metadata } from "next";
import { WWW_ORIGIN } from "@/lib/red/subdominios";
import { overridesDeSuperficies } from "./superficies";

// ── Open Graph · la tarjeta con la que cada superficie viaja ─────────────────
// (2026-08-13) Hasta hoy la red compartía enlaces DESNUDOS: WhatsApp, LinkedIn
// y Slack no encontraban ni og:title ni og:image, así que pegar
// kaffetal-regal.ctcexport.com en un grupo de productores producía una línea
// gris con la URL. Nada más. Con dieciocho subdominios y un negocio que se
// mueve por WhatsApp, eso era la primera impresión de la plataforma.
//
// El protocolo (https://ogp.me) pide cuatro propiedades obligatorias —
// og:title, og:type, og:image y og:url— y aquí se cumplen las cuatro SIEMPRE:
// esta función es la única puerta por la que una superficie declara su tarjeta,
// así que ninguna puede quedarse a medias.
//
// ── LAS TRES DECISIONES QUE NO SON OBVIAS ───────────────────────────────────
//
// 1. EL CANONICAL ES LA CASA MATRIZ (decisión del owner, 2026-08-15). Toda
//    superficie responde 200 por DOS URLs: su subdominio y su ruta bajo www
//    (www.ctcexport.com/cherry-picked-green existe). Alguien tiene que mandar, o
//    los buscadores ven dos páginas idénticas y parten la autoridad entre las
//    dos.
//
//    Hasta hoy mandaba el SUBDOMINIO. Se invirtió: **manda `www` y la ruta**.
//    El motivo es que Google trata cada subdominio como un SITIO APARTE, así que
//    con dieciocho subdominios la reputación se repartía en dieciocho montones
//    pequeños y cada superficie tenía que ganársela desde cero. Consolidando,
//    cada enlace que reciba cualquier superficie alimenta UN dominio. Para un
//    dominio joven y con pocos enlaces entrantes, ésa es la palanca grande.
//
//    Lo que NO cambia: los subdominios siguen sirviendo, siguen siendo la
//    dirección amable que se pone en una tarjeta y siguen enrutando igual. Solo
//    dejan de competir con el padre por el crédito.
//
// 2. POR ESO `metadataBase` ES `WWW_ORIGIN`. Antes era el subdominio, para que
//    cada superficie resolviera su og:image y su canonical en su propio origen.
//    Con el canonical en www eso se da la vuelta solo: la tarjeta, el og:url y
//    el canonical tienen que decir todos la MISMA dirección, o se comparte una
//    URL y se indexa otra. `origenDeSuperficie()` sigue existiendo y sigue
//    siendo la fuente del mapa — simplemente ya no la usa este archivo.
//    En desarrollo el origen es localhost y se llega por la ruta: mismo
//    desdoblamiento que FAMILY_LINKS, y por la misma razón — NODE_ENV es
//    constante de compilación en servidor y cliente, así que no puede
//    desincronizar la hidratación.
//
// 3. LAS TARJETAS SON JPEG, NO WEBP. WhatsApp —el canal por el que de verdad
//    circulan estos enlaces en Colombia— no previsualiza WebP de forma fiable y
//    descarta imágenes grandes. Las tarjetas se generan a 1200×630 (la
//    proporción 1.91:1 que pide el protocolo) y por debajo de 300 KB.

/** Superficie pública: lo que hace falta para firmar su tarjeta. */
type Entrada = {
  /** La ruta interna que la sirve — la MISMA con la que aparece en
   *  `SUBDOMAIN_ROUTES`. De ella sale el origen y el canonical. */
  route: string;
  title: string;
  description: string;
  /** El nombre de la casa a la que pertenece la superficie. Es lo que el lector
   *  ve en pequeño encima del título en LinkedIn y Slack. */
  siteName: string;
  /** Archivo bajo `public/images/og/`. Solo el nombre. */
  image: string;
  /** Texto alternativo de la tarjeta. Obligatorio: una tarjeta sin `alt` es una
   *  imagen muda para quien navega con lector de pantalla. */
  imageAlt: string;
  /** Idioma en el que está ESCRITA la superficie (og:locale). Por defecto el
   *  español de Colombia: la mayoría de la red le habla al productor. */
  locale?: string;
  /** Los otros idiomas en los que la misma superficie se puede leer. La familia
   *  Cherry Picked es trilingüe (i18n.tsx); Kaffetal Regal, no. */
  alternateLocale?: string[];
};

const DEV = process.env.NODE_ENV === "development";

/** Los metadatos completos de una superficie pública: título, descripción,
 *  canonical, Open Graph y la tarjeta de Twitter/X, todo coherente entre sí. */
export function metadatosDeSuperficie(e: Entrada): Metadata {
  const origen = DEV ? "http://localhost:3000" : WWW_ORIGIN;
  // La ruta interna ES la dirección canónica bajo la casa matriz: `/directorio`
  // resuelve a https://www.ctcexport.com/directorio. CTC Home tiene `route: "/"`
  // y resuelve a la raíz. En desarrollo la ruta es la misma, colgada de
  // localhost, así que esta línea no necesita desdoblarse.
  const canonical = e.route;
  const imagen = `/images/og/${e.image}`;

  return {
    metadataBase: new URL(origen),
    title: e.title,
    description: e.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: e.siteName,
      title: e.title,
      description: e.description,
      locale: e.locale ?? "es_CO",
      ...(e.alternateLocale ? { alternateLocale: e.alternateLocale } : {}),
      images: [
        {
          url: imagen,
          width: 1200,
          height: 630,
          alt: e.imageAlt,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      // `summary_large_image` es la tarjeta ancha. Con `summary` a secas la
      // imagen se recorta a un cuadrado pequeño y se pierde el logotipo.
      card: "summary_large_image",
      title: e.title,
      description: e.description,
      images: [imagen],
    },
  };
}

// ── La capa de Manejo de Plataformas (2026-08-15) ────────────────────────────
// Lo de arriba sigue siendo la ficha que declara el CÓDIGO. Lo de abajo la pasa
// por las excepciones que el owner haya escrito en ECP → Direccionamiento →
// Manejo de Plataformas antes de entregarla.
//
// La forma es deliberada: `superficieConOverrides(entrada)` devuelve la FUNCIÓN
// que Next espera en `generateMetadata`, así que convertir una superficie fue
// cambiar `export const metadata =` por `export const generateMetadata =` y
// nada más — mismo argumento, mismo sitio, sin tocar el contenido de ninguna
// ficha. Una migración de catorce archivos que no puede equivocarse de dato.

/** Aplica las excepciones del panel sobre la ficha declarada en el código. */
export async function metadatosDeSuperficieAsync(e: Entrada): Promise<Metadata> {
  const overrides = await overridesDeSuperficies();
  const o = overrides[e.route];
  // Cadena vacía cuenta como «no escrito»: guardar un título en blanco no debe
  // dejar la superficie sin título, debe devolverla a lo que dice el código.
  return metadatosDeSuperficie({
    ...e,
    title: o?.title?.trim() || e.title,
    description: o?.description?.trim() || e.description,
  });
}

/** Lo que una `page.tsx` exporta como `generateMetadata`. */
export function superficieConOverrides(e: Entrada): () => Promise<Metadata> {
  return () => metadatosDeSuperficieAsync(e);
}
