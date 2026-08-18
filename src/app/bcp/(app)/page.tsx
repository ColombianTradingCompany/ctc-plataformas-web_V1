import { ConsoleScaffold } from "@/components/panel/ConsoleScaffold";
import { CONSOLES } from "@/lib/panel/consoles";

// ── BCP · Panel ──────────────────────────────────────────────────────────────
// El BCP dejó de ser la consola del pasaporte del lote el 2026-08-18: PR-A del
// paso (ii) (V4.24) se llevó al OCP productores, fincas, lotes, nominados,
// arena, galardonados, club, catálogo, black stock y el CRM de CaaS — y con
// ellos el tablero de KPIs que vivía en esta ruta, que ahora es el panel del OCP.
//
// ⚠️ ESTA CONSOLA ESTÁ MOMENTÁNEAMENTE CASI VACÍA, Y ES LO ESPERADO. Lo que le
// toca —Direccionamiento, Usuarios y credenciales, Documentación del sistema,
// Mapa de Trabajo, Consumo de IA, Automatizaciones, GVG-Space y la Red de
// Socios— está hoy repartido entre el ECP y el OCP, y llega en PR-B. El plan lo
// anticipa y lo acepta (§3.3): «entre PR-A y PR-B el rail del BCP es solo
// Panel», porque el único operador es el owner.
//
// Por eso este scaffold marca `built: true` con `href` a la ruta donde el módulo
// vive HOY: decir «construido» y dejar al operador buscándolo es peor que no
// decir nada (es la regla que documenta `ConsoleScaffold`). Cuando PR-B los
// mueva, estos href pasan a `/bcp/*` y dejan de cruzar de consola.
export default function BcpHomePage() {
  const c = CONSOLES.bcp;
  return (
    <ConsoleScaffold
      code={c.code}
      name={c.name}
      accent={c.accent}
      intro="La consola del NEGOCIO: qué dice la casa, cómo está configurado el sistema y quién forma la red de socios. El pasaporte del lote —del productor al catálogo— se opera desde el OCP; aquí se decide el marco dentro del cual esa operación ocurre. Los módulos de abajo ya existen y funcionan: siguen alojados en su consola de origen hasta que la segunda tanda de la reorganización los traiga a esta."
      modules={[
        {
          name: "Direccionamiento",
          desc: "Qué dice la casa y con qué cifras: definición de contexto por unidad (CTCX · KR · CHP) y los Grados de Calidad con UNA sola definición. Hoy en el ECP.",
          built: true,
          href: "/ecp/direccionamiento",
        },
        {
          name: "Usuarios y credenciales",
          desc: "Quién entra, a qué consola y con qué permisos. La matriz de permisos hecha software. Hoy en el ECP.",
          built: true,
          href: "/ecp/usuarios",
        },
        {
          name: "Documentación del sistema",
          desc: "El mapa interactivo de la plataforma y sus versiones selladas. Hoy en el ECP.",
          built: true,
          href: "/ecp/documentacion",
        },
        {
          name: "Mapa de Trabajo",
          desc: "El estado de los frentes abiertos, para el owner. Hoy en el ECP.",
          built: true,
          href: "/ecp/mapa",
        },
        {
          name: "Consumo de IA",
          desc: "Qué gasta cada integración y en qué modelo. Hoy en el ECP.",
          built: true,
          href: "/ecp/consumo",
        },
        {
          name: "Automatizaciones",
          desc: "Los escenarios de Make y su salud. Hoy en el ECP.",
          built: true,
          href: "/ecp/automatizaciones",
        },
        {
          name: "Red de Socios",
          desc: "Alta, baja y reenvío de credenciales de cada nodo partner. Hoy en el OCP; en el paso (iii) gana una ficha por socio.",
          built: true,
          href: "/ocp/socios",
        },
        {
          name: "GVG-Space",
          desc: "El espacio personal del owner, con su propia cerradura. Hoy en el ECP; sale hacia CommaaS más adelante.",
          built: true,
          href: "/ecp/gvg",
        },
      ]}
    />
  );
}
