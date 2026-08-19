import { InteresBoard } from "@/components/panel/interes/InteresBoard";

export const dynamic = "force-dynamic";

// Lista de espera · CTC Home — la TERCERA fuente de `newsletter_subscribers`,
// que llevaba desde el 2026-08-10 recogiendo correos sin tablero que los mirara
// (§9 del plan V5, punto 6).
//
// ⚠️ VIVE EN EL ECP Y NO EN EL OCP, a diferencia de Roast y X. No es un programa
// de Cherry Picked: es la red de CTC entera. Meterla en el grupo «OCP · Cherry
// Picked» habría hecho que el sitio del tablero contradijera lo que contiene, y
// quien buscara la lista de la portada la habría buscado donde no está. Aquí
// queda al lado de «Leads · Recepción», que es lo otro que entra por la web
// pública.
export default function ListaEsperaCtcHomePage() {
  return (
    <InteresBoard
      fuente="ctc-home"
      titulo="Lista de espera · CTC Home"
      origen="el índice de la red, en la portada"
      intro="Quién dejó su correo en el índice de la red, en la portada, para que se le avise cuando abra. No es un embudo de venta: es la gente que se apuntó mientras la red está en construcción, y la promesa que se le hizo —en español, inglés y alemán— es que se le escribe cuando cada puerta se abra de verdad."
    />
  );
}
