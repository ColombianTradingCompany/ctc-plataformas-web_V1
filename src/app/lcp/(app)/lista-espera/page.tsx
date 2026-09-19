import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { InteresBoard } from "@/components/panel/interes/InteresBoard";
import { InteresTerratalentoBoard } from "@/components/panel/interes/InteresTerratalentoBoard";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── Lista de espera · TODAS las de la red, con filtro (V5.59) ────────────────
// Hasta la V5.58 esta página vivía en el ECP (módulo «ctc-home») y enseñaba UNA
// lista: la de la portada. El owner la redefinió al crear la LCP: «Lista de espera» es el sitio
// donde se ve a todo el que pidió que se le avise, venga de donde venga.
//
// Son SEIS listas y dos tablas: las cinco fuentes de `newsletter_subscribers`
// y `terratalento_interes`, que tiene tabla propia porque recoge rol y municipio
// (material de investigación, no una lista de correo).
//
// ⚠️ ESTO NO SUSTITUYE a los tableros que cada lista tiene junto a lo suyo —
// Roast y X en su CRM, Directorio y Herramientas en la página de su plataforma,
// Terratalento en la suya—. Son el MISMO componente leyendo la MISMA tabla, así
// que no hay dos verdades: marcar a alguien aquí lo marca allá, y la acción
// revalida las dos rutas. CTC Home es la única que solo se mira aquí.
//
// Cada `<InteresBoard>` se escribe entero y no sale de un `.map()` a propósito:
// `qa-crm-interes-check` exige que toda fuente de `SOURCES` tenga tablero
// leyendo el literal `fuente="…"`, y una fuente nueva sin su línea aquí falla.

const LISTAS = [
  { clave: "ctc-home", rotulo: "CTC Home" },
  { clave: "roast", rotulo: "CP Roast" },
  { clave: "x", rotulo: "CP X" },
  { clave: "directorio", rotulo: "Directorio" },
  { clave: "herramientas", rotulo: "Herramientas" },
  { clave: "terratalento", rotulo: "Terratalento" },
] as const;
type ClaveLista = (typeof LISTAS)[number]["clave"];

export default async function ListaDeEsperaPage({
  searchParams,
}: {
  searchParams: Promise<{ lista?: string }>;
}) {
  const { lista } = await searchParams;
  const activa: ClaveLista = LISTAS.some((l) => l.clave === lista) ? (lista as ClaveLista) : "ctc-home";

  // Los pendientes de cada lista, para que el filtro diga dónde hay trabajo sin
  // tener que abrirlas una a una. Dos lecturas cortas: son tablas de decenas de filas.
  const service = createServiceRoleClient();
  const [{ data: subs }, { data: tt }] = await Promise.all([
    service.from("newsletter_subscribers").select("source").is("contacted_at", null),
    service.from("terratalento_interes").select("id").is("contacted_at", null),
  ]);
  const pendientes = new Map<string, number>();
  for (const s of (subs as { source: string }[] | null) ?? []) {
    pendientes.set(s.source, (pendientes.get(s.source) ?? 0) + 1);
  }
  pendientes.set("terratalento", tt?.length ?? 0);

  return (
    <div>
      <nav className={styles.tabs} style={{ flexWrap: "wrap" }} aria-label="Listas de espera">
        {LISTAS.map((l) => {
          const n = pendientes.get(l.clave) ?? 0;
          return (
            <Link
              key={l.clave}
              href={l.clave === "ctc-home" ? "/lcp/lista-espera" : `/lcp/lista-espera?lista=${l.clave}`}
              className={l.clave === activa ? styles.tabActive : undefined}
              aria-current={l.clave === activa ? "page" : undefined}
            >
              {l.rotulo}
              {n > 0 ? ` · ${n}` : ""}
            </Link>
          );
        })}
      </nav>

      {activa === "ctc-home" && (
        <InteresBoard
          fuente="ctc-home"
          titulo="Lista de espera · CTC Home"
          origen="el índice de la red, en la portada"
          intro="Quién dejó su correo en el índice de la red, en la portada, para que se le avise cuando abra. No es un embudo de venta: es la gente que se apuntó sin saber todavía a qué plataforma pertenece."
        />
      )}
      {activa === "roast" && (
        <InteresBoard
          fuente="roast"
          titulo="Lista de espera · Cherry Picked Roast"
          origen="la landing del programa"
          intro="Quién pidió que se le avise cuando abra el programa de tostado (2027). Es la misma lista que enseña el CRM CP Roast."
        />
      )}
      {activa === "x" && (
        <InteresBoard
          fuente="x"
          titulo="Lista de espera · Cherry Picked X"
          origen="la landing del programa"
          intro="Quién pidió que se le avise cuando abra Cherry Picked X (2027). Es la misma lista que enseña el CRM CP X."
        />
      )}
      {activa === "directorio" && (
        <InteresBoard
          fuente="directorio"
          titulo="Lista de espera · Directorio del Café"
          origen="la ficha del Directorio, en el índice de la red de la portada"
          intro="Quién dejó su correo y su especialidad esperando a que se abran las inscripciones. La especialidad es la que declararon al apuntarse; no está verificada."
        />
      )}
      {activa === "herramientas" && (
        <InteresBoard
          fuente="herramientas"
          titulo="Lista de espera · Herramientas del Café"
          origen="la ficha de Herramientas, en el índice de la red de la portada"
          intro="Quién pidió que se le avise de herramientas nuevas, y cuál dijo que le haría falta."
        />
      )}
      {activa === "terratalento" && <InteresTerratalentoBoard />}
    </div>
  );
}
