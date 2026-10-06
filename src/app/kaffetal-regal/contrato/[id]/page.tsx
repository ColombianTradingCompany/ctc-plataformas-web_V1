import type { Metadata } from "next";
import { createHash } from "node:crypto";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { CONTRATO_VERSION, clausulasDelContrato, textoDelContrato, type DatosDelContrato } from "@/lib/trato/contrato";
import type { CondicionesDeModalidad, Modalidad } from "@/lib/trato/modalidades";
import { LUGAR_DE_ENTREGA_POR_DEFECTO } from "@/lib/trato/terminos";
import { AVISO_SIN_CONTRATO, contratoFirmado, textoDeMarca } from "@/lib/kaffetal/blindaje";
import { ctcLotReference } from "@/components/kaffetal-regal/data";
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

const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null);

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return gate("Inicie sesión para ver su contrato.");

  const service = createServiceRoleClient();
  const { data: raw } = await service
    .from("purchase_contracts")
    .select(
      "id, lot_id, status, grade_snapshot, price_per_kg_locked, quantity_frozen_kg, declaracion, compra_inicial_kg, terms_version, lugar_entrega, signed_at, producer_signed_at, producer_signer_name, producer_signature_path, contract_text_version, contract_text_sha256, offer_id, freeze_months, vigencia_desde, vigencia_hasta, retiro_libre_pct, redeclarar_min_kg, redeclarar_at, compra_inicial_min_kg, compra_inicial_max_kg, lots(name, producer_id), lot_offers!purchase_contracts_offer_id_fkey(season_label, kind)"
    )
    .eq("id", id)
    .maybeSingle();
  type Row = {
    id: string;
    lot_id: string;
    status: string;
    grade_snapshot: string | null;
    price_per_kg_locked: number | string | null;
    quantity_frozen_kg: number | string | null;
    declaracion: Modalidad | null;
    freeze_months: number | null;
    vigencia_desde: string | null;
    vigencia_hasta: string | null;
    retiro_libre_pct: number | string | null;
    redeclarar_min_kg: number | string | null;
    redeclarar_at: string | null;
    compra_inicial_min_kg: number | string | null;
    compra_inicial_max_kg: number | string | null;
    compra_inicial_kg: number | string | null;
    terms_version: string | null;
    lugar_entrega: string | null;
    signed_at: string | null;
    producer_signed_at: string | null;
    producer_signer_name: string | null;
    producer_signature_path: string | null;
    contract_text_version: string | null;
    contract_text_sha256: string | null;
    lots: { name: string; producer_id: string } | { name: string; producer_id: string }[] | null;
    lot_offers: { season_label: string | null; kind: string } | { season_label: string | null; kind: string }[] | null;
  };
  const c = raw as Row | null;
  const lote = c ? ((Array.isArray(c.lots) ? c.lots[0] : c.lots) ?? null) : null;
  if (!c || !lote || lote.producer_id !== user.id) return gate("No encontramos este contrato en su cuenta.");
  if (!c.producer_signed_at) return gate("Este contrato es anterior a la firma digital: lo encuentra en «Contratos y Compras».");

  const oferta = (Array.isArray(c.lot_offers) ? c.lot_offers[0] : c.lot_offers) ?? null;
  // Las condiciones de la modalidad, tal como quedaron guardadas al firmar.
  const n = (v: number | string | null) => (v != null ? Number(v) : null);
  const condiciones: CondicionesDeModalidad | null =
    oferta?.kind !== "directa" && c.declaracion
      ? {
          modalidad: c.declaracion,
          desde: c.vigencia_desde ?? "",
          hasta: c.vigencia_hasta ?? "",
          meses: c.freeze_months ?? 1,
          retiroLibrePct: n(c.retiro_libre_pct),
          compraInicial: c.compra_inicial_min_kg != null ? { minKg: Number(c.compra_inicial_min_kg), maxKg: Number(c.compra_inicial_max_kg ?? c.compra_inicial_min_kg) } : { kg: Number(c.compra_inicial_kg ?? 0) },
          redeclarar: c.redeclarar_min_kg != null && c.redeclarar_at ? { minKg: Number(c.redeclarar_min_kg), at: c.redeclarar_at } : null,
        }
      : null;
  const datos: DatosDelContrato = {
    tipo: oferta?.kind === "directa" ? "selection" : "cherry_picked",
    condiciones,
    productorNombre: c.producer_signer_name ?? "—",
    productorDocumento: null,
    loteNombre: lote.name,
    loteReferencia: ctcLotReference(c.lot_id),
    grado: c.grade_snapshot ?? "—",
    copKg: Number(c.price_per_kg_locked ?? 0),
    declaradoKg: Number(c.quantity_frozen_kg ?? 0),
    lugarEntrega: c.lugar_entrega ?? LUGAR_DE_ENTREGA_POR_DEFECTO,
    termsVersion: c.terms_version,
    temporada: oferta?.season_label ?? null,
  };
  const huella = createHash("sha256").update(textoDelContrato(datos), "utf8").digest("hex");
  // Un contrato firmado con un texto de otra versión conserva su huella; aquí se dice, no se compara a ciegas.
  const mismaVersion = (c.contract_text_version ?? CONTRATO_VERSION) === CONTRATO_VERSION;
  const integro = huella === c.contract_text_sha256;
  const { data: firmaUrl } = c.producer_signature_path ? await service.storage.from("kaffetal-media").createSignedUrl(c.producer_signature_path, 600) : { data: null };
  const puedeImprimir = contratoFirmado(c.status);

  return (
    <div style={{ position: "relative", background: "#fff", color: "#17121F", maxWidth: 820, margin: "0 auto", padding: "28px 36px 40px", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", fontSize: 13.5, lineHeight: 1.55 }}>
      <MarcaDeAgua texto={textoDeMarca({ referencia: ctcLotReference(c.lot_id), productor: c.producer_signer_name, fecha: new Date() })} />
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
        <div style={{ borderTop: "1px solid #17121F", paddingTop: 8 }}>
          {firmaUrl?.signedUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- la firma, URL firmada de Storage privado
            <img src={firmaUrl.signedUrl} alt={`Firma de ${c.producer_signer_name}`} style={{ height: 70, width: "auto", display: "block", marginTop: -78, background: "transparent" }} />
          )}
          <b>{c.producer_signer_name}</b>
          <div style={{ fontSize: 12, color: "#5B5568" }}>El Productor · firmó el {fecha(c.producer_signed_at)}</div>
        </div>
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
