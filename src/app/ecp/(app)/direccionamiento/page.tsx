import type { Metadata } from "next";
import { DireccionamientoClient } from "@/components/panel/direccionamiento/DireccionamientoClient";
import { cargarContexto } from "../direccionamientoActions";

export const metadata: Metadata = {
  title: "Direccionamiento · ECP",
  robots: { index: false, follow: false },
};

// La ficha se carga en el servidor y viaja como `initialData` para que la
// primera pintura ya traiga contenido. Las imágenes del moodboard NO: el módulo
// las pide aparte por el adaptador, que es justo para lo que están separadas.
export const dynamic = "force-dynamic";

export default async function DireccionamientoPage() {
  const record = await cargarContexto("record");
  return <DireccionamientoClient initialRecord={record} />;
}
