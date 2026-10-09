import type { Metadata } from "next";
import { EmpaqueFobBoard } from "@/components/produccion/EmpaqueFobBoard";
import { quoteServiceClient } from "@/lib/panel/requireConsoleWrite";
import { edicionVigente } from "@/lib/pvc/servicio";
import { cargarReferenciasEmpaque } from "@/lib/produccion/referencias";

export const metadata: Metadata = { title: "Empacado hasta FOB · ECP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ECP · Modelo de Producción · Empacado hasta FOB (V5.194, owner 2026-10-09; `docs/PLAN_TRIAGE_CATALOGO.md` §2.2). Reemplaza al
// «Costo de empaque» de la máquina de sellado al vacío (amortización, cuadro de evaluación), retirado por pedido del owner: lo que
// importa ahora es el costo de un embarque hasta FOB por kg de verde, en varios modos de empaque. La ruta se conservó (los talones y
// los enlaces viejos siguen sirviendo). El layout del ECP ya pasó la compuerta de la consola; la TRM por defecto es la de la edición
// vigente del PVC.
export default async function EmpacadoHastaFobPage() {
  const [edicion, referencias] = await Promise.all([edicionVigente(), cargarReferenciasEmpaque(quoteServiceClient())]);
  const trm = edicion?.inputs?.trm;
  return (
    <EmpaqueFobBoard
      trmVigente={typeof trm === "number" && trm > 0 ? trm : null}
      edicionCodigo={edicion?.code ?? null}
      referencias={referencias}
    />
  );
}
