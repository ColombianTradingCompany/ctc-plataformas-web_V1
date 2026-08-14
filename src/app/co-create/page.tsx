import { permanentRedirect } from "next/navigation";
import { origenDeSuperficie } from "@/lib/red/subdominios";

// ── La puerta vieja de CaaS ──────────────────────────────────────────────────
// «Co-Create» pasó a llamarse **CaaS · Coffee as a Service** el 2026-08-14. El
// término cambió; lo que representa, no. Esta ruta se queda viva SOLO para no
// romper lo que ya salió al mundo:
//   · enlaces compartidos y marcadores de co-create.ctcexport.com,
//   · la tarjeta Open Graph `co-create.jpg`, que ya está indexada,
//   · cualquier enlace interno viejo que se nos escape.
//
// Es un **308 permanente**, no un 307: le dice al buscador que mueva la
// autoridad a la URL nueva en vez de tratar esto como un desvío temporal.
//
// ⚠️ EL DESTINO ES ABSOLUTO EN PRODUCCIÓN, y no es un capricho. En el host
// `co-create.ctcexport.com` el proxy antepone la base del subdominio a toda
// ruta que no empiece ya por ella: un `redirect("/caas")` relativo se
// reescribiría a `/co-create/caas` y daría 404 — exactamente el fallo que este
// archivo existe para evitar. En desarrollo no hay subdominios y la ruta basta.
//
// Y el destino es el SUBDOMINIO de CaaS, no la ruta bajo www: es donde
// `metadatosDeSuperficie` pone el canonical, así que es ahí donde queremos que
// el buscador acumule la autoridad que traía la puerta vieja.
export default function CoCreateRedirectPage() {
  permanentRedirect(process.env.NODE_ENV === "production" ? origenDeSuperficie("/caas") : "/caas");
}
