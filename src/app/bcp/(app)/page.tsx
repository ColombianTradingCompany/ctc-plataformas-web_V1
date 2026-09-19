import { BcpKpis } from "@/components/panel/BcpKpis";
import { ConsoleScaffold } from "@/components/panel/ConsoleScaffold";
import { CONSOLES } from "@/lib/panel/consoles";
import { edicionProxima, edicionVigente, lecturaDeMercado } from "@/lib/pvc/servicio";

export const dynamic = "force-dynamic";

// ── BCP · Panel ───────────────────────────────────────────────────────────
// Tercera forma de esta consola. Fue la del pasaporte del lote hasta la V4.24 (se fue al OCP);
// la de «dirección, configuración y socios» hasta la V5.59; y desde la V5.60 —el cuadro del owner
// del 2026-09-19— es **lo que la casa ES**: su Ecosistema de Valor (cada plataforma de la red, con el
// tablero de lo suyo) y la configuración del sistema. «Herramientas Internas» volvió al ECP.
//
// LOS KPI SE QUEDAN AQUÍ aunque el Modelo Económico ya viva en el ECP, a propósito: son las cifras
// del NEGOCIO —el precio que rige, lo que le da al productor sobre la Federación, cuánto se ha movido
// el mercado desde el corte y qué precio viene— y esta es la consola «Business». Enlazan al módulo,
// allá. El Panel del ECP es otra cosa: el Tablero de Ejecución.
// El índice de módulos sigue debajo — un tablero que no deja navegar es peor que un índice.
export default async function BcpHomePage() {
  const c = CONSOLES.bcp;
  const [vigente, proxima, mercado] = await Promise.all([
    edicionVigente(), edicionProxima(), lecturaDeMercado(),
  ]);
  return (
    <ConsoleScaffold
      code={c.code}
      name={c.name}
      accent={c.accent}
      intro="La consola del NEGOCIO: el Ecosistema de Valor —cada plataforma de la red, con el tablero de lo suyo— y la configuración del sistema. Con qué decide la casa (los modelos) y qué tiene pendiente está en el ECP; el pasaporte del lote, en el OCP; y lo que entra de fuera, en la LCP."
      badge="Consola operativa · las cifras salen del Modelo Económico"
      kpis={<BcpKpis vigente={vigente} proxima={proxima} mercado={mercado} />}
      modules={[
        // Ecosistema de Valor — cada plataforma de la red, con el tablero de lo SUYO (V5.60).
        { name: "Herramientas del Café", desc: "La disponibilidad de cada herramienta, el Plus, las solicitudes y su lista de espera.", built: true, href: "/bcp/herramientas" },
        { name: "Directorio del Café", desc: "La verificación de las fichas (Aceptar · Revisar · Rechazar), la moderación del muro y su lista de espera.", built: true, href: "/bcp/directorio" },
        { name: "Coffeed", desc: "El muro de noticias de la red y su Redacción: lo que se publica aquí aparece en KR, Cherry Picked y el Directorio.", built: true, href: "/bcp/coffeed" },
        { name: "CTC Tech · Varietales Registrados", desc: "Los leads de cada superficie de captación, con su hilo de respuestas.", built: true, href: "/bcp/ctc-tech" },
        { name: "Terratalento", desc: "El match de las jornadas de recolecta, el roster de recolectores y la lista de espera previa al lanzamiento.", built: true, href: "/bcp/terratalento" },
        { name: "Kaffetal Regal Arena · Club", desc: "La vitrina —temporadas, sesiones, la jornada— y la membresía que alimenta.", built: true, href: "/bcp/arena" },
        // Configuración del Sistema
        { name: "Usuarios y credenciales", desc: "Quién entra, a qué consola y con qué nivel. La matriz de permisos hecha software.", built: true, href: "/bcp/usuarios" },
        { name: "Socios de la red", desc: "Alta, baja y reenvío de credenciales de cada nodo partner.", built: true, href: "/bcp/socios" },
        { name: "Documentación del sistema", desc: "El mapa interactivo de la plataforma y sus versiones selladas, navegables desde aquí.", built: true, href: "/bcp/documentacion" },
        { name: "Mapa de Trabajo", desc: "El estado de los frentes abiertos, para el owner.", built: true, href: "/bcp/mapa" },
        { name: "Consumo de IA", desc: "Qué gasta cada integración, en qué modelo y con qué tendencia.", built: true, href: "/bcp/consumo" },
        { name: "Manejo de Plataformas", desc: "Cómo se presenta cada superficie de la red: estado, SEO y disponibilidad.", built: true, href: "/bcp/plataformas" },
      ]}
    />
  );
}
