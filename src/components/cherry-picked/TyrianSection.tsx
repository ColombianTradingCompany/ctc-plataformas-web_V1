"use client";

import { useToast } from "@/components/Toast";
import { eur, fmt } from "./data";
import { useLang, type Lang } from "./i18n";
import styles from "./TyrianSection.module.css";

const HALF_KG = 120;
const STEP = 0.5;

const EN = {
  eyebrow: "Auction · Tyrian grade · 1 lot per harvest",
  h2: "Tyrian TY-2713 · Washed Geisha · Finca La Sirena, Huila",
  body: "Once or twice a year a coffee appears that the committee can't grade without arguing past midnight. That's a Tyrian. This one: 91.25 points — jasmine, lychee, bergamot and a champagne acidity. The lot — 240 kg, all that exists — is split into two identical 120 kg halves auctioned in parallel. Two bids, two winners, one coffee that will never repeat. Each half travels with its mini-documentary and traceability certificate.",
  kVariety: "Variety",
  kProcess: "Process",
  kAlt: "Altitude",
  kPack: "Packaging",
  kClose: "Closes",
  vProcess: "Washed, 96 h fermentation",
  vAlt: "1,950 m a.s.l.",
  vPack: "Vacuum 6 kg · 24 kg boxes",
  vClose: "July 25 · with the container's departure",
  linkCupping: "▸ Committee cupping",
  linkDoc: "▸ Farm mini-documentary",
  linkSheet: "▸ Datasheet",
  toastCupping: "Cupping video (demo)",
  toastDoc: "Mini-documentary (demo)",
  toastSheet: "TY-2713 datasheet (demo PDF)",
  half: "Half",
  leading: "Leading bid",
  current: "Current bid",
  halfTotal: "Half total",
  bidders: "bidders",
  bid: "Bid",
  foot: "Starting price: 20.00 €/kg · The whole lot is auctioned, in halves · Requires an account and Pintón level or higher.",
  footLogin: " Sign in to bid.",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Subasta · Grado Tyrian · 1 lote por cosecha",
    h2: "Tyrian TY-2713 · Geisha Lavado · Finca La Sirena, Huila",
    body: "Una o dos veces al año aparece un café que el comité no puede calificar sin discutir hasta la madrugada. Ese es un Tyrian. Este: 91.25 puntos, jazmín, lichi, bergamota y una acidez de champán. El lote —240 kg, todo lo que existe— se divide en dos mitades idénticas de 120 kg que se subastan en paralelo. Dos pujas, dos ganadores, un café que no volverá a repetirse. Cada mitad viaja con su mini-documental y certificado de trazabilidad.",
    kVariety: "Variedad",
    kProcess: "Proceso",
    kAlt: "Altitud",
    kPack: "Empaque",
    kClose: "Cierre",
    vProcess: "Lavado, fermentación 96 h",
    vAlt: "1.950 msnm",
    vPack: "Vacío 6 kg · cajas 24 kg",
    vClose: "25 de julio · con el embarque del contenedor",
    linkCupping: "▸ Catación del comité",
    linkDoc: "▸ Mini-documental de finca",
    linkSheet: "▸ Ficha técnica",
    toastCupping: "Video de catación (demo)",
    toastDoc: "Mini-documental (demo)",
    toastSheet: "Ficha técnica del TY-2713 (demo PDF)",
    half: "Mitad",
    leading: "Puja líder",
    current: "Puja actual",
    halfTotal: "Total mitad",
    bidders: "pujadores",
    bid: "Pujar",
    foot: "Precio de salida: 20,00 €/kg · Se subasta el lote completo, por mitades · Requiere sesión y nivel Pintón o superior.",
    footLogin: " Inicia sesión para pujar.",
  },
  de: {
    eyebrow: "Auktion · Grad Tyrian · 1 Lot pro Ernte",
    h2: "Tyrian TY-2713 · Geisha, gewaschen · Finca La Sirena, Huila",
    body: "Ein- bis zweimal im Jahr taucht ein Kaffee auf, den das Komitee nicht bewerten kann, ohne bis in die Nacht zu diskutieren. Das ist ein Tyrian. Dieser: 91,25 Punkte — Jasmin, Litschi, Bergamotte und eine Champagner-Säure. Der Lot — 240 kg, alles, was existiert — wird in zwei identische Hälften à 120 kg geteilt, die parallel versteigert werden. Zwei Gebote, zwei Gewinner, ein Kaffee, der sich nie wiederholt. Jede Hälfte reist mit ihrem Mini-Dokumentarfilm und Rückverfolgbarkeitszertifikat.",
    kVariety: "Varietät",
    kProcess: "Aufbereitung",
    kAlt: "Höhenlage",
    kPack: "Verpackung",
    kClose: "Ende",
    vProcess: "Gewaschen, 96 h Fermentation",
    vAlt: "1.950 m ü. M.",
    vPack: "Vakuum 6 kg · 24-kg-Kartons",
    vClose: "25. Juli · mit der Verschiffung des Containers",
    linkCupping: "▸ Verkostung des Komitees",
    linkDoc: "▸ Finca-Mini-Doku",
    linkSheet: "▸ Datenblatt",
    toastCupping: "Verkostungsvideo (Demo)",
    toastDoc: "Mini-Doku (Demo)",
    toastSheet: "Datenblatt des TY-2713 (Demo-PDF)",
    half: "Hälfte",
    leading: "Führendes Gebot",
    current: "Aktuelles Gebot",
    halfTotal: "Summe Hälfte",
    bidders: "Bietende",
    bid: "Bieten:",
    foot: "Startpreis: 20,00 €/kg · Versteigert wird der gesamte Lot, in Hälften · Erfordert ein Konto und Level Pintón oder höher.",
    footLogin: " Melde dich an, um zu bieten.",
  },
};

export function TyrianSection({
  loggedIn,
  bidA,
  bidB,
  onBid,
}: {
  loggedIn: boolean;
  bidA: number;
  bidB: number;
  onBid: (half: "A" | "B") => void;
}) {
  const { showToast } = useToast();
  const lang = useLang();
  const t = T[lang];
  const aLeads = bidA >= bidB;

  return (
    <section id="tyrian">
      <div className="wrap">
        <div className={styles.tyrianCard}>
          <div>
            <p className="eyebrow" style={{ color: "#E9B7D2" }}>{t.eyebrow}</p>
            <h2 style={{ margin: "10px 0 14px" }}>{t.h2}</h2>
            <p>{t.body}</p>
            <div className={styles.specs} style={{ marginTop: 18, color: "#F6E9F0", maxWidth: 420 }}>
              <span className={styles.k}>{t.kVariety}</span><span>Geisha</span>
              <span className={styles.k}>{t.kProcess}</span><span>{t.vProcess}</span>
              <span className={styles.k}>{t.kAlt}</span><span>{t.vAlt}</span>
              <span className={styles.k}>{t.kPack}</span><span>{t.vPack}</span>
              <span className={styles.k}>{t.kClose}</span><span>{t.vClose}</span>
            </div>
            <div className={styles.mediaLinks} style={{ marginTop: 20 }}>
              <a href="#" onClick={(e) => { e.preventDefault(); showToast(t.toastCupping); }}>{t.linkCupping}</a>
              <a href="#" onClick={(e) => { e.preventDefault(); showToast(t.toastDoc); }}>{t.linkDoc}</a>
              <a href="#" onClick={(e) => { e.preventDefault(); showToast(t.toastSheet); }}>{t.linkSheet}</a>
            </div>
          </div>
          <div className={styles.halves}>
            <div className={styles.bidBox}>
              <div className={styles.hk}>
                {t.half} A · 120 kg <span className={styles.leadChip} style={{ visibility: aLeads ? "visible" : "hidden" }}>{t.leading}</span>
              </div>
              <hr />
              <span className={styles.k}>{t.current}</span>
              <div className={styles.big}>{eur(bidA, lang)} €/kg</div>
              <div className={styles.sub}>{t.halfTotal}: {fmt(Math.round(bidA * HALF_KG), lang)} € · 5 {t.bidders}</div>
              <hr />
              <button className={styles.btnTyrian} onClick={() => onBid("A")}>{t.bid} {eur(bidA + STEP, lang)} €/kg</button>
            </div>
            <div className={styles.bidBox}>
              <div className={styles.hk}>
                {t.half} B · 120 kg <span className={styles.leadChip} style={{ visibility: aLeads ? "hidden" : "visible" }}>{t.leading}</span>
              </div>
              <hr />
              <span className={styles.k}>{t.current}</span>
              <div className={styles.big}>{eur(bidB, lang)} €/kg</div>
              <div className={styles.sub}>{t.halfTotal}: {fmt(Math.round(bidB * HALF_KG), lang)} € · 3 {t.bidders}</div>
              <hr />
              <button className={styles.btnTyrian} onClick={() => onBid("B")}>{t.bid} {eur(bidB + STEP, lang)} €/kg</button>
            </div>
            <p className={styles.sub} style={{ gridColumn: "1/-1", fontFamily: "var(--font-spline-mono), monospace", fontSize: 11.5, color: "#EDD3E1" }}>
              {t.foot}
              {!loggedIn && t.footLogin}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
