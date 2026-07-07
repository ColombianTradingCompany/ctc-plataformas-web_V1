import styles from "./ManifiestoSection.module.css";

const VALUES = [
  { n: "01", title: "Trazabilidad", body: "Del predio geolocalizado a tu tostadora: finca, personas, proceso y evaluación, verificables lote a lote." },
  { n: "02", title: "Transparencia radical", body: "Precios pactados con las referencias del día sobre la mesa, contratos a la vista y un registro sellado que cualquiera puede comprobar." },
  { n: "03", title: "Calidad técnica", body: "Catación a ciegas ante Q-Graders, ficha técnica completa, control de humedad mensual: el rigor no es opcional." },
  { n: "04", title: "Sabor", body: "El grado lo decide la taza — no el marketing. Si un semestre no hay Tyrian, no hay Tyrian." },
  { n: "05", title: "Sostenibilidad", body: "Predios libres de deforestación, primas que llegan a quien cultiva y relaciones que se renuevan cosecha a cosecha." },
];

export function ManifiestoSection() {
  return (
    <section className={styles.manif} id="manifiesto">
      <div className="wrap">
        <p className="eyebrow" style={{ color: "#9FD3B4" }}>Nuestro manifiesto · Por qué hacemos esto</p>
        <h2 className={styles.h2} style={{ marginTop: 12 }}>
          La verdadera especialidad <em>no se defiende sola.</em>
        </h2>
        <p className={styles.lead}>
          El café es una industria que depende de personas — y de algo tan frágil como su motivación para cultivar
          algo extraordinario. Pero el ambiente en el que trabajan es cada vez más homogéneo y hostil: un mercado
          que deshumaniza y comodifica la mayoría de su producción, donde el nombre del productor se disuelve en un
          contenedor anónimo y la excelencia se paga igual que el promedio. <b>Cherry Picked existe para que
          sobresalir vuelva a valer la pena.</b> Cada lote de este catálogo es una apuesta compartida: la de un
          caficultor que decidió no rendirse al promedio, y la tuya al servirlo con su nombre.
        </p>
        <div className={styles.values}>
          {VALUES.map((v) => (
            <div className={styles.value} key={v.n}>
              <span className={styles.vn}>{v.n}</span>
              <h4>{v.title}</h4>
              <p>{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
