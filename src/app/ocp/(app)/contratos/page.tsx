import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { cargarTriage } from "@/lib/triage/servidor";
import { CONTRATOS_LISTA_PATH } from "@/lib/triage/fobMinimo";
import { CatalogoTabs } from "../catalogo/CatalogoTabs";
import { TriageBoard } from "./TriageBoard";

export const metadata: Metadata = { title: "Triage de Catálogo Activo · OCP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ── OCP · Catálogo · Triage de Catálogo Activo (V5.196, owner 2026-10-09) ─────────────────────────────────────────────────────
// Lo que hasta la V5.195 fue «Ofertas CP Aceptadas»: el punto de control entre los contratos aceptados, el Stock CTCx y el Catálogo
// Activo (`docs/PLAN_TRIAGE_CATALOGO.md` §2.3). La lista de contratos por estado pasó a `/ocp/contratos/lista`; un enlace viejo con
// `?status=` llega allí. El layout del OCP ya pasó la compuerta de la consola.
export default async function TriagePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  if (status) redirect(`${CONTRATOS_LISTA_PATH}?status=${encodeURIComponent(status)}`);
  const triage = await cargarTriage(createServiceRoleClient());
  return (
    <div>
      <CatalogoTabs />
      <TriageBoard triage={triage} />
    </div>
  );
}
