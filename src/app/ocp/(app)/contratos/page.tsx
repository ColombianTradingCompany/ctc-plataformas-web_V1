import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { cargarTriage } from "@/lib/triage/servidor";
import { CONTRATOS_LISTA_PATH } from "@/lib/triage/fobMinimo";
import { CatalogoTabs } from "../catalogo/CatalogoTabs";
import { CircuitoDelStock } from "../CircuitoDelStock";
import { TriageBoard } from "./TriageBoard";

export const metadata: Metadata = { title: "Triage de Catálogo Activo · OCP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ── OCP · Catálogo · Triage de Catálogo Activo (V5.196, owner 2026-10-09) ─────────────────────────────────────────────────────
// Lo que hasta la V5.195 fue «Ofertas CP Aceptadas»: el punto de control entre los contratos aceptados, el Stock CTCx y el Catálogo
// Activo (`docs/PLAN_TRIAGE_CATALOGO.md` §2.3). La lista de contratos por estado pasó a `/ocp/contratos/lista`; un enlace viejo con
// `?status=` llega allí. El layout del OCP ya pasó la compuerta de la consola.
// V5.203 (owner, 2026-10-10): enlaces profundos — `?partida=<id>` y `?contrato=<id>` desplazan hasta ESA entrada y abren su formulario
// (los usan Adquisición, CTCx Selection, el contrato y el Catálogo Activo); y la franja del circuito arriba.
const esUuid = (v: string | undefined) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null);

export default async function TriagePage({ searchParams }: { searchParams: Promise<{ status?: string; partida?: string; contrato?: string; declarar?: string }> }) {
  const { status, partida, contrato, declarar } = await searchParams;
  if (status) redirect(`${CONTRATOS_LISTA_PATH}?status=${encodeURIComponent(status)}`);
  const triage = await cargarTriage(createServiceRoleClient());
  return (
    <div>
      {/* V5.203 · corrección (H15): la franja va primero, como en Adquisición y el Stock CTCx; luego las pestañas del tablero. */}
      <CircuitoDelStock actual="triage" />
      <CatalogoTabs />
      {/* La `key` remonta el tablero con cada enlace profundo nuevo: el formulario que abre se decide al montar. */}
      {/* V5.203 · corrección (H15): `declarar=1` (de «Declarar en el Triage →») abre el formulario; sin él, el enlace solo desplaza y resalta. */}
      <TriageBoard key={`${partida ?? ""}:${contrato ?? ""}:${declarar ?? ""}`} triage={triage} abrir={{ partida: esUuid(partida), contrato: esUuid(contrato), declarar: declarar === "1" }} />
    </div>
  );
}
