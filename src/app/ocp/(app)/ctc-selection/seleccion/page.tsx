import { SelectionBoard } from "../SelectionBoard";

// ── CTC Selection · pestaña «Selección» ─────────────────────────────────────
// La otra rama: Red, Blue y Gold comprados EN FIRME para vender como productor
// — lo contrario de los «Contratos Vigentes», que se colocan pre-vendidos.
//
// `tyrian` no está y no es un olvido: va a subasta y no se compra en firme. Lo
// impide el CHECK de `black_negotiations`, así que aunque alguien lo pasara
// aquí la base lo rechazaría.
export default function SeleccionTab() {
  return <SelectionBoard grados={["red", "blue", "gold"]} />;
}
