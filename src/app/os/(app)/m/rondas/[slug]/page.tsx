import { notFound } from "next/navigation";
import { Ronda } from "@/components/os/vistas/Ronda";
import { moduloEncendido } from "@/lib/os/interruptores";
import { identidadDeLaOs } from "@/app/os/(app)/quienMira";
import { rondaPorSlug } from "@/lib/os/rondas/definiciones";
import { armarRonda } from "@/lib/os/rondas/nucleo";
import { leerRonda } from "@/lib/os/rondas/lectura";
import { textosDelOs } from "@/lib/os/textos/idioma";

// CTCx OS · módulo «Rondas» · UNA ronda (`/os/m/rondas/<slug>`, 2026-11-07, nace apagado). Mira el interruptor ANTES de leer (la
// página corre en paralelo con su layout: qa-os-check H2b y R). La definición sale de `definiciones.ts` (un slug que no existe es
// un 404); los Personajes y la bitácora, de `leerRonda` (solo servidor, solo lectura); quien mira firma el mensaje de WhatsApp con
// su nombre de panel. Escribir es cosa del formulario, por la acción del OCP: esta página no escribe.
export const dynamic = "force-dynamic";

export default async function RondaPage({ params }: { params: Promise<{ slug: string }> }) {
  const estado = await moduloEncendido("rondas");
  if (!estado.encendido) return null;
  const { slug } = await params;
  const def = rondaPorSlug(slug);
  if (!def) notFound();
  const identidad = await identidadDeLaOs();
  const lectura = await leerRonda(def);
  // El nombre de panel firma el saludo; si el panel no tiene nombre (solo el correo), firma «el equipo».
  const firma = identidad.displayName && !identidad.displayName.includes("@") ? identidad.displayName : textosDelOs().rondas.firma;
  const ronda = lectura.ok ? armarRonda(def, lectura.objetivos, lectura.contactos, lectura.lecturaContactos, firma) : null;
  return <Ronda ronda={ronda} volver="/os/m/rondas" />;
}
