"use client";

import { eur, fmt } from "./data";
import { useLang, type Lang } from "./i18n";
import { subastaVencida, tierAlcanza, type MembershipTier, type SubastaPublica } from "@/lib/subastas/tipos";
import styles from "./TyrianSection.module.css";

// ── Subasta Tyrian · la puja del comprador (V5.24) ──────────────────────────
// La maqueta de esta sección (el lote de demostración, dos mitades, puja
// líder, «Pujar») dejó de ser demo: lee la subasta REAL que CTCx abre en /ocp/subastas
// (listarSubastas) y puja con `pujar` — sesión + nivel Pintón o superior,
// la regla de siempre. Sin subasta abierta, la sección cuenta qué es un
// Tyrian y muestra la última adjudicada, si la hay. La regla del monto la
// impone la base (guard trigger): si alguien se adelantó, el toast lo dice.

const EN = {
  eyebrow: "Auction · Tyrian grade · 1 lot per harvest",
  intro: "Once or twice a year a coffee appears that the committee can't grade without arguing past midnight. That's a Tyrian. The whole lot — all that exists — is auctioned in identical halves, in parallel. Two bids, two winners, one coffee that will never repeat.",
  none: "No Tyrian auction is open right now. When the Q-Grader batch awards a Tyrian, it appears here with its opening price and closing date.",
  lastTitle: "Last auction",
  kVariety: "Variety",
  kProcess: "Process",
  kAlt: "Altitude",
  kScore: "Score",
  kClose: "Closes",
  kClosed: "Closed",
  half: "Half",
  whole: "Whole lot",
  leading: "Leading bid",
  yours: "Your bid leads",
  outbid: "You've been outbid",
  current: "Current bid",
  opening: "Opening price",
  halfTotal: "Total",
  bidders: "bidders",
  bid: "Bid",
  closedChip: "Closed",
  awarded: "Awarded",
  foot: (p: string, inc: string) => `Opening price: ${p} €/kg · minimum raise ${inc} €/kg · The whole lot is auctioned · Requires an account and Pintón level or higher.`,
  footLogin: " Sign in to bid.",
  footTier: " Your level doesn't allow bidding yet — it rises with each purchase.",
  masl: "m a.s.l.",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Subasta · Grado Tyrian · 1 lote por cosecha",
    intro: "Una o dos veces al año aparece un café que el comité no puede calificar sin discutir hasta la madrugada. Ese es un Tyrian. El lote completo —todo lo que existe— se subasta en mitades idénticas, en paralelo. Dos pujas, dos ganadores, un café que no volverá a repetirse.",
    none: "No hay ninguna subasta Tyrian abierta ahora. Cuando el bache del Q-Grader galardone un Tyrian, aparecerá aquí con su precio de salida y su cierre.",
    lastTitle: "Última subasta",
    kVariety: "Variedad",
    kProcess: "Proceso",
    kAlt: "Altitud",
    kScore: "Puntaje",
    kClose: "Cierre",
    kClosed: "Cerró",
    half: "Mitad",
    whole: "Lote completo",
    leading: "Puja líder",
    yours: "Tu puja lidera",
    outbid: "Te superaron",
    current: "Puja actual",
    opening: "Precio de salida",
    halfTotal: "Total",
    bidders: "pujadores",
    bid: "Pujar",
    closedChip: "Cerrada",
    awarded: "Adjudicada",
    foot: (p: string, inc: string) => `Precio de salida: ${p} €/kg · incremento mínimo ${inc} €/kg · Se subasta el lote completo · Requiere sesión y nivel Pintón o superior.`,
    footLogin: " Inicia sesión para pujar.",
    footTier: " Tu nivel aún no permite pujar — sube con cada compra.",
    masl: "msnm",
  },
  de: {
    eyebrow: "Auktion · Grad Tyrian · 1 Lot pro Ernte",
    intro: "Ein- bis zweimal im Jahr taucht ein Kaffee auf, den das Komitee nicht bewerten kann, ohne bis in die Nacht zu diskutieren. Das ist ein Tyrian. Der gesamte Lot — alles, was existiert — wird in identischen Hälften parallel versteigert. Zwei Gebote, zwei Gewinner, ein Kaffee, der sich nie wiederholt.",
    none: "Derzeit ist keine Tyrian-Auktion geöffnet. Sobald der Q-Grader-Batch einen Tyrian auszeichnet, erscheint er hier mit Startpreis und Ende.",
    lastTitle: "Letzte Auktion",
    kVariety: "Varietät",
    kProcess: "Aufbereitung",
    kAlt: "Höhenlage",
    kScore: "Punkte",
    kClose: "Ende",
    kClosed: "Beendet",
    half: "Hälfte",
    whole: "Gesamter Lot",
    leading: "Führendes Gebot",
    yours: "Dein Gebot führt",
    outbid: "Du wurdest überboten",
    current: "Aktuelles Gebot",
    opening: "Startpreis",
    halfTotal: "Summe",
    bidders: "Bietende",
    bid: "Bieten:",
    closedChip: "Beendet",
    awarded: "Zugeschlagen",
    foot: (p: string, inc: string) => `Startpreis: ${p} €/kg · Mindesterhöhung ${inc} €/kg · Versteigert wird der gesamte Lot · Erfordert ein Konto und Level Pintón oder höher.`,
    footLogin: " Melde dich an, um zu bieten.",
    footTier: " Dein Level erlaubt noch kein Bieten — es steigt mit jedem Kauf.",
    masl: "m ü. M.",
  },
};

const LOCALE: Record<Lang, string> = { en: "en-GB", es: "es-CO", de: "de-DE" };

export function TyrianSection({
  subastas,
  loggedIn,
  tier,
  onBid,
}: {
  subastas: SubastaPublica[];
  loggedIn: boolean;
  tier: MembershipTier | null;
  onBid: (auctionId: string, fraccion: 1 | 2, amount: number) => void;
}) {
  const lang = useLang();
  const t = T[lang];
  const abierta = subastas.find((s) => s.status === "abierta") ?? null;
  const mostrada = abierta ?? subastas[0] ?? null;
  const viva = !!abierta && !subastaVencida(abierta.endsAt);
  const puedePujar = loggedIn && !!mostrada && tierAlcanza(tier, mostrada.tierMinimo);

  const fecha = (iso: string) => new Date(iso).toLocaleString(LOCALE[lang], { dateStyle: "medium", timeStyle: "short" });

  return (
    <section id="tyrian">
      <div className="wrap">
        <div className={styles.tyrianCard}>
          <div>
            <p className="eyebrow" style={{ color: "#E9B7D2" }}>{t.eyebrow}</p>
            <h2 style={{ margin: "10px 0 14px" }}>
              {mostrada ? `Tyrian · ${mostrada.lotName}${mostrada.fincaName ? ` · ${mostrada.fincaName}` : ""}` : "Tyrian"}
            </h2>
            <p>{t.intro}</p>
            {!mostrada && <p style={{ marginTop: 14, color: "#F6E9F0" }}>{t.none}</p>}
            {mostrada && (
              <div className={styles.specs} style={{ marginTop: 18, color: "#F6E9F0", maxWidth: 420 }}>
                {!abierta && <><span className={styles.k}>{t.lastTitle}</span><span>{mostrada.status === "adjudicada" ? t.awarded : t.closedChip}</span></>}
                {mostrada.variety && <><span className={styles.k}>{t.kVariety}</span><span>{mostrada.variety}</span></>}
                {mostrada.process && <><span className={styles.k}>{t.kProcess}</span><span>{mostrada.process}</span></>}
                {mostrada.altitudeM != null && <><span className={styles.k}>{t.kAlt}</span><span>{fmt(mostrada.altitudeM, lang)} {t.masl}</span></>}
                {mostrada.score != null && <><span className={styles.k}>{t.kScore}</span><span>{eur(mostrada.score, lang)}</span></>}
                <span className={styles.k}>{abierta ? t.kClose : t.kClosed}</span><span>{fecha(mostrada.endsAt)}</span>
              </div>
            )}
            {mostrada?.notes && <p style={{ marginTop: 14, color: "#EDD3E1", fontSize: 14 }}>{mostrada.notes}</p>}
          </div>

          {mostrada && (
            <div className={styles.halves}>
              {mostrada.fraccionesDetalle.map((f) => {
                const label = mostrada.fracciones === 1 ? t.whole : `${t.half} ${f.fraccion === 1 ? "A" : "B"}`;
                const precio = f.lider ?? mostrada.precioSalida;
                return (
                  <div key={f.fraccion} className={styles.bidBox} style={mostrada.fracciones === 1 ? { gridColumn: "1/-1" } : undefined}>
                    <div className={styles.hk}>
                      {label} · {fmt(f.kg, lang)} kg{" "}
                      <span className={styles.leadChip} style={{ visibility: f.lider != null ? "visible" : "hidden" }}>
                        {f.voyLiderando ? t.yours : f.miPuja != null ? t.outbid : t.leading}
                      </span>
                    </div>
                    <hr />
                    <span className={styles.k}>{f.lider != null ? t.current : t.opening}</span>
                    <div className={styles.big}>{eur(precio, lang)} €/kg</div>
                    <div className={styles.sub}>
                      {t.halfTotal}: {fmt(Math.round(precio * f.kg), lang)} € · {f.pujadores} {t.bidders}
                    </div>
                    <hr />
                    {viva ? (
                      <button className={styles.btnTyrian} onClick={() => onBid(mostrada.id, f.fraccion, f.siguiente)} disabled={loggedIn && !puedePujar}>
                        {t.bid} {eur(f.siguiente, lang)} €/kg
                      </button>
                    ) : (
                      <span className={styles.leadChip}>{mostrada.status === "adjudicada" ? t.awarded : t.closedChip}</span>
                    )}
                  </div>
                );
              })}
              <p className={styles.sub} style={{ gridColumn: "1/-1", fontFamily: "var(--font-spline-mono), monospace", fontSize: 11.5, color: "#EDD3E1" }}>
                {t.foot(eur(mostrada.precioSalida, lang), eur(mostrada.incremento, lang))}
                {!loggedIn && t.footLogin}
                {loggedIn && !puedePujar && t.footTier}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
