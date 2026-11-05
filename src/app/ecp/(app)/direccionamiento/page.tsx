import type { Metadata } from "next";
import { DireccionamientoClient } from "@/components/panel/direccionamiento/DireccionamientoClient";
import { cargarContexto } from "../direccionamientoActions";
import { unidadDeUrl, vueltaDeConsola, type Param } from "@/lib/herramientasInternas/entrada";

export const metadata: Metadata = {
  title: "Direccionamiento · ECP",
  robots: { index: false, follow: false },
};

// La ficha se carga en el servidor y viaja como `initialData` para que la
// primera pintura ya traiga contenido. Las imágenes del moodboard NO: el módulo
// las pide aparte por el adaptador, que es justo para lo que están separadas.
export const dynamic = "force-dynamic";

//
// PUERTA DE ENTRADA (CTCx OS, 2026-11-05; tabla del charter): `?unidad=kr&volver=/ecp` abre la ficha en esa unidad, con un
// «Volver». Lista blanca (`herramientasInternas/entrada.ts`): lo que no casa se ignora y abre en CTCX, como siempre.
export default async function DireccionamientoPage({ searchParams }: { searchParams: Promise<Record<string, Param>> }) {
  const [record, q] = await Promise.all([cargarContexto("record"), searchParams]);
  return <DireccionamientoClient initialRecord={record} unidadInicial={unidadDeUrl(q.unidad)} volver={vueltaDeConsola(q.volver)} />;
}
