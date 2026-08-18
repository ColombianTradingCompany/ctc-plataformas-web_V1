import { InteresBoard } from "../InteresBoard";

export const dynamic = "force-dynamic";

// CRM CP Roast — la lista de espera del programa de tostado (2027).
export default function CrmRoastPage() {
  return (
    <InteresBoard
      fuente="roast"
      titulo="CRM CP Roast"
      intro="Quién pidió que se le avise cuando abra Cherry Picked Roast. El programa todavía no existe: esto no es un embudo de venta sino una lista de espera, y está hecho para la tarea que tendrá el día que abra — escribirle a todo el mundo sin perder la cuenta de por dónde se iba."
    />
  );
}
