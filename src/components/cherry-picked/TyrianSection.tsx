"use client";

import { useToast } from "@/components/Toast";
import { eur, fmt } from "./data";
import styles from "./TyrianSection.module.css";

const HALF_KG = 120;
const STEP = 0.5;

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
  const aLeads = bidA >= bidB;

  return (
    <section id="tyrian">
      <div className="wrap">
        <div className={styles.tyrianCard}>
          <div>
            <p className="eyebrow" style={{ color: "#E9B7D2" }}>Subasta · Grado Tyrian · 1 lote por cosecha</p>
            <h2 style={{ margin: "10px 0 14px" }}>Tyrian TY-2713 · Geisha Lavado · Finca La Sirena, Huila</h2>
            <p>
              Una o dos veces al año aparece un café que el comité no puede calificar sin discutir hasta la
              madrugada. Ese es un Tyrian. Este: 91.25 puntos, jazmín, lichi, bergamota y una acidez de champán. El
              lote —240 kg, todo lo que existe— se divide en dos mitades idénticas de 120 kg que se subastan en
              paralelo. Dos pujas, dos ganadores, un café que no volverá a repetirse. Cada mitad viaja con su
              mini-documental y certificado de trazabilidad.
            </p>
            <div className={styles.specs} style={{ marginTop: 18, color: "#F6E9F0", maxWidth: 420 }}>
              <span className={styles.k}>Variedad</span><span>Geisha</span>
              <span className={styles.k}>Proceso</span><span>Lavado, fermentación 96 h</span>
              <span className={styles.k}>Altitud</span><span>1.950 msnm</span>
              <span className={styles.k}>Empaque</span><span>Vacío 6 kg · cajas 24 kg</span>
              <span className={styles.k}>Cierre</span><span>25 de julio · con el embarque del contenedor</span>
            </div>
            <div className={styles.mediaLinks} style={{ marginTop: 20 }}>
              <a href="#" onClick={(e) => { e.preventDefault(); showToast("Video de catación (demo)"); }}>▸ Catación del comité</a>
              <a href="#" onClick={(e) => { e.preventDefault(); showToast("Mini-documental (demo)"); }}>▸ Mini-documental de finca</a>
              <a href="#" onClick={(e) => { e.preventDefault(); showToast("Ficha técnica del TY-2713 (demo PDF)"); }}>▸ Ficha técnica</a>
            </div>
          </div>
          <div className={styles.halves}>
            <div className={styles.bidBox}>
              <div className={styles.hk}>
                Mitad A · 120 kg <span className={styles.leadChip} style={{ visibility: aLeads ? "visible" : "hidden" }}>Puja líder</span>
              </div>
              <hr />
              <span className={styles.k}>Puja actual</span>
              <div className={styles.big}>{eur(bidA)} €/kg</div>
              <div className={styles.sub}>Total mitad: {fmt(Math.round(bidA * HALF_KG))} € · 5 pujadores</div>
              <hr />
              <button className={styles.btnTyrian} onClick={() => onBid("A")}>Pujar {eur(bidA + STEP)} €/kg</button>
            </div>
            <div className={styles.bidBox}>
              <div className={styles.hk}>
                Mitad B · 120 kg <span className={styles.leadChip} style={{ visibility: aLeads ? "hidden" : "visible" }}>Puja líder</span>
              </div>
              <hr />
              <span className={styles.k}>Puja actual</span>
              <div className={styles.big}>{eur(bidB)} €/kg</div>
              <div className={styles.sub}>Total mitad: {fmt(Math.round(bidB * HALF_KG))} € · 3 pujadores</div>
              <hr />
              <button className={styles.btnTyrian} onClick={() => onBid("B")}>Pujar {eur(bidB + STEP)} €/kg</button>
            </div>
            <p className={styles.sub} style={{ gridColumn: "1/-1", fontFamily: "var(--font-spline-mono), monospace", fontSize: 11.5, color: "#EDD3E1" }}>
              Precio de salida: 20,00 €/kg · Se subasta el lote completo, por mitades · Requiere sesión y nivel
              Pintón o superior.
              {!loggedIn && " Inicia sesión para pujar."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
