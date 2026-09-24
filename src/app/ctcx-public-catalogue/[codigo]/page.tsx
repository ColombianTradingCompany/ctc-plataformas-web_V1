import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { createEphemeralClient, createServiceRoleClient } from "@/lib/supabase/server";
import { fichaPublica, fichaVale, type FichaPublica } from "@/lib/catalogo/fichaPublica";
import { normalizaCodigo, rutaDelCodigo } from "@/lib/catalogo/codigoPublico";
import { esGradoValido, GRADO_POR_ID, SCA_DECIMALES } from "@/lib/grados/definicion";
import { metadatosDeSuperficie } from "@/lib/seo/openGraph";
import { aPerfilCtcx, rotuloCtcx, urlDeImagenCtcx, PERFIL_CTCX_SELECT, VISTA_PERFIL_CTCX, type FilaPerfilCtcx } from "@/lib/catalogo/perfilCtcx";
import { OrganizationLd } from "@/components/JsonLd";
import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { PaquetePublico, type FilaSCA, type LotePublico } from "@/components/catalogo/PaquetePublico";

export const dynamic = "force-dynamic";

// El PAQUETE PÚBLICO de un lote, resuelto por su código corto (V5.48).
//
// ⚠️ LA COMPUERTA ES LA VISTA, NO EL CÓDIGO. Se consulta `public_lot_catalog`
// —estrecha, `SECURITY DEFINER`, legible por `anon`, que solo contiene lotes
// `published` o `sold_out`— y **jamás** `lots` por `public_code`. Si el lote no
// asoma por la vista, no está publicado y esto responde 404, aunque el código
// sea correcto. Esa es toda la autorización que hay, y es la que debe haber.
//
// ⚠️ Y EL CÓDIGO NO ES UNA CREDENCIAL. `public_lot_catalog` es legible por
// `anon` con la clave que viaja en el bundle, así que el catálogo publicado
// entero —códigos incluidos— se lee de una sola petición. Nadie puede construir
// una puerta encima de este identificador. Está escrito también en
// `lib/catalogo/codigoPublico.ts`, que es donde se va a mirar primero.
//
// ⚠️ LO QUE NO SE SIRVE. `lots.datasheet` son 110 claves con el NIT del
// productor, su nombre, la georreferencia del predio y la evaluación de riesgo
// EUDR del proveedor. Aquí se proyecta con `fichaPublica()`, que es lista
// BLANCA: lo que no está nombrado no sale, y una clave nueva del formulario
// nace privada. Es la MISMA puerta que `/docs/ficha/[lotId]` — y por eso el
// guardián `qa-ficha-publica-check.mjs` §8 vigila ahora las TRES.
//
// `force-dynamic` como en `/docs/ficha/[lotId]`: hoy hay cero lotes publicados,
// no hay nada que cachear, y la palanca correcta el día que la haya es
// `unstable_cache` + `revalidateTag` disparado desde `publishLot`, no
// `revalidate` (que aquí no cachearía nada: supabase-js no pasa por el `fetch`
// de Next). Sin `generateStaticParams` — hornear la lista en el build la deja
// vieja en cuanto se publica un lote.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Fila = {
  lot_id: string;
  name: string;
  grade: string | null;
  ficha_variedad: string | null;
  ficha_proceso: string | null;
  ficha_altitud_m: number | null;
  ficha_notas_cata: string | null;
  ficha_puntaje_estimado: number | null;
  official_score: number | null;
  finca_name: string | null;
  municipio: string | null;
  departamento: string | null;
  ctc_selection: boolean;
  ctcx_imagen_path: string | null;
  tiene_ficha: boolean;
  public_code: string;
};

/** Los diez atributos del formulario SCA, en el orden del formulario. Las
 *  ETIQUETAS se traducen en el componente de cliente; aquí solo viajan la clave
 *  y el valor, que es lo único que sale del `datasheet`. */
const SCA: (keyof FichaPublica)[] = [
  "sca_fragrance",
  "sca_flavor",
  "sca_aftertaste",
  "sca_acidity",
  "sca_body",
  "sca_balance",
  "sca_uniformity",
  "sca_clean_cup",
  "sca_sweetness",
  "sca_cuppers",
];

// `cache()` de React, y no una lectura suelta: `generateMetadata` y el render
// necesitan el MISMO lote, y sin esto se pagarían dos viajes a Postgres (y dos
// lecturas del `datasheet`) por visita. El repo no tenía precedente de
// `cache()` —solo `unstable_cache` en `seo/superficies.ts`, que es otra cosa:
// aquella cachea ENTRE peticiones, ésta dentro de una sola— así que queda
// dicho aquí y no en una bitácora.
const cargaLote = cache(async (codigo: string): Promise<LotePublico | null> => {
  // Cliente anónimo y sin cookies: esto es dato público y no hereda la sesión
  // de nadie. La vista ya filtra por publicado.
  const anon = createEphemeralClient();
  const { data } = await anon
    .from("public_lot_catalog")
    .select(
      "lot_id, name, grade, ficha_variedad, ficha_proceso, ficha_altitud_m, ficha_puntaje_estimado, official_score, ficha_notas_cata, finca_name, municipio, departamento, ctc_selection, ctcx_imagen_path, tiene_ficha, public_code"
    )
    .eq("public_code", codigo)
    .maybeSingle();

  const fila = data as Fila | null;
  if (!fila || !UUID.test(fila.lot_id)) return null;
  // V5.85: el perfil ÚNICO de CTCx Selection (respuesta 7): reemplaza a la finca en la vitrina de un lote comprado en firme.
  const perfil = fila.ctc_selection ? aPerfilCtcx(((await anon.from(VISTA_PERFIL_CTCX).select(PERFIL_CTCX_SELECT).maybeSingle()).data as FilaPerfilCtcx | null) ?? null) : aPerfilCtcx(null);

  // El `datasheet` solo se toca una vez pasada la compuerta de arriba, y lo que
  // sale de aquí es la proyección, nunca la fila.
  let ficha: FichaPublica = {};
  if (fila.tiene_ficha) {
    const service = createServiceRoleClient();
    const { data: crudo } = await service.from("lots").select("datasheet").eq("id", fila.lot_id).maybeSingle();
    ficha = fichaPublica(crudo?.datasheet, { ctcSelection: fila.ctc_selection, rotuloCTC: rotuloCtcx(perfil) });
  }

  const dato = (k: keyof FichaPublica) => {
    const v = ficha[k];
    return v == null || v === "" ? null : String(v);
  };

  // El rótulo de origen se arma con la MISMA regla que la tarjeta y la ficha: la
  // vista ya no devuelve la finca de un lote comprado en firme (D3.1) y el
  // rótulo sale de `legal.ts`. Este paquete no puede desmentir a la vitrina.
  const grado = fila.grade && esGradoValido(fila.grade) ? GRADO_POR_ID[fila.grade] : null;
  const puntaje = fila.official_score ?? fila.ficha_puntaje_estimado;

  return {
    codigo: fila.public_code,
    lotId: fila.lot_id,
    nombre: fila.name,
    sello: grado?.logo ?? null,
    gradoNombre: grado?.nombre ?? null,
    puntaje: puntaje != null ? Number(puntaje).toFixed(SCA_DECIMALES) : null,
    puntajeEstimado: fila.official_score == null && fila.ficha_puntaje_estimado != null,
    finca: fila.ctc_selection ? rotuloCtcx(perfil) : fila.finca_name ?? "—",
    ctcx: fila.ctc_selection ? { nombre: perfil.nombre, lema: perfil.lema, descripcion: perfil.descripcion, imagenUrl: urlDeImagenCtcx(fila.ctcx_imagen_path) ?? perfil.imagenUrl } : null,
    lugar: [fila.municipio, fila.departamento].filter(Boolean).join(", ") || "—",
    altura: fila.ficha_altitud_m ? `${fila.ficha_altitud_m} msnm` : dato("masl"),
    variedad: fila.ficha_variedad ?? dato("varieties"),
    proceso: fila.ficha_proceso ?? dato("base_processing"),
    procesoEspecial: dato("special_processing"),
    especie: dato("species"),
    cosecha: dato("harvest_season") ?? dato("harvest_year"),
    notasCata: fila.ficha_notas_cata ?? dato("cupping_profile"),
    sca: fichaVale(ficha)
      ? SCA.filter((k) => ficha[k] != null).map((k): FilaSCA => ({ campo: k, valor: ficha[k]! }))
      : [],
    tieneFicha: fila.tiene_ficha,
  };
});

/** Lo que la ruta entiende del segmento. Devuelve `null` si no es un código —
 *  y NO redirige, porque una cadena ilegible no tiene forma canónica a la que
 *  apuntar. */
function canonico(segmento: string): string | null {
  return normalizaCodigo(decodeURIComponent(segmento));
}

// `generateMetadata` NO llama a `notFound()` ni a `permanentRedirect()` — de eso
// se encarga la página. Un código desconocido devuelve `{}` y hereda el título
// del layout, como ya hace `socios/[partner]/page.tsx`.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<Metadata> {
  const { codigo } = await params;
  const c = canonico(codigo);
  if (!c) return {};
  const lote = await cargaLote(c);
  if (!lote) return {};

  const origen = [lote.finca, lote.lugar].filter((s) => s && s !== "—").join(" · ");
  return metadatosDeSuperficie({
    // El canonical es la ruta COMPLETA del lote. Firmar aquí la del portal
    // dejaría a todos los lotes declarando la misma página canónica, y el
    // buscador indexaría uno solo para el catálogo entero.
    route: rutaDelCodigo(lote.codigo),
    title: `${lote.nombre} · ${lote.codigo} · CTCx`,
    description: [
      origen,
      lote.variedad,
      lote.proceso,
      lote.puntaje ? `${lote.puntaje} SCA` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    siteName: "Colombian Trading Company",
    image: "ctcx-public-catalogue.jpg",
    imageAlt:
      "Patio de secado de café en Santander con «Find my Lot» y el logotipo de Colombian Trading Company",
    alternateLocale: ["en_GB", "de_DE"],
  });
}

export default async function PaquetePublicoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;

  // El orden importa, y cada paso queda FUERA de cualquier try/catch:
  // `notFound()` y `permanentRedirect()` lanzan errores de control de flujo que
  // Next tiene que ver.
  const c = canonico(codigo);
  if (!c) notFound();
  // 308 y no 307: la forma canónica es la única dirección de este lote, y un
  // 307 le diría al buscador que la versión fea también es real. Se redirige
  // ANTES de consultar, para que una URL mal escrita no cueste un viaje a la
  // base.
  if (c !== codigo) permanentRedirect(rutaDelCodigo(c));

  const lote = await cargaLote(c);
  if (!lote) notFound();

  return (
    <div data-theme="ctc-home">
      <OrganizationLd />
      <ToastProvider>
        <LangProvider storageKey="ctc-lang">
          <ContactModalProvider googleAuth={false}>
            <PaquetePublico lote={lote} />
          </ContactModalProvider>
        </LangProvider>
      </ToastProvider>
    </div>
  );
}
