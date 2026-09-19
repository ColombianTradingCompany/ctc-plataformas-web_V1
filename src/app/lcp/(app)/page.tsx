import { ConsoleScaffold } from "@/components/panel/ConsoleScaffold";
import { CONSOLES } from "@/lib/panel/consoles";

// LCP · Lead Control Panel — «Relationship». La cuarta consola (V5.59): todo lo que ENTRA de
// fuera y a quién se le responde. Nace con módulos que ya existían —vinieron del ECP y del OCP—,
// así que su Panel no promete nada: enlaza a lo que hay.
export default function LcpHomePage() {
  const c = CONSOLES.lcp;
  return (
    <ConsoleScaffold
      code={c.code}
      name={c.name}
      accent={c.accent}
      intro="La consola de la relación: lo que entra de fuera —un correo, un formulario, alguien que pide que se le avise— y a quién se le ha respondido ya. No decide precios ni mueve lotes; lleva la cuenta de con quién está hablando la casa."
      modules={[
        { name: "Buzón de entrada", desc: "El correo de la red. Cada colaborador ve el dirigido a su etiqueta @ctcexport.com; responder o reenviar pide nivel admin.", built: true, href: "/lcp/buzon" },
        { name: "Leads · Recepción", desc: "Las consultas generales de «Escríbenos», con su cuenta de plataforma ya creada y el hilo de respuestas.", built: true, href: "/lcp/leads" },
        { name: "Lista de espera", desc: "Todas las listas de la red en un sitio, con filtro: la portada, Roast, X, Directorio, Herramientas y Terratalento.", built: true, href: "/lcp/lista-espera" },
        { name: "CRM CP CaaS", desc: "El kanban de los proyectos propuestos desde la superficie CaaS.", built: true, href: "/lcp/crm/caas" },
        { name: "CRM CP Green", desc: "Los compradores de la tienda. La etapa se deduce de sus pedidos; solo se guarda cuando alguien la fija a mano.", built: true, href: "/lcp/crm/green" },
        { name: "CRM CP Roast · X", desc: "Las listas de espera de los dos programas que abren en 2027.", built: true, href: "/lcp/crm/roast" },
      ]}
    />
  );
}
