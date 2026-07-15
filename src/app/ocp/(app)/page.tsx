import { ConsoleScaffold } from "@/components/panel/ConsoleScaffold";
import { CONSOLES } from "@/lib/panel/consoles";

// OCP · Operational Control Panel — el espejo de cada interfaz de partner. Lo que
// el ECP dirige, el OCP lo ejecuta. Módulos por construir, tomados de la visión v3.
export default function OcpHomePage() {
  const c = CONSOLES.ocp;
  return (
    <ConsoleScaffold
      code={c.code}
      name={c.name}
      accent={c.accent}
      intro="El piso de operación de la red: el espejo desde el que CTC coordina cada interfaz de partner. Cuando el Centro de Calidad, la Carga, la Nacionalización o el Master Roaster trabajan en su módulo, aquí se ve el despacho, el seguimiento, las excepciones y los relevos. Lo que el ECP dirige, el OCP lo ejecuta."
      modules={[
        { name: "Centro de Calidad", desc: "Trilla, monitoreo de humedad y selección óptica: pergamino → verde exportable, con merma y rendimiento sellados en el pasaporte." },
        { name: "Agente de Carga", desc: "Booking, exportación, BL y tracking del contenedor Colombia → Ámsterdam." },
        { name: "Agente de Nacionalización", desc: "Aduana en destino: liquidación, inspección y liberación hacia la bodega del Master Roaster, con la DDS EUDR enlazada." },
        { name: "Master Roaster", desc: "Recepción, stock por lote, desconsolidación, cola de tueste (Roast/X) y última milla por zona." },
        { name: "Estudio de Contenido", desc: "El partner transversal (Social Media & Identity Value Creation): cola de producción, biblioteca del lote, bandeja de media cruda, calendario de marca — lectura narrativa, cero acceso al dinero." },
        { name: "Relevos y excepciones", desc: "El acta de cada traspaso entre nodos — estado en que se recibe y se entrega el lote — para resolver disputas con el expediente, no con la palabra." },
      ]}
    />
  );
}
