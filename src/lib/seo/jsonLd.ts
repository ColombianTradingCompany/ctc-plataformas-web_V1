import { NIT, CTC_RAZON, CTC_EMAIL } from "@/lib/legal";
import { GRADOS } from "@/lib/grados/definicion";
import { FAQ } from "@/lib/kaffetal/faq";
import { WWW_ORIGIN } from "@/lib/red/subdominios";

// ── Datos estructurados (JSON-LD) ────────────────────────────────────────────
// (2026-08-14) La red no declaraba NINGUNO — cero schema.org en todo el repo.
// Importa por dos motivos distintos que conviene no confundir:
//
//   · Para GOOGLE, es lo que convierte una página en una ficha con cara: el
//     panel de la empresa, las preguntas desplegables bajo el resultado.
//   · Para los MODELOS DE LENGUAJE, es lo más parecido a hablarles en su idioma:
//     un hecho declarado en un formato sin ambigüedad. La ventaja real de esta
//     casa no es técnica — es que produce hechos verificables (puntajes de
//     catación, rangos SCA, trazabilidad, NIT) en un sector donde casi todo el
//     contenido es marketing. Esto es lo que los saca del HTML y los deja
//     citables.
//
// REGLA DE LA CASA: aquí NO se escribe ningún dato. Todo sale de la fuente
// única que ya lo posee — `lib/legal.ts` (identidad legal), `lib/grados/
// definicion.ts` (los cinco grados y sus rangos) y `lib/kaffetal/faq.ts` (las
// 12 preguntas). Si un dato se escribiera aquí, tendríamos otra vez el problema
// que `legal.ts` vino a resolver: el NIT en cuatro sitios.

/** El identificador estable de la empresa en el grafo. Es una URI, no una URL
 *  que se visite: sirve para que cualquier otra ficha (una página, una marca)
 *  pueda decir «esto pertenece a ESA empresa» sin repetir sus datos. Va SIEMPRE
 *  al dominio raíz aunque la superficie viva en un subdominio — la empresa es
 *  una sola. */
export const ORG_ID = `${WWW_ORIGIN}/#organization`;

/** El NIT sin el prefijo: `taxID` espera el número, no la etiqueta. */
const TAX_ID = NIT.replace(/^NIT\s*/i, "");

type Json = Record<string, unknown>;

/** La empresa. Es la ficha que sostiene a todas las demás. */
export function organizationLd(): Json {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: CTC_RAZON,
    alternateName: "CTC",
    legalName: CTC_RAZON,
    taxID: TAX_ID,
    url: WWW_ORIGIN,
    email: CTC_EMAIL,
    logo: `${WWW_ORIGIN}/images/shared/ctc-logo-full.png`,
    image: `${WWW_ORIGIN}/images/og/ctc-home.jpg`,
    description:
      "Exportador colombiano de café verde de especialidad con trazabilidad de finca a taza: cada lote se registra con su finca georreferenciada, se califica a ciegas ante Q-Graders bajo protocolo SCA y viaja a Europa con su declaración de debida diligencia EUDR resuelta.",
    // `knowsAbout` es la propiedad que más rinde de cara a un modelo: es la
    // lista explícita de en qué es competente esta empresa. Son los temas por
    // los que tiene sentido que alguien la encuentre, no palabras clave sueltas.
    knowsAbout: [
      "Café verde de especialidad",
      "Exportación de café colombiano",
      "Catación bajo protocolo SCA",
      "Trazabilidad de finca a taza",
      "Reglamento EUDR de la Unión Europea",
      "Microlotes de café por fracciones",
      "Café de Santander, Colombia",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Piedecuesta",
      addressRegion: "Santander",
      addressCountry: "CO",
    },
    areaServed: [
      { "@type": "Country", name: "Colombia" },
      { "@type": "Place", name: "Unión Europea" },
      { "@type": "Country", name: "Estados Unidos" },
    ],
    // Las dos marcas de la casa. Declararlas aquí es lo que permite que una
    // búsqueda por «Kaffetal Regal» se conecte con la empresa que hay detrás.
    brand: [
      {
        "@type": "Brand",
        name: "Kaffetal Regal",
        description: "El portal del caficultor colombiano: registro de finca y lote, Jornada de Arena y contrato con prima indexada.",
      },
      {
        "@type": "Brand",
        name: "Cherry Picked",
        description: "La plataforma de compra: microlotes colombianos trazados para tostadores europeos.",
      },
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: CTC_EMAIL,
      contactType: "sales",
      availableLanguage: ["es", "en", "de"],
    },
  };
}

/** El sitio. Solo lo emite la casa matriz: hay una empresa y un sitio raíz. */
export function webSiteLd(): Json {
  return {
    "@type": "WebSite",
    "@id": `${WWW_ORIGIN}/#website`,
    url: WWW_ORIGIN,
    name: "Colombian Trading Company",
    inLanguage: "es-CO",
    publisher: { "@id": ORG_ID },
  };
}

/** Las 12 preguntas de Kaffetal Regal como FAQPage.
 *
 *  Se publica el ESPAÑOL a propósito: la landing es trilingüe pero el idioma
 *  se elige en el cliente, así que el servidor —y por tanto el rastreador—
 *  siempre ve español. Publicar otro idioma sería declarar algo que no está
 *  en la página que el buscador leyó. */
export function faqPageLd(): Json {
  const t = FAQ.es;
  return {
    "@type": "FAQPage",
    inLanguage: "es-CO",
    publisher: { "@id": ORG_ID },
    mainEntity: t.groups.flatMap((g) =>
      g.items.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: {
          "@type": "Answer",
          // La respuesta completa, no un resumen: la entradilla y sus puntos,
          // que es exactamente lo que ve quien abre la ficha en la página.
          text: [f.lead, ...f.bullets].join(" "),
        },
      }))
    ),
  };
}

/** Los Grados de Calidad como VOCABULARIO, no como catálogo.
 *
 *  `DefinedTermSet` y no `Product`/`Offer` a propósito: los grados no son cinco
 *  cosas a la venta con un precio, son los cinco términos de una escala que
 *  esta casa define y aplica. Esa es la figura que schema.org tiene para un
 *  vocabulario propio, y es la que un modelo puede citar sin equivocarse
 *  («CTC define Blue como 84–85.99 SCA») en vez de inventar un precio. */
export function gradosLd(): Json {
  return {
    "@type": "DefinedTermSet",
    "@id": `${WWW_ORIGIN}/#grados-ctc`,
    name: "Grados de Calidad CTC",
    description:
      "La escala de cinco grados con la que Colombian Trading Company clasifica un café de especialidad. El grado lo determina el puntaje SCA obtenido en catación a ciegas ante Q-Graders: no se negocia ni lo elige un comité después.",
    inLanguage: "es-CO",
    creator: { "@id": ORG_ID },
    hasDefinedTerm: GRADOS.map((g) => ({
      "@type": "DefinedTerm",
      name: g.nombre,
      termCode: g.id,
      inDefinedTermSet: { "@id": `${WWW_ORIGIN}/#grados-ctc` },
      description: `${g.lema}. Puntaje SCA de ${g.scaMin} a ${g.scaMax}. Clase de lote: ${g.claseLote.toLowerCase()}. ${g.variedad}.`,
      image: `${WWW_ORIGIN}/images/shared/grados/${g.id}.webp`,
    })),
  };
}

/** Envuelve las fichas de una superficie en UN solo grafo.
 *
 *  Un `@graph` y no varios `<script>` sueltos: así las referencias por `@id`
 *  entre fichas (la FAQ apunta a la empresa, los grados apuntan a la empresa)
 *  se resuelven dentro del mismo documento, que es como schema.org espera que
 *  se declare más de una cosa sobre una misma página. */
export function graphLd(nodes: Json[]): Json {
  return { "@context": "https://schema.org", "@graph": nodes };
}
