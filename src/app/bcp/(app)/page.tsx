import { ConsoleScaffold } from "@/components/panel/ConsoleScaffold";
import { CONSOLES } from "@/lib/panel/consoles";

// ── BCP · Panel ──────────────────────────────────────────────────────────────
// El BCP dejó de ser la consola del pasaporte del lote el 2026-08-18. PR-A del
// paso (ii) (V4.24) se llevó al OCP productores, fincas, lotes, arena, catálogo
// y compañía —con el tablero de KPIs que vivía en esta ruta— y PR-B (V4.25) le
// trajo a cambio lo suyo: dirección, configuración del sistema y red de socios.
//
// Todos los módulos de abajo EXISTEN y están en el rail de esta consola. El
// scaffold sigue siendo la forma correcta de este panel mientras el BCP no
// tenga cifras propias que enseñar: su tablero de mando es una tarea abierta,
// porque las que había medían la operación y se fueron con ella al OCP. Cuando
// haya KPIs de negocio que valga la pena mirar de un vistazo —salud de la red
// de socios, consumo, estado de las automatizaciones— este archivo se convierte
// en ese tablero y deja de ser un índice.
export default function BcpHomePage() {
  const c = CONSOLES.bcp;
  return (
    <ConsoleScaffold
      code={c.code}
      name={c.name}
      accent={c.accent}
      intro="La consola del NEGOCIO: qué dice la casa, cómo está configurado el sistema y quién forma la red de socios. El pasaporte del lote —del productor al catálogo— se opera desde el OCP; aquí se decide el marco dentro del cual esa operación ocurre."
      modules={[
        {
          name: "Direccionamiento",
          desc: "Qué dice la casa y con qué cifras: la definición de contexto por unidad (CTCX · KR · CHP) y los Grados de Calidad, con UNA sola definición de la que todo lo demás cita.",
          built: true,
          href: "/bcp/direccionamiento",
        },
        {
          name: "Usuarios y credenciales",
          desc: "Quién entra, a qué consola y con qué permisos. La matriz de permisos hecha software.",
          built: true,
          href: "/bcp/usuarios",
        },
        {
          name: "Documentación del sistema",
          desc: "El mapa interactivo de la plataforma y sus versiones selladas, navegables desde aquí.",
          built: true,
          href: "/bcp/documentacion",
        },
        {
          name: "Mapa de Trabajo",
          desc: "El estado de los frentes abiertos, para el owner.",
          built: true,
          href: "/bcp/mapa",
        },
        {
          name: "Consumo de IA",
          desc: "Qué gasta cada integración, en qué modelo y con qué tendencia.",
          built: true,
          href: "/bcp/consumo",
        },
        {
          name: "Automatizaciones",
          desc: "Los escenarios de Make que sostienen la espina de integración, y su salud.",
          built: true,
          href: "/bcp/automatizaciones",
        },
        {
          name: "Red de Socios",
          desc: "Alta, baja y reenvío de credenciales de cada nodo partner. En el paso (iii) gana una ficha por socio.",
          built: true,
          href: "/bcp/socios",
        },
        {
          name: "GVG-Space",
          desc: "El espacio personal del owner, tras su propio candado. Sale hacia CommaaS más adelante.",
          built: true,
          href: "/bcp/gvg",
        },
      ]}
    />
  );
}
