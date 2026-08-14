import type { Metadata } from "next";
import { origenDeSuperficie } from "@/lib/red/subdominios";

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
// 1. `metadataBase` ES EL SUBDOMINIO, NO LA CASA MATRIZ. Cada superficie vive
//    en su propio origen (src/lib/red/subdominios.ts) y ahí es donde tiene que
//    resolver su og:image y su canonical. Si todas heredaran www, la tarjeta de
//    Cherry Picked pediría la imagen a ctcexport.com y el canonical mandaría el
//    posicionamiento de la tienda a la home. En desarrollo el origen es
//    localhost y las rutas son de ruta, no de subdominio — mismo desdoblamiento
//    que FAMILY_LINKS, y por la misma razón: NODE_ENV es constante de
//    compilación en servidor y cliente, así que no puede desincronizar la
//    hidratación.
//
// 2. EL CANONICAL RESUELVE EL CONTENIDO DUPLICADO QUE YA TENÍAMOS. Toda
//    superficie es alcanzable por DOS URLs: su subdominio y su ruta bajo www
//    (www.ctcexport.com/cherry-picked-green existe y responde 200). Sin
//    canonical, los buscadores ven dos páginas idénticas y reparten la
//    autoridad entre las dos. Con él, la del subdominio manda.
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
  const origen = DEV ? "http://localhost:3000" : origenDeSuperficie(e.route);
  // En producción la superficie ES la raíz de su subdominio; en desarrollo se
  // llega por la ruta. La barra suelta para `/` evita un canonical "" vacío.
  const canonical = DEV ? e.route : "/";
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
