import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { normalizaCodigo, normalizaReferencia, rutaDelLote } from "@/lib/catalogo/codigoPublico";
import { cargaDossierPublico, filaDeLaVitrina, referenciaDeCodigoViejo } from "@/lib/catalogo/vitrina";
import { regionDeLaVitrina, tramoDeAltitud } from "@/lib/catalogo/vitrinaVista";
import { metadatosDeSuperficie } from "@/lib/seo/openGraph";
import { DossierCtcx } from "@/components/kaffetal-regal/dossier/DossierCtcx";

export const dynamic = "force-dynamic";

// El lote en el CTCx Public Catalogue: su DOSSIER PÚBLICO (V5.198), resuelto por su referencia `CTC-L-XXXXXXXX`.
//
// V5.198 (owner, 2026-10-10): «El Datasheet va a ser reemplazado por una versión simplificada del Dossier que omite los enlaces
// al pasaporte y la visa» y «Find my Lot […] debo escribir solo los 8 dígitos después de "CTC-L-"; ya deben ser encontrados los
// lotes que ya están en el Triage». Hasta la V5.197 esta ruta pintaba el «paquete público» (`PaquetePublico`) de un lote
// PUBLICADO, buscado por su código `CTCX-XXXX-XXXX`; desde aquí pinta el Dossier público de cualquier lote que llegó al Triage.
//
// ⚠️ LA COMPUERTA ES LA VISTA, NO EL CÓDIGO. `lib/catalogo/vitrina.ts` consulta `public_lot_vitrina` con el cliente anónimo; si el
// lote no asoma por ella, esto responde 404 aunque la referencia exista. El dossier se lee DESPUÉS, con el service role, y lo que
// llega al documento es la proyección de `dossierPublico()` (lista blanca, `qa-ficha-publica`). Y la referencia NO es una
// credencial (`lib/catalogo/codigoPublico.ts`, nota 1): lo que se enseña con ella es lo que cualquiera puede ver.
//
// Un código VIEJO (`CTCX-…`, impreso desde la V5.48) se resuelve contra la vista pública del catálogo —nunca contra `lots`— y
// redirige con 308 a la referencia. Una referencia mal escrita (minúsculas, sin guiones) también se canoniza con 308.
// `force-dynamic` y sin `generateStaticParams`: un lote entra al Triage sin desplegar.

type Canonico = { tipo: "lote" | "viejo"; codigo: string } | null;

/** Lo que la ruta entiende del segmento: una referencia (`CTC-L-…`, o sus ocho caracteres) o un código viejo (`CTCX-…`). */
function canonico(segmento: string): Canonico {
  const s = decodeURIComponent(segmento);
  if (/^\s*ctcx/i.test(s)) {
    const viejo = normalizaCodigo(s);
    return viejo ? { tipo: "viejo", codigo: viejo } : null;
  }
  const referencia = normalizaReferencia(s);
  return referencia ? { tipo: "lote", codigo: referencia } : null;
}

const fila = cache(filaDeLaVitrina);
const dossier = cache(cargaDossierPublico);

// `generateMetadata` NO llama a `notFound()` ni redirige — de eso se encarga la página. Un código desconocido devuelve `{}`.
export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }): Promise<Metadata> {
  const { codigo } = await params;
  const c = canonico(codigo);
  if (!c || c.tipo !== "lote") return {};
  const lote = await fila(c.codigo);
  if (!lote) return {};
  // V5.202 (owner, 2026-10-10): lo público omite lo que lleva al productor. El título y la descripción (que repiten la vista previa
  // al compartir el enlace: og:title, og:description, la tarjeta de Twitter) dicen la REGIÓN, nunca la finca ni el municipio, y el
  // nombre es el PÚBLICO que genera la vista (variedades + proceso · región + año). Tras la revisión del nodo final, la altitud va
  // en su tramo de 100 m («1.700–1.800 m»; la vista ya la entrega redondeada hacia abajo).
  const origen = regionDeLaVitrina(lote);
  return metadatosDeSuperficie({
    // El canonical es la ruta COMPLETA del lote: firmar la del portal dejaría a todos los lotes con la misma página canónica.
    route: rutaDelLote(lote.referencia),
    title: `${lote.nombre} · ${lote.referencia} · CTCx`,
    description: [origen, tramoDeAltitud(lote.altitud_m), lote.variedad, lote.proceso, lote.punto != null ? `${Number(lote.punto).toFixed(2)} ${lote.protocolo === "sca2004" ? "SCA" : "CVA"}` : null].filter(Boolean).join(" · "),
    siteName: "Colombian Trading Company",
    image: "ctcx-public-catalogue.jpg",
    imageAlt: "Patio de secado de café en Santander con «Find my Lot» y el logotipo de Colombian Trading Company",
    alternateLocale: ["en_GB", "de_DE"],
  });
}

export default async function DossierPublicoPage({ params, searchParams }: { params: Promise<{ codigo: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { codigo } = await params;
  const lang = (await searchParams).lang === "en" ? "en" : "es";

  // El orden importa, y cada paso queda FUERA de cualquier try/catch: `notFound()` y `permanentRedirect()` lanzan errores de
  // control de flujo que Next tiene que ver. Se canoniza ANTES de consultar: una URL mal escrita no cuesta un viaje a la base.
  const c = canonico(codigo);
  if (!c) notFound();
  if (c.tipo === "viejo") {
    const referencia = await referenciaDeCodigoViejo(c.codigo);
    if (!referencia) notFound();
    permanentRedirect(rutaDelLote(referencia));
  }
  if (c.codigo !== codigo) permanentRedirect(`${rutaDelLote(c.codigo)}${lang === "en" ? "?lang=en" : ""}`);

  const datos = await dossier(c.codigo, lang);
  if (!datos) notFound();
  return <DossierCtcx d={datos} />;
}
