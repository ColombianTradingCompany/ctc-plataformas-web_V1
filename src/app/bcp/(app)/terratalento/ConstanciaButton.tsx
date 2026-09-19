"use client";

import { openConstancia, type ConstanciaInput } from "@/lib/terratalento/constanciaPrint";

// El botón que abre la constancia de acuerdo. Los datos se arman en el
// servidor (la page ya los tiene) y aquí solo se imprime — openConstancia
// necesita window, así que este trocito es cliente.
export function ConstanciaButton({ datos, label }: { datos: ConstanciaInput; label?: string }) {
  return (
    <button className="btn btn-sm" type="button" onClick={() => openConstancia(datos)}>
      {label ?? "Ver constancia"}
    </button>
  );
}
