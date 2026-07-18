import { ConsoleScaffold } from "@/components/panel/ConsoleScaffold";
import { CONSOLES } from "@/lib/panel/consoles";

// ECP · Executive Control Panel — la dirección de CTC. Es la única consola donde
// se ve todo el modelo a la vez. Módulos por construir, tomados de la visión v3.
export default function EcpHomePage() {
  const c = CONSOLES.ecp;
  return (
    <ConsoleScaffold
      code={c.code}
      name={c.name}
      accent={c.accent}
      intro="La consola de dirección de CTC: nace de la misma sesión que el BCP, pero mira el negocio desde arriba. Aquí vive lo que ningún partner toca — la política de precios y primas, el libro de reservas, las finanzas y la salud de la red. Es el único lugar donde el modelo completo se ve de una sola vez."
      modules={[
        { name: "IT y Plataforma", desc: "CONSTRUIDO — la documentación viva del sistema, los usuarios de las consolas y las credenciales de los socios. En la barra lateral.", built: true },
        { name: "Precios y primas", desc: "Política de precio al comprador y prima al productor por grado; el margen de cada frente de Cherry Picked." },
        { name: "Libro de reservas", desc: "Demanda comprometida por temporada y por ciudad — el piso que sostiene la promesa al Master Roaster." },
        { name: "Finanzas de la red", desc: "Ingresos por lote, ciclo de caja y reparto del valor a lo largo de la cadena." },
        { name: "Salud de la red", desc: "Indicadores del efecto red: productores, compradores y Master Roasters activos, y su efecto sobre la prima." },
      ]}
    />
  );
}
