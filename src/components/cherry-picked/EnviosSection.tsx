import styles from "./EnviosSection.module.css";

const ZONE_ROWS = [
  { z: "Z1", rc: "#1C4532", coverage: "Países Bajos · Bélgica · Luxemburgo", price: "0,10 €/kg" },
  { z: "Z2", rc: "#B01F24", coverage: "Alemania · Francia · Dinamarca", price: "0,18 €/kg" },
  { z: "Z3", rc: "#1F4FB0", coverage: "Austria · Chequia · Polonia · Italia", price: "0,25 €/kg" },
  { z: "Z4", rc: "#A87A14", coverage: "España · Suecia · Hungría · Eslovenia · Croacia", price: "0,35 €/kg" },
  { z: "Z5", rc: "#66023C", coverage: "Portugal · Grecia · Irlanda · Finlandia · Bálticos · Rumanía · Bulgaria", price: "0,45 €/kg" },
];

export function EnviosSection() {
  return (
    <section id="envios">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Última milla · Tarifa fija por kg · Desde Ámsterdam</p>
            <h2>Un precio de café, un precio de envío. Sin sorpresas.</h2>
          </div>
          <p>
            Los precios del catálogo son EXW bodega Ámsterdam y <strong>no incluyen la última milla</strong>. Para
            que nunca tengas que pedir cotización, la UE se divide en 5 círculos concéntricos con tarifa fija por
            kilo. Eliges tu zona en el carrito y listo.
          </p>
        </div>
        <details className={styles.shipd}>
          <summary>
            Ver cobertura de zonas y tarifas <span className={styles.schev}>▾</span>
          </summary>
          <div className={styles.shipGrid}>
            <div className={styles.rings} role="img" aria-label="Cinco zonas concéntricas de envío desde Ámsterdam">
              <div className={styles.ring} style={{ ["--rc" as string]: "#66023C", width: "100%", height: "100%" } as React.CSSProperties}>
                <span>Z5 · 0,45 €/kg</span>
              </div>
              <div className={styles.ring} style={{ ["--rc" as string]: "#A87A14", width: "80%", height: "80%" } as React.CSSProperties}>
                <span>Z4 · 0,35 €/kg</span>
              </div>
              <div className={styles.ring} style={{ ["--rc" as string]: "#1F4FB0", width: "60%", height: "60%" } as React.CSSProperties}>
                <span>Z3 · 0,25 €/kg</span>
              </div>
              <div className={styles.ring} style={{ ["--rc" as string]: "#B01F24", width: "40%", height: "40%" } as React.CSSProperties}>
                <span>Z2 · 0,18 €/kg</span>
              </div>
              <div className={styles.ring} style={{ ["--rc" as string]: "#1C4532", width: "20%", height: "20%" } as React.CSSProperties} />
              <div className={styles.ringCenter}>AMS<br />Z1</div>
            </div>
            <div>
              <div className={styles.zoneTable}>
                {ZONE_ROWS.map((r) => (
                  <div key={r.z} className={styles.zoneRow} style={{ ["--rc" as string]: r.rc } as React.CSSProperties}>
                    <span className={styles.zn}>{r.z}</span>
                    <span className={styles.zc}>{r.coverage}</span>
                    <span className={styles.zp}>{r.price}</span>
                  </div>
                ))}
              </div>
              <p className={styles.zoneNote}>
                Tarifas fijas por temporada · pallet consolidado con seguro incluido · Recogida EXW en bodega
                Ámsterdam: 0,00 €/kg · La última milla del spot se cobra al despachar; la de las preórdenes, con el
                saldo al arribo.
              </p>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
