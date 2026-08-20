import { hrefPuerta, puertaDe } from "@/lib/auth/puertas";
import { SolicitarAcceso } from "./SolicitarAcceso";

// ── «Recuperar acceso» · la puerta de servicio de toda la red (V5.12) ───────
// UNA pantalla para las once puertas. Se sirve desde la RAÍZ en todos los hosts
// (`RAIZ_COMPARTIDA` en src/proxy.ts), así que el mismo camino relativo
// `/recuperar-acceso` funciona en kaffetal-regal.ctcexport.com, en la tienda,
// en un nodo de socio y en la casa matriz.
//
// ⚠️ Lo que viaja en la URL es `?puerta=<id>` — un IDENTIFICADOR de la lista de
// `puertas.ts`, jamás un destino. Aceptar un `?volver=<url>` aquí sería un
// redirect abierto (lección de Herramientas, 2026-08-19), y encima en la
// pantalla donde alguien está recuperando su contraseña: el sitio de CTC
// sirviendo un botón hacia una copia del login. `puertaDe()` sanea lo que llegue.

export default async function RecuperarAccesoPage({
  searchParams,
}: {
  searchParams: Promise<{ puerta?: string }>;
}) {
  const { puerta: cruda } = await searchParams;
  const puerta = puertaDe(cruda);
  const volver = hrefPuerta(puerta, process.env.NODE_ENV === "production");

  return <SolicitarAcceso puerta={puerta} volver={volver} />;
}
