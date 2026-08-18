import { SelectionBoard } from "./SelectionBoard";

// ── CTC Selection · pestaña «Black Stock» ───────────────────────────────────
// La rama histórica del paraguas: la clase de VOLUMEN. Es la pestaña por
// defecto porque es la que ya tiene salida al mundo (la pestaña Black de
// Cherry Picked Green) y la que las jornadas de Arena alimentan solas.
export default function BlackStockTab() {
  return <SelectionBoard grados={["black"]} />;
}
