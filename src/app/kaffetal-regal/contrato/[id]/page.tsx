import type { Metadata } from "next";
import { createHash } from "node:crypto";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { CONTRATO_VERSION, clausulasDelContrato, textoDelContrato } from "@/lib/trato/contrato";
import { COLUMNAS_DEL_CONTRATO, datosDeLaFila, type FilaDelContrato } from "@/lib/trato/contratoDeFila";
import { AVISO_SIN_CONTRATO, contratoFirmado, textoDeMarca } from "@/lib/kaffetal/blindaje";
import { documentoDelFirmante, esTipoDeDocumento } from "@/lib/trato/documento";
import { ctcLotReference, supplierCode } from "@/components/kaffetal-regal/data";
import { CONTRACT_STATUS_LABEL } from "@/components/kaffetal-regal/data";
import { MarcaDeAgua } from "@/components/kaffetal-regal/blindaje/MarcaDeAgua";
import { Blindaje } from "@/components/kaffetal-regal/blindaje/Blindaje";
import { PrintButton } from "@/components/kaffetal-regal/PrintButton";
import { CTC_LEGAL_LINE } from "@/lib/legal";
import { tituloDeContrato } from "@/lib/kaffetal/tituloDeDocumento";

export const dynamic = "force-dynamic";
// V5.169: el título (= el nombre del PDF) lleva el nombre del lote y su código.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return tituloDeContrato((await params).id);
}

// ── /kaffetal-regal/contrato/[id] (V5.168, owner 2026-10-06) ───────────────────────────────────────────────────────────
// El contrato que el productor firmó con el dedo al aceptar la oferta: las cláusulas (regeneradas de los datos guardados con
// la misma función que firmó, `clausulasDelContrato`), la huella SHA-256 comprobada contra la guardada, su firma y la de
// CTCx. Lleva marca de agua y se imprime solo cuando el contrato está firmado por las dos partes. Solo lo ve su dueño.
// V5.190: un contrato que CTCx aceptó PROVISIONALMENTE en una sesión asistida se ve aquí antes de la ratificación —con el texto
// provisional, su huella y quién lo aceptó por CTCx— y, ratificado, con la firma del productor y la fecha de la ratificación. Los
// datos salen de `datosDeLaFila` (`contratoDeFila.ts`), el mismo armador de la ratificación.

function gate(message: string) {
  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: 24, fontFamily: "system-ui, sans-serif", textAlign: "center", color: "#333" }}>
      <h1 style={{ fontSize: 20 }}>Contrato</h1>
      <p style={{ color: "#666" }}>{message}</p>
      <p style={{ marginTop: 20 }}>
        <a href="/kaffetal-regal">Volver a mi panel</a>
      </p>
    </div>
  );
}

// V5.188: la hora de la firma, en la de Colombia (el servidor corre en UTC).
const fecha = (iso: string | null | undefined) =>
  iso ? `${new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} (hora de Colombia)` : null;

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return gate("Inicie sesión para ver su contrato.");

  const service = createServiceRoleClient();
  const { data: raw } = await service.from("purchase_contracts").select(COLUMNAS_DEL_CONTRATO).eq("id", id).maybeSingle();
  const c = raw as FilaDelContrato | null;
  const lote = c ? ((Array.isArray(c.lots) ? c.lots[0] : c.lots) ?? null) : null;
  if (!c || !lote || lote.producer_id !== user.id) return gate("No encontramos este contrato en su cuenta.");
  if (!c.producer_signed_at && !c.provisional_at) return gate("Este contrato es anterior a la firma digital: lo encuentra en «Contratos y Compras».");
  const documentoFirmante =
    c.producer_signer_doc_numero && esTipoDeDocumento(c.producer_signer_doc_tipo) ? documentoDelFirmante(c.producer_signer_doc_tipo, c.producer_signer_doc_numero) : null;
  // Firmado (o ratificado) por el productor: su nombre y su documento entran al texto y a la huella. Provisional sin ratificar: no.
  const firmante = c.producer_signed_at && c.producer_signer_name ? { nombre: c.producer_signer_name, documento: documentoFirmante } : null;
  // V5.175: la ventana, el saco, el mínimo, la calidad y (V5.177) el Flete a CTCx, tal como quedaron guardados al firmar (la huella los cita).
  const datos = datosDeLaFila(c, { loteNombre: lote.name, loteReferencia: ctcLotReference(c.lot_id), cuenta: supplierCode(lote.producer_id), firmante });
  const provisionalSinRatificar = Boolean(c.provisional_at) && !c.ratificado_at;
  const huella = createHash("sha256").update(textoDelContrato(datos), "utf8").digest("hex");
  // Un contrato firmado con un texto de otra versión conserva su huella; aquí se dice, no se compara a ciegas.
  const mismaVersion = (c.contract_text_version ?? CONTRATO_VERSION) === CONTRATO_VERSION;
  const integro = huella === c.contract_text_sha256;
  const { data: firmaUrl } = c.producer_signature_path ? await service.storage.from("kaffetal-media").createSignedUrl(c.producer_signature_path, 600) : { data: null };
  const puedeImprimir = contratoFirmado(c.status);

  return (
    <div style={{ position: "relative", background: "#fff", color: "#17121F", maxWidth: 820, margin: "0 auto", padding: "28px 36px 40px", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", fontSize: 13.5, lineHeight: 1.55 }}>
      <MarcaDeAgua texto={textoDeMarca({ referencia: ctcLotReference(c.lot_id), productor: c.producer_signer_name ?? supplierCode(lote.producer_id), fecha: new Date() })} />
      <Blindaje puedeImprimir={puedeImprimir} aviso={AVISO_SIN_CONTRATO.es} />
      <style>{`@media print { .no-print { display: none !important } }`}</style>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <a href="/kaffetal-regal">Volver a mi panel</a>
        {puedeImprimir ? <PrintButton /> : <span style={{ fontSize: 12, color: "#555", border: "1px dashed #ccc", padding: "6px 10px" }}>Se imprime cuando CTCx firme el contrato.</span>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", borderBottom: "2px solid #17121F", paddingBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: ".06em", color: "#5B5568" }}>CTCx · KAFFETAL REGAL</div>
          <h1 style={{ fontSize: 22, margin: "2px 0" }}>Contrato de suministro · {lote.name}</h1>
          <div style={{ fontSize: 12, color: "#5B5568" }}>
            {ctcLotReference(c.lot_id)} · {CONTRACT_STATUS_LABEL[c.status as keyof typeof CONTRACT_STATUS_LABEL] ?? c.status}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- documento imprimible */}
        <img src="/tools/assets/ctcx-logo.png" alt="Colombian Trading Company" style={{ height: 40, width: "auto" }} />
      </div>
      {clausulasDelContrato(datos).map((cl) => (
        <p key={cl.titulo} style={{ margin: "12px 0 0" }}>
          <b>{cl.titulo}.</b> {cl.texto}
        </p>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 28 }}>
        {provisionalSinRatificar ? (
          <div style={{ borderTop: "1px solid #17121F", paddingTop: 8 }}>
            <b>Pendiente de la ratificación del Productor</b>
            <div style={{ fontSize: 12.5 }}>{supplierCode(lote.producer_id)}</div>
            <div style={{ fontSize: 12, color: "#5B5568" }}>
              Aceptado provisionalmente por CTCx el {fecha(c.provisional_at)} en una sesión asistida (responsable: {c.provisional_responsable}). El Productor lo ratifica
              y firma desde su cuenta.
            </div>
          </div>
        ) : (
          <div style={{ borderTop: "1px solid #17121F", paddingTop: 8 }}>
            {firmaUrl?.signedUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- la firma, URL firmada de Storage privado
              <img src={firmaUrl.signedUrl} alt={`Firma de ${c.producer_signer_name}`} style={{ height: 70, width: "auto", display: "block", marginTop: -78, background: "transparent" }} />
            )}
            <b>{c.producer_signer_name}</b>
            {documentoFirmante && <div style={{ fontSize: 12.5 }}>{documentoFirmante}</div>}
            <div style={{ fontSize: 12, color: "#5B5568" }}>
              El Productor · {c.ratificado_at ? `ratificó y firmó el ${fecha(c.ratificado_at)} (aceptación provisional de CTCx del ${fecha(c.provisional_at)}, responsable: ${c.provisional_responsable})` : `firmó el ${fecha(c.producer_signed_at)}`}
            </div>
          </div>
        )}
        <div style={{ borderTop: "1px solid #17121F", paddingTop: 8 }}>
          <b>Colombian Trading Company (CTCx)</b>
          <div style={{ fontSize: 12, color: "#5B5568" }}>{c.signed_at ? `Firmó el ${fecha(c.signed_at)}` : "Pendiente de la firma de CTCx"}</div>
        </div>
      </div>
      <p style={{ marginTop: 24, fontSize: 11, color: "#5B5568", borderTop: "1px solid #E2DEE9", paddingTop: 8 }}>
        Texto versión {c.contract_text_version ?? "—"} · huella SHA-256 {c.contract_text_sha256 ? `${c.contract_text_sha256.slice(0, 16)}…` : "—"} ·{" "}
        {integro ? "el texto coincide con el que se firmó" : mismaVersion ? "el texto mostrado no coincide con la huella firmada: escríbale a CTCx" : "firmado con una versión anterior del texto; la huella guardada corresponde a esa versión"} · {CTC_LEGAL_LINE}
      </p>
    </div>
  );
}
