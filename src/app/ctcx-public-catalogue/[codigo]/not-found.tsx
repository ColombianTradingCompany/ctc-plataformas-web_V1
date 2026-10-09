import { OrganizationLd } from "@/components/JsonLd";
import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { LoteNoEncontrado } from "@/components/catalogo/LoteNoEncontrado";

// V5.199: lo que pinta `notFound()` en `/ctcx-public-catalogue/[codigo]` (una referencia que no lleva a un lote de la vitrina, o
// que no es una referencia): «no encontramos ese lote», el buscador otra vez y las puertas del portal. Mismo envoltorio que la
// landing del portal (`../page.tsx`); responde 404.
export default function LoteNoEncontradoPage() {
  return (
    <div data-theme="ctc-home">
      <OrganizationLd />
      <ToastProvider>
        <LangProvider storageKey="ctc-lang">
          <ContactModalProvider googleAuth={false}>
            <LoteNoEncontrado />
          </ContactModalProvider>
        </LangProvider>
      </ToastProvider>
    </div>
  );
}
