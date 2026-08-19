import { notFound } from "next/navigation";
import { createEphemeralClient, createServiceRoleClient } from "@/lib/supabase/server";
import { fichaPublica, fichaVale, type FichaPublica } from "@/lib/catalogo/fichaPublica";
import { CTC_RAZON } from "@/lib/legal";

export const dynamic = "force-dynamic";

// La FICHA TÉCNICA pública de un lote vivo (§9 to-do 2 del plan V5, V4.42).
//
// ⚠️ POR QUÉ CUELGA DE `/docs` Y NO DE `/catalogo` — es la gotcha 12 otra vez.
// El matcher de `src/proxy.ts` excluye `docs/` (junto con `api/`, `images/` y
// `tools/`). En un subdominio, una ruta NO excluida se reescribe: `/catalogo/…`
// se convertiría en `/kaffetal-regal/catalogo/…` y daría 404. Y este enlace se
// abre desde la cinta, que está montada en SIETE superficies de hosts
// distintos, así que tiene que ser la misma URL en los diecinueve. Además las
// fichas de muestra ya viven en `/docs/fichas-mock/`: es su barrio.
//
// ⚠️ LO QUE NO SE HACE AQUÍ, QUE ES EL PUNTO. No se sirve `lots.datasheet`.
// Son 110 claves con el NIT del productor, su nombre, la georreferencia del
// predio y la evaluación de riesgo EUDR que CTC hace del proveedor. La
// auditoría del 2026-07-10 dejó escrito que esta Ficha privada y la
// geolocalización NO salen — `public_lot_catalog` existe por eso. Aquí se
// proyecta con `fichaPublica()`, que es lista BLANCA: lo que no está nombrado
// no sale, y una clave nueva del formulario nace privada.
//
// LA COMPUERTA es la vista, no una condición escrita a mano: si el lote no
// aparece en `public_lot_catalog` no está publicado, y esto responde 404. El
// `datasheet` solo se lee DESPUÉS de pasar por ahí.

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
  tiene_ficha: boolean;
};

const SCA: [keyof FichaPublica, string][] = [
  ["sca_fragrance", "Fragancia / Aroma"],
  ["sca_flavor", "Sabor"],
  ["sca_aftertaste", "Residual"],
  ["sca_acidity", "Acidez"],
  ["sca_body", "Cuerpo"],
  ["sca_balance", "Balance"],
  ["sca_uniformity", "Uniformidad"],
  ["sca_clean_cup", "Taza limpia"],
  ["sca_sweetness", "Dulzor"],
  ["sca_cuppers", "Catador"],
];

export default async function FichaLotePage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  if (!UUID.test(lotId)) notFound();

  // Cliente anónimo: la vista ya filtra por publicado, y leerla sin sesión deja
  // claro que esto es dato público y no hereda permisos de nadie.
  const anon = createEphemeralClient();
  const { data } = await anon
    .from("public_lot_catalog")
    .select(
      "lot_id, name, grade, ficha_variedad, ficha_proceso, ficha_altitud_m, ficha_puntaje_estimado, official_score, ficha_notas_cata, finca_name, municipio, departamento, ctc_selection, tiene_ficha"
    )
    .eq("lot_id", lotId)
    .maybeSingle();

  const fila = data as Fila | null;
  if (!fila) notFound();

  // El `datasheet` solo se toca una vez pasada la compuerta de arriba, y lo que
  // sale de aquí es la proyección, nunca la fila.
  let ficha: FichaPublica = {};
  if (fila.tiene_ficha) {
    const service = createServiceRoleClient();
    const { data: crudo } = await service.from("lots").select("datasheet").eq("id", lotId).maybeSingle();
    ficha = fichaPublica(crudo?.datasheet, { ctcSelection: fila.ctc_selection, rotuloCTC: CTC_RAZON });
  }

  // El rótulo de origen se arma igual que en la tarjeta, desde la MISMA regla:
  // la vista ya no devuelve la finca de un lote comprado, y el rótulo sale de
  // `legal.ts`. La ficha no puede desmentir a la vitrina.
  const finca = fila.ctc_selection ? CTC_RAZON : fila.finca_name ?? "—";
  const lugar = [fila.municipio, fila.departamento].filter(Boolean).join(", ") || "—";
  const puntaje = fila.official_score ?? fila.ficha_puntaje_estimado;
  const estimado = fila.official_score == null && fila.ficha_puntaje_estimado != null;

  const dato = (k: keyof FichaPublica) => ficha[k];
  const filas: [string, string | number | undefined][] = [
    ["Finca", finca],
    ["Origen", lugar],
    ["Altura", fila.ficha_altitud_m ? `${fila.ficha_altitud_m} msnm` : dato("masl")],
    ["Variedad", fila.ficha_variedad ?? dato("varieties")],
    ["Proceso", fila.ficha_proceso ?? dato("base_processing")],
    ["Proceso especial", dato("special_processing")],
    ["Especie", dato("species")],
    ["Cosecha", dato("harvest_season") ?? dato("harvest_year")],
  ];

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 64px", fontFamily: "system-ui, sans-serif", color: "#1F2937" }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#6B7280" }}>
        Ficha técnica · {CTC_RAZON}
      </p>
      <h1 style={{ margin: "6px 0 0", fontSize: 30, lineHeight: 1.15 }}>{fila.name}</h1>
      {puntaje != null && (
        <p style={{ margin: "8px 0 0", fontSize: 15, color: "#374151" }}>
          <b>{Number(puntaje).toFixed(2)}</b> SCA{estimado ? " · puntaje declarado por el productor, sin catación oficial" : ""}
        </p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 28, fontSize: 15 }}>
        <tbody>
          {filas
            .filter(([, v]) => v != null && v !== "")
            .map(([k, v]) => (
              <tr key={k}>
                <th scope="row" style={{ textAlign: "left", padding: "9px 12px 9px 0", color: "#6B7280", fontWeight: 500, width: 190, verticalAlign: "top", borderBottom: "1px solid #E5E7EB" }}>
                  {k}
                </th>
                <td style={{ padding: "9px 0", borderBottom: "1px solid #E5E7EB" }}>{v}</td>
              </tr>
            ))}
        </tbody>
      </table>

      {(fila.ficha_notas_cata || dato("cupping_profile")) && (
        <section style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>Notas de cata</h2>
          <p style={{ margin: 0, lineHeight: 1.65 }}>{fila.ficha_notas_cata ?? dato("cupping_profile")}</p>
        </section>
      )}

      {fichaVale(ficha) && SCA.some(([k]) => ficha[k] != null) && (
        <section style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>Análisis SCA</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
            <tbody>
              {SCA.filter(([k]) => ficha[k] != null).map(([k, etiqueta]) => (
                <tr key={k}>
                  <th scope="row" style={{ textAlign: "left", padding: "7px 12px 7px 0", color: "#6B7280", fontWeight: 500, width: 190, borderBottom: "1px solid #F3F4F6" }}>
                    {etiqueta}
                  </th>
                  <td style={{ padding: "7px 0", borderBottom: "1px solid #F3F4F6" }}>{ficha[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p style={{ marginTop: 36, fontSize: 12.5, color: "#6B7280", lineHeight: 1.6 }}>
        Esta ficha recoge los datos de exhibición del lote. Los documentos comerciales y la declaración de
        diligencia debida (DDS) viajan con cada despacho.
      </p>
    </main>
  );
}
