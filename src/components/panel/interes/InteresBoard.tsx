import { createServiceRoleClient } from "@/lib/supabase/server";
import { InteresRow } from "./InteresRow";
import styles from "@/components/panel/shared.module.css";

// ── CRM CP Roast · X · el tablero de INTERÉS ────────────────────────────────
// Paso (iii)-3 del plan V5 (V4.30). Roast y X son programas que **todavía no
// existen**: sus landings dicen «2027» y lo único que recogen es un correo de
// alguien que pidió que le avisaran. Así que esto no es un embudo de ventas —
// es una LISTA DE ESPERA, y el tablero está hecho para la única tarea real que
// tendrá: el día que el programa abra, escribirle a todo el mundo sin perder la
// cuenta de por dónde se iba.
//
// UN COMPONENTE PARA LOS DOS, parametrizado por fuente, por lo mismo que en
// CTC Selection: son la misma tabla, la misma forma y la misma tarea. Dos
// copias habrían divergido a la primera.
//
// QUÉ SE GUARDA Y QUÉ NO — la regla que dejó CRM CP Green (V4.29): todo lo que
// se puede deducir de la fila se deduce al leer, y solo se persiste lo que
// ninguna regla puede saber. Aquí eso es exactamente un dato: si ya se le
// escribió a esa persona (`contacted_at`). El idioma, la antigüedad y el
// recuento salen de la fila.
//
// LA TERCERA FUENTE, `ctc-home`, YA TIENE TABLERO (V4.39). Nació el 2026-08-10,
// cuando el índice de la red en la portada dejó de anunciar la puerta del
// Control Panel y ofreció esta suscripción en su lugar, y estuvo nueve días
// recogiendo correos que nadie podía mirar. No es de Cherry Picked, así que su
// tablero NO vive en «OCP · Cherry Picked» sino en el ECP, junto a Leads.
//
// ⚠️ POR ESO ESTE MÓDULO SE MUDÓ A `src/components/panel/` (V4.39): sirve a DOS
// consolas, y colgando del árbol de una de ellas la siguiente mudanza de módulos
// del OCP se habría llevado por delante una página del ECP. Es la lección que
// dejó `shared.module.css` en PR-B.

export type FuenteInteres = "roast" | "x" | "ctc-home";

type SubRow = {
  id: string;
  email: string;
  lang: string | null;
  created_at: string;
  contacted_at: string | null;
};

const LANG_LABEL: Record<string, string> = { es: "Español", en: "English", de: "Deutsch" };

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

export async function InteresBoard({
  fuente,
  titulo,
  intro,
  origen,
}: {
  fuente: FuenteInteres;
  titulo: string;
  intro: string;
  /** De dónde entran las altas, para el estado vacío. Se parametriza porque
   *  decirle «la landing del programa» a quien mira la lista de CTC Home lo
   *  manda a buscar una landing que no existe. */
  origen: string;
}) {
  const service = createServiceRoleClient();
  const { data } = await service
    .from("newsletter_subscribers")
    .select("id, email, lang, created_at, contacted_at")
    .eq("source", fuente)
    .order("created_at", { ascending: false });
  const filas = (data as SubRow[] | null) ?? [];

  const pendientes = filas.filter((f) => !f.contacted_at);
  const contactados = filas.filter((f) => f.contacted_at);

  // El corte de «este mes» se calcula al leer, como todo lo demás: guardarlo
  // sería un número que envejece solo.
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const esteMes = filas.filter((f) => new Date(f.created_at) >= inicioMes).length;

  const porIdioma = new Map<string, number>();
  for (const f of filas) porIdioma.set(f.lang ?? "—", (porIdioma.get(f.lang ?? "—") ?? 0) + 1);
  const idiomas = [...porIdioma.entries()].sort((a, b) => b[1] - a[1]);

  const kpis = [
    { k: "En la lista", v: String(filas.length), sub: "pidieron que se les avise" },
    { k: "Sin contactar", v: String(pendientes.length), sub: pendientes.length ? "pendientes de escribir" : "todo al día ✓" },
    { k: "Este mes", v: String(esteMes), sub: "altas nuevas" },
    {
      k: "Idiomas",
      v: idiomas.length ? String(idiomas.length) : "—",
      sub: idiomas.map(([l, n]) => `${LANG_LABEL[l] ?? l}: ${n}`).join(" · ") || "sin datos",
    },
  ];

  return (
    <div>
      <h1 className={styles.title}>{titulo}</h1>
      <p className={styles.subtitle}>{intro}</p>

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <div key={kpi.k} className={styles.kpiCard}>
            <span className={styles.kpiTop}>
              <span className={styles.kpiK}>{kpi.k}</span>
            </span>
            <span className={styles.kpiV}>{kpi.v}</span>
            <span className={styles.kpiSub}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      <section style={{ marginTop: 30 }}>
        <div className={styles.sectionHead}>
          <h2>Sin contactar ({pendientes.length})</h2>
        </div>
        {pendientes.length === 0 ? (
          <p className={styles.empty}>
            {filas.length === 0
              ? `Todavía no se ha apuntado nadie. Las altas llegan solas desde ${origen} — aquí no se crea ninguna.`
              : "No queda nadie por contactar en esta lista."}
          </p>
        ) : (
          <div className={styles.list}>
            {pendientes.map((f) => (
              <InteresRow
                key={f.id}
                id={f.id}
                email={f.email}
                idioma={LANG_LABEL[f.lang ?? ""] ?? f.lang ?? "—"}
                desde={fecha(f.created_at)}
                contactado={false}
              />
            ))}
          </div>
        )}
      </section>

      {contactados.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <div className={styles.sectionHead}>
            <h2>Ya contactados ({contactados.length})</h2>
          </div>
          <div className={styles.list}>
            {contactados.map((f) => (
              <InteresRow
                key={f.id}
                id={f.id}
                email={f.email}
                idioma={LANG_LABEL[f.lang ?? ""] ?? f.lang ?? "—"}
                desde={fecha(f.created_at)}
                contactado
                contactadoEl={f.contacted_at ? fecha(f.contacted_at) : null}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
