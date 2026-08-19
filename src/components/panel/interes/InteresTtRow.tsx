"use client";

import { marcarInteresTtContactado } from "@/lib/terratalento/interesActions";
import { InteresRow } from "./InteresRow";

// Una fila de la lista de espera de Terratalento. Por dentro es EXACTAMENTE la
// fila de las demás listas —correo, un detalle, la fecha y el botón que va en
// los dos sentidos—, así que reutiliza `InteresRow` y solo le cambia quién
// escribe: `terratalento_interes` es otra tabla, no otra pantalla.
//
// Este envoltorio existe porque `InteresRow` es un componente de cliente y la
// acción tiene que llegarle como prop desde otro de cliente: pasarla desde el
// tablero, que es de servidor, no se puede.
export function InteresTtRow(props: {
  id: string;
  email: string;
  detalle: string;
  desde: string;
  contactado: boolean;
  contactadoEl?: string | null;
}) {
  return (
    <InteresRow
      id={props.id}
      email={props.email}
      desde={props.desde}
      detalle={props.detalle}
      contactado={props.contactado}
      contactadoEl={props.contactadoEl}
      onToggle={marcarInteresTtContactado}
    />
  );
}
