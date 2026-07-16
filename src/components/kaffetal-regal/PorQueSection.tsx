import styles from "./PorQueSection.module.css";

// El "¿por qué?" del productor. La sección de Oportunidad responde cuánto vale;
// esta responde por qué vale la pena ENTRAR, QUEDARSE y TERMINAR — los tres
// argumentos de la visión v3 traducidos a la voz del caficultor:
//   1. el dato es suyo aunque no gane, 2. la red le fija la prima,
//   3. el historial se acumula y la demanda vuelve con su nombre.
const REASONS: { k: string; title: string; lead: string; body: React.ReactNode }[] = [
  {
    k: "01",
    title: "Aunque no gane, se lleva algo",
    lead: "Por qué inscribirse",
    body: (
      <>
        <p>
          Registrar su finca y armar la ficha no cuesta nada. Inscribir un lote a la Arena cuesta{" "}
          <b>$80.000</b> — y lo que recibe de vuelta <b>queda suyo</b>: puntaje, perfil sensorial y el feedback
          técnico de Q-Graders profesionales, gane o no gane. Es el diagnóstico que otros pagan en dólares y
          que ninguna cooperativa le entrega.
        </p>
        <p>
          El <b>polígono de su finca</b> se levanta una sola vez y vale para toda la vida del predio: es la
          llave que vuelve su café exportable a la Unión Europea. Se hace ahora, sirve para siempre.
        </p>
      </>
    ),
  },
  {
    k: "02",
    title: "Su prima no la decide CTC. La decide la red.",
    lead: "Por qué la comunidad",
    body: (
      <>
        <p>
          Cada tostador que entra a <b>Cherry Picked</b> mejora la prima que podemos ofrecerle —{" "}
          <b>sin que usted cambie una sola cosa de su café</b>. Y cada productor que entra hace el catálogo
          más atractivo, lo que atrae más tostadores. Más red, mejor precio: para todos, al mismo tiempo.
        </p>
        <p>
          Por eso su Pasaporte del <b>Kaffetal Club</b> no es un trámite: es la diferencia entre venderle a un
          comprador de paso y pertenecer a una red que negocia por usted, cosecha tras cosecha.
        </p>
      </>
    ),
  },
  {
    k: "03",
    title: "De proveedor a marca de origen",
    lead: "Por qué llegar hasta el final",
    body: (
      <>
        <p>
          Cada lote que completa suma a un <b>historial que solo usted tiene</b>: qué varietal a qué altura,
          qué fermentación repite puntaje. Ese acervo se construye cosecha a cosecha, no se compra con dinero
          — y es lo que CTC Tech usa para recomendarle qué ajustar en la próxima.
        </p>
        <p>
          Y al final del camino, su nombre y su finca viajan en el QR de la bolsa al otro lado del Atlántico.
          Cuando el consumidor pide <b>su</b> café por su nombre, usted deja de ser un proveedor: la demanda
          vuelve, con nombre propio, a su finca.
        </p>
      </>
    ),
  },
];

export function PorQueSection({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="porque">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Por qué vale la pena</p>
            <h2>
              Aquí el productor no vende café: <em>compite.</em>
            </h2>
          </div>
          <p>
            Y en cada paso deja un dato que la red reutiliza y que ningún actor tendría solo. Por eso lo que
            gana no se acaba con el lote: se acumula.
          </p>
        </div>

        <div className={styles.grid}>
          {REASONS.map((r) => (
            <article key={r.k} className={styles.card}>
              <span className={styles.k}>{r.k}</span>
              <p className={styles.lead}>{r.lead}</p>
              <h3 className={styles.title}>{r.title}</h3>
              <div className={styles.body}>{r.body}</div>
            </article>
          ))}
        </div>

        <div className={styles.close}>
          <p>
            <b>Por qué la inscripción cuesta $80.000 y no es gratis:</b> porque una catación a ciegas ante
            Q-Graders, el factor de rendimiento y la certificación cuestan de verdad — y porque a la mesa se
            sienta quien se la juega. Aun así, es la palanca de CTC, no una barrera:{" "}
            <b>descontamos o eximimos la inscripción</b> a los productores que queremos ver compitiendo.
            Escríbanos antes de inscribir su primer lote.
          </p>
          <button className="btn btn-solid-accent" onClick={onLogin}>
            Registrar mi primer lote
          </button>
        </div>
      </div>
    </section>
  );
}
