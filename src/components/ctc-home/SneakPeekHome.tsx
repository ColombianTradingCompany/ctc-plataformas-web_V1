"use client";

import { SneakPeek } from "@/components/catalogo/SneakPeek";
import { useLang } from "@/components/lang/i18n";

// Igual que `HomeBand`: `page.tsx` es un componente de servidor y no puede leer
// el estado de idioma, así que el puente es este envoltorio de cliente. El
// módulo de la cinta no se engancha a ningún proveedor de idioma a propósito
// —la familia Cherry Picked usa otro— y recibe el valor como prop.
export function SneakPeekHome() {
  return <SneakPeek lang={useLang()} variant="home" />;
}
