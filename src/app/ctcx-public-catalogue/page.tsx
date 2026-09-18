import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { CatalogoPublicoLanding } from "@/components/catalogo/CatalogoPublicoLanding";

// CTCx Public Catalogue · el pivote público del lote (V5.48).
//
// ⚠️ ES UNA SUPERFICIE DE `www`, NO UN SUBDOMINIO. No lleva línea en
// `SUBDOMAIN_ROUTES` (no hay DNS que crear); su sitio en el mapa de la red es
// `RUTAS_SOLO_WWW`, en `lib/red/subdominios.ts`, que leen a la vez el sitemap y
// el tablero de ECP · Manejo de Plataformas. Sin esa línea la superficie sería
// invisible para los buscadores Y el `superficieConOverrides` de aquí abajo
// quedaría inerte sin fallar — ver el comentario largo en aquel archivo.
//
// Consecuencia práctica: en un host de subdominio esta ruta se reescribe y da
// 404, así que todo enlace que venga de otra superficie tiene que ser ABSOLUTO
// contra `WWW_ORIGIN`.
//
// SIN `force-dynamic` a propósito: esta pantalla no lee la base (el buscador
// valida en el cliente y navega), y `superficieConOverrides` existe justamente
// para que las páginas de marketing sigan rindiéndose estáticas. La que sí es
// dinámica es `[codigo]/page.tsx`.

export const generateMetadata = superficieConOverrides({
  route: "/ctcx-public-catalogue",
  title: "CTCx Public Catalogue · Find my Lot",
  description:
    "Escriba el código de su lote y vea el expediente público que CTCx tiene de él: finca y origen, variedad, proceso, altura, notas de cata y el análisis SCA. Solo lotes publicados.",
  siteName: "Colombian Trading Company",
  image: "ctc-home.jpg",
  imageAlt: "Logotipo de Colombian Trading Company sobre fondo azul corporativo",
  alternateLocale: ["en_GB", "de_DE"],
});

export default function CatalogoPublicoPage() {
  return (
    <div data-theme="ctc-home">
      <OrganizationLd />
      <ToastProvider>
        <LangProvider storageKey="ctc-lang">
          {/* `googleAuth={false}`, como en las superficies Clase B: este host es
              `www`, que sí tiene callback, pero el formulario que se abre aquí
              es el «Escríbenos» general y no queremos mandar a nadie por un
              redirect de OAuth desde una pantalla a la que llegó con una bolsa
              de café en la mano. */}
          <ContactModalProvider googleAuth={false}>
            <CatalogoPublicoLanding />
          </ContactModalProvider>
        </LangProvider>
      </ToastProvider>
    </div>
  );
}
