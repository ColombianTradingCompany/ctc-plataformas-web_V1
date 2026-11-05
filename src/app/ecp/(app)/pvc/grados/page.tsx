import type { Metadata } from "next";
import { EscalaBoard } from "@/components/panel/pvc/EscalaBoard";
import { edicionVigente } from "@/lib/pvc/servicio";
import { scaDeUrl, triadaDeUrl, vueltaDeConsola, type Param } from "@/lib/herramientasInternas/entrada";

export const metadata: Metadata = { title: "Grados · Modelo Económico · ECP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ── ECP · Modelo Económico · Grados ──────────────────────────────────────────
// La escala «El Punto y la Tríada» con su calculadora (docs/PVC_BCP_PLAN.md
// §9.1). La escalera de la edición vigente viaja desde el servidor para que la
// calculadora pueda decir, además del grado, LO QUE ESE GRADO VALE HOY — que es
// la primera versión de la herramienta «PVC × grado» del §9.5.
//
// PUERTA DE ENTRADA (CTCx OS, 2026-11-05; tabla del charter): `?sca=86,5&triada=BCA&volver=/ocp/…` abre la calculadora con
// ese Punto y esa tríada y un «Volver». Los tres pasan por los analizadores PUROS de `herramientasInternas/entrada.ts`; lo
// que no casa se ignora y la calculadora arranca como siempre (86 · CCC). Precargar no escribe nada.
export default async function PvcGradosPage({ searchParams }: { searchParams: Promise<Record<string, Param>> }) {
  const [vigente, q] = await Promise.all([edicionVigente(), searchParams]);
  const escalera = (vigente?.outputs?.escalera ?? []).map((e) => ({ banda: e.banda, cop: e.cop, mult: e.mult }));
  return (
    <EscalaBoard
      edicionCode={vigente?.code ?? null}
      escalera={escalera}
      scaInicial={scaDeUrl(q.sca)}
      triadaInicial={triadaDeUrl(q.triada)}
      volver={vueltaDeConsola(q.volver)}
    />
  );
}
