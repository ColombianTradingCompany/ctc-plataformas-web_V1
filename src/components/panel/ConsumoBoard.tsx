// ── ECP · Consumo de IA ──────────────────────────────────────────────────────
// El tablero del gasto. Componente de servidor: lee la vista agregada y pinta.
// No hay estado ni interacción — mirar cuánto se ha gastado no necesita JS.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { TARIFAS, SIN_TARIFA_CONOCIDA, formatoUSD, tarifaVigente } from "@/lib/ai/precios";
import styles from "@/app/bcp/(app)/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";

type Fila = {
  dia: string;
  proveedor: string;
  modelo: string;
  superficie: string;
  llamadas: number;
  fallidas: number;
  sin_tarifa: number;
  tokens_entrada: number;
  tokens_salida: number;
  tokens_cache_escritos: number;
  tokens_cache_leidos: number;
  costo_usd: number;
};

const miles = (n: number) => n.toLocaleString("es-CO");

function sumar(filas: Fila[]) {
  return filas.reduce(
    (a, f) => ({
      llamadas: a.llamadas + Number(f.llamadas),
      fallidas: a.fallidas + Number(f.fallidas),
      sinTarifa: a.sinTarifa + Number(f.sin_tarifa),
      entrada: a.entrada + Number(f.tokens_entrada),
      salida: a.salida + Number(f.tokens_salida),
      cacheEsc: a.cacheEsc + Number(f.tokens_cache_escritos),
      cacheLec: a.cacheLec + Number(f.tokens_cache_leidos),
      usd: a.usd + Number(f.costo_usd),
    }),
    { llamadas: 0, fallidas: 0, sinTarifa: 0, entrada: 0, salida: 0, cacheEsc: 0, cacheLec: 0, usd: 0 }
  );
}

function agrupar(filas: Fila[], clave: (f: Fila) => string) {
  const m = new Map<string, Fila[]>();
  for (const f of filas) {
    const k = clave(f);
    (m.get(k) ?? m.set(k, []).get(k)!).push(f);
  }
  return [...m.entries()]
    .map(([k, fs]) => ({ k, ...sumar(fs) }))
    .sort((a, b) => b.usd - a.usd || b.llamadas - a.llamadas);
}

// Todo el reloj y toda la consulta viven AQUÍ, fuera del componente: leer la
// hora durante el render es una función impura y el linter de React lo caza.
async function cargar() {
  const ahora = new Date();
  const hoyISO = ahora.toISOString().slice(0, 10);
  const hace30 = new Date(ahora.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  const hace7 = new Date(ahora.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("ai_usage_resumen")
    .select("*")
    .gte("dia", hace30)
    .order("dia", { ascending: false });

  const filas = (data ?? []) as Fila[];

  // La promo de Sonnet 5 es la única cifra del sistema con fecha de caducidad,
  // y cuando expire la factura sube sin que nadie toque nada. Mejor decirlo.
  const sonnet = TARIFAS["claude-sonnet-5"];

  return {
    error,
    hoyISO,
    total30: sumar(filas),
    hoy: sumar(filas.filter((f) => f.dia === hoyISO)),
    semana: sumar(filas.filter((f) => f.dia >= hace7)),
    porSuperficie: agrupar(filas, (f) => f.superficie),
    porModelo: agrupar(filas, (f) => `${f.proveedor} · ${f.modelo}`),
    porDia: [...agrupar(filas, (f) => f.dia)].sort((a, b) => (a.k < b.k ? 1 : -1)).slice(0, 14),
    sonnet,
    promoViva: Boolean(sonnet?.promo && hoyISO <= sonnet.promo.hasta),
    tarifaHoy: tarifaVigente("claude-sonnet-5", ahora),
  };
}

export async function ConsumoBoard() {
  const { error, total30, hoy, semana, porSuperficie, porModelo, porDia, sonnet, promoViva, tarifaHoy } =
    await cargar();

  return (
    <>
      <h1 className={styles.title}>Consumo de IA</h1>
      <p className={styles.subtitle}>
        Una fila por llamada a un modelo, con sus tokens y lo que costó. El precio se congela al anotarlo:
        cambiar una tarifa afecta a lo que se gaste después, nunca al histórico.
      </p>

      {error && <p className={styles.warn}>No se pudo leer el consumo: {error.message}</p>}

      {/* ── Los tres números que se miran primero ── */}
      <div className={styles.digestGrid}>
        <div className={styles.digestCard}>
          <strong>{formatoUSD(hoy.usd)}</strong>
          <span>Hoy · {miles(hoy.llamadas)} llamadas</span>
        </div>
        <div className={styles.digestCard}>
          <strong>{formatoUSD(semana.usd)}</strong>
          <span>7 días · {miles(semana.llamadas)} llamadas</span>
        </div>
        <div className={styles.digestCard}>
          <strong>{formatoUSD(total30.usd)}</strong>
          <span>30 días · {miles(total30.llamadas)} llamadas</span>
        </div>
        <div className={styles.digestCard}>
          <strong>{miles(total30.entrada + total30.salida + total30.cacheEsc + total30.cacheLec)}</strong>
          <span>tokens en 30 días</span>
        </div>
      </div>

      {total30.sinTarifa > 0 && (
        <p className={styles.warn}>
          <b>{miles(total30.sinTarifa)} llamadas sin tarifa</b> en estos 30 días — sus tokens están contados, su coste
          no. Son las de Gemini ({SIN_TARIFA_CONOCIDA.join(", ")}): la tarifa se añade en{" "}
          <code>src/lib/ai/precios.ts</code> y desde entonces cuenta. El total de arriba, por tanto, es un{" "}
          <b>suelo</b>, no la factura entera.
        </p>
      )}

      {promoViva && (
        <p className={styles.warn}>
          📌 <b>Sonnet 5 está a precio de lanzamiento hasta el {sonnet.promo!.hasta}</b> (
          ${tarifaHoy?.entrada}/${tarifaHoy?.salida} por millón). Después pasa a ${sonnet.entrada}/${sonnet.salida}: la
          misma llamada costará un 50% más sin que nadie toque una línea. Es el modelo de Direccionamiento, Coffeed,
          Datawave y RT-Scriptor.
        </p>
      )}

      {/* ── Quién gasta ── */}
      <h2 className={styles.title} style={{ fontSize: 17, marginTop: 26 }}>Por superficie · 30 días</h2>
      <div className={table.scroll}>
        <table className={table.t}>
          <thead>
            <tr>
              <th>Superficie</th><th className={table.num}>Llamadas</th><th className={table.num}>Entrada</th>
              <th className={table.num}>Salida</th><th className={table.num}>Caché leída</th>
              <th className={table.num}>Fallidas</th><th className={table.num}>Coste</th>
            </tr>
          </thead>
          <tbody>
            {porSuperficie.length === 0 && (
              <tr><td colSpan={7} className={styles.empty}>Todavía no se ha anotado ninguna llamada.</td></tr>
            )}
            {porSuperficie.map((s) => (
              <tr key={s.k}>
                <td className={table.name}>{s.k}</td>
                <td className={table.num}>{miles(s.llamadas)}</td>
                <td className={table.num}>{miles(s.entrada)}</td>
                <td className={table.num}>{miles(s.salida)}</td>
                <td className={table.num}>{miles(s.cacheLec)}</td>
                <td className={table.num}>{s.fallidas > 0 ? s.fallidas : "—"}</td>
                <td className={`${table.num} ${table.strong}`}>
                  {s.sinTarifa === s.llamadas ? "sin tarifa" : formatoUSD(s.usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Qué modelo ── */}
      <h2 className={styles.title} style={{ fontSize: 17, marginTop: 26 }}>Por modelo · 30 días</h2>
      <div className={table.scroll}>
        <table className={table.t}>
          <thead>
            <tr>
              <th>Modelo</th><th className={table.num}>Llamadas</th><th className={table.num}>Tokens</th>
              <th className={table.num}>Coste</th>
            </tr>
          </thead>
          <tbody>
            {porModelo.map((m) => (
              <tr key={m.k}>
                <td className={table.code}>{m.k}</td>
                <td className={table.num}>{miles(m.llamadas)}</td>
                <td className={table.num}>{miles(m.entrada + m.salida + m.cacheEsc + m.cacheLec)}</td>
                <td className={`${table.num} ${table.strong}`}>
                  {m.sinTarifa === m.llamadas ? "sin tarifa" : formatoUSD(m.usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Día a día ── */}
      <h2 className={styles.title} style={{ fontSize: 17, marginTop: 26 }}>Día a día · últimos 14 con actividad</h2>
      <div className={table.scroll}>
        <table className={table.t}>
          <thead>
            <tr><th>Día</th><th className={table.num}>Llamadas</th><th className={table.num}>Tokens</th><th className={table.num}>Coste</th></tr>
          </thead>
          <tbody>
            {porDia.map((d) => (
              <tr key={d.k}>
                <td className={table.code}>{d.k}</td>
                <td className={table.num}>{miles(d.llamadas)}</td>
                <td className={table.num}>{miles(d.entrada + d.salida + d.cacheEsc + d.cacheLec)}</td>
                <td className={`${table.num} ${table.strong}`}>{formatoUSD(d.usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles.subtitle} style={{ marginTop: 22 }}>
        <b>La caché es la palanca.</b> Leer de la caché de prompt cuesta la décima parte de la entrada normal; escribirla,
        un 25% más. Por eso las dos columnas van separadas: si «caché leída» crece y el coste no, está funcionando.
      </p>
    </>
  );
}
