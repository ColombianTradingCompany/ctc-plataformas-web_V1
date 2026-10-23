import type { Metadata } from "next";
import { DatasheetTool } from "@/components/tools/datasheet/DatasheetTool";
import { DESCRIPCION, TITULO } from "@/components/tools/datasheet/meta";
import { CTC_EMAIL, CTC_RAZON } from "@/lib/legal";

// ── CTCx Coffee Datasheet Tool · la página (V6.6) ─────────────────────────────────────────────────────────────────────
// Cuelga de `/tools` A PROPÓSITO: ese prefijo está excluido del matcher del proxy (gotcha 12), así que la misma URL abre
// igual en los 19 hosts y dentro de la concha del taller (`tool_versions.src_publico` = `/tools/coffee-datasheet/app`).
// El `<title>` y la `description` son los mismos de la página de paso (`public/tools/coffee-datasheet/…html`) y de la
// columna `tools.meta_description`: `qa-tools-seo-espejo` los compara.

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  authors: [{ name: `${CTC_RAZON} SAS`, url: `mailto:${CTC_EMAIL}` }],
};

export default async function CoffeeDatasheetPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  return (
    <div data-theme="bcp">
      <DatasheetTool langInicial={lang === "en" ? "en" : "es"} />
    </div>
  );
}
