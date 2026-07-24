"use client";

import Image from "next/image";
import { LegalFooter } from "@/components/LegalFooter";
import { QuickNav, type QuickNavSection } from "@/components/QuickNav";
import { PLATAFORMA_LINKS } from "./data";

const DC_SECTIONS: QuickNavSection[] = [
  { id: "beneficios", n: "01", label: "Beneficios", sub: "¿Por qué registrarte?" },
  { id: "pasos", n: "02", label: "Cómo funciona", sub: "De la inscripción a la red" },
  { id: "requisitos", n: "03", label: "Registro", sub: "Qué necesitamos de ti" },
  { id: "ecosistema", n: "04", label: "El ecosistema", sub: "Kaffetal Regal + Cherry Picked" },
];

const LOGOS = {
  parrot: "/images/shared/ctc-logo-parrot.jpg",
  directorio: "/images/shared/directorio-logo.png",
  full: "/images/shared/ctc-logo-full.png",
  kaffetal: "/images/shared/kaffetal-regal-logo.png",
  cherry: "/images/shared/cherry-picked-logo.png",
  gyg: "/images/shared/gyg-illustration.png",
};

// Cara pública del directorio: lo único que ve quien llega sin cuenta.
// Es la parte REAL de esta superficie — la app de adentro sigue siendo maqueta.
export function Landing({
  onInscribirme,
  onIngresar,
}: {
  onInscribirme: () => void;
  onIngresar: () => void;
}) {
  return (
    <div>
      <header className="topbar">
        <div className="wrap topbar__in">
          <a className="marca" href="#top">
            <span className="marca__logo">
              <Image src={LOGOS.directorio} alt="Directorio del Café" width={900} height={900} priority />
            </span>
            <span className="marca__txt">
              Directorio del Café
              <small>Colombia</small>
            </span>
          </a>
          <nav>
            <a href="#beneficios" className="oculta-movil">Beneficios</a>
            <a href="#pasos" className="oculta-movil">Cómo funciona</a>
            <a href="#ecosistema" className="oculta-movil">Ecosistema</a>
            {/* Sigue siendo <a> y no <button> para que herede el tipo mono de
                `.topbar nav a`; el href="#" nunca navega. */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onIngresar();
              }}
            >
              Ingresar
            </a>
            <button className="btn btn--sm btn--oro" type="button" onClick={onInscribirme}>
              Inscribirme
            </button>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* HERO: la tesis es la ficha misma */}
        <section className="hero">
          <Image className="hero__fondo" src={LOGOS.directorio} alt="" width={900} height={900} />
          <div className="wrap hero__grid">
            <div>
              <p className="eyebrow">Directorio de Especialistas del Café · Colombia</p>
              <h1>
                ¿Eres un profesional del café en <em>Colombia?</em>
              </h1>
              <p className="hero__deck">
                Tu trabajo ya existe: la finca, el tueste, la barra, la mesa de catación. Lo que falta
                es que se pueda encontrar. Inscríbete en el primer directorio oficial del país
                y ten una ficha pública que productores, tostadores y marcas puedan consultar.
              </p>
              <div className="hero__acciones">
                <button className="btn" type="button" onClick={onInscribirme}>
                  Inscribirme
                </button>
                <button className="btn btn--fantasma" type="button" onClick={onIngresar}>
                  Ya tengo cuenta
                </button>
              </div>
              <p className="hero__pie">
                <span>Registro gratuito</span><span>·</span><span>Toma menos de 2 minutos</span>
                <span>·</span><span>Ley 1581 de 2012</span>
              </p>
            </div>
            <div className="hero__ficha-env">
              <article className="ficha" aria-label="Ejemplo de ficha del directorio">
                <div className="ficha__cuerpo">
                  <div className="ficha__top">
                    <span className="avatar" style={{ background: "#1B3A2C" }}>MR</span>
                    <div>
                      <p className="ficha__id">DC-0007 · Verificado</p>
                      <h3 className="ficha__nombre">Marcela Rueda</h3>
                      <p className="ficha__lugar">Barichara · Santander</p>
                    </div>
                  </div>
                  <div className="grupo-tags brecha">
                    <span className="tag tag--esp">Catación</span>
                    <span className="tag tag--esp">Tueste</span>
                    <span className="tag tag--cert">Q Grader · CQI</span>
                    <span className="tag tag--cert">SCA Sensory</span>
                  </div>
                  <p className="ficha__bio">
                    Panel sensorial y desarrollo de perfil para microlotes. 9 años entre la mesa de
                    catación y el tostador.
                  </p>
                </div>
                <div className="ficha__pie">
                  <span className="tag tag--kr">Kaffetal Regal</span>
                  <span className="num" style={{ fontSize: ".7rem", color: "var(--gris)", marginLeft: "auto" }}>
                    Así se ve tu ficha
                  </span>
                </div>
              </article>
              <div className="sello hero__sello">
                Directorio oficial<b>Colombia</b>2026
              </div>
            </div>
          </div>
        </section>

        {/* CIFRAS */}
        <section className="wrap">
          <div className="cifras">
            <div className="cifra"><b className="num">44</b><span>Fichas en el directorio</span></div>
            <div className="cifra"><b className="num">21</b><span>Municipios cubiertos</span></div>
            <div className="cifra"><b className="num">12</b><span>Especialidades</span></div>
            <div className="cifra"><b className="num">$0</b><span>Costo de inscripción</span></div>
          </div>
          <p className="aviso-linea" style={{ marginTop: ".7rem" }}>
            Cifras del entorno de demostración · datos simulados
          </p>
        </section>

        {/* BENEFICIOS */}
        <section className="seccion" id="beneficios">
          <div className="wrap">
            <div className="encabezado con-cinta">
              <p className="eyebrow">Beneficios del registro</p>
              <h2>¿Por qué registrarte?</h2>
              <p className="deck">
                Al hacer parte del directorio obtienes cinco cosas concretas — y ninguna te cuesta nada.
              </p>
            </div>
            <div className="beneficios">
              <div className="beneficio">
                <span className="beneficio__icono">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.2" />
                  </svg>
                </span>
                <div>
                  <h4>Mayor visibilidad</h4>
                  <p>Empresas y marcas locales y nacionales pueden encontrar y validar tu especialidad sin pasar por un intermediario.</p>
                </div>
              </div>
              <div className="beneficio">
                <span className="beneficio__icono">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="5" r="2.6" /><circle cx="5.5" cy="18" r="2.6" />
                    <circle cx="18.5" cy="18" r="2.6" /><path d="M12 7.6v4.4M12 12l-5 4M12 12l5 4" />
                  </svg>
                </span>
                <div>
                  <h4>Conexión</h4>
                  <p>Red de contactos directa con caficultores, baristas, tostadores y catadores de todo el país. Escribes desde el mismo directorio.</p>
                </div>
              </div>
              <div className="beneficio">
                <span className="beneficio__icono">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 8h16v11H4z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
                  </svg>
                </span>
                <div>
                  <h4>Oportunidades</h4>
                  <p>Entérate primero de proyectos, ofertas laborales, consultorías, ferias y eventos del sector, publicados en el muro de la red.</p>
                </div>
              </div>
              <div className="beneficio">
                <span className="beneficio__icono">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" />
                  </svg>
                </span>
                <div>
                  <h4>Seminarios <span className="tag tag--nuevo">Nuevo</span></h4>
                  <p>Entrada exclusiva a seminarios presenciales y virtuales para miembros registrados, y 50% de descuento en las capacitaciones con costo.</p>
                </div>
              </div>
              <div className="beneficio">
                <span className="beneficio__icono">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 17l5.5-6 4 4L20 7" /><path d="M20 12V7h-5" />
                  </svg>
                </span>
                <div>
                  <h4>Crecemos juntos</h4>
                  <p>Fortalecemos la industria del café de especialidad del país y llevamos el talento cafetero colombiano más lejos.</p>
                </div>
              </div>
              <div className="beneficio">
                <span className="beneficio__icono">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3l7.5 3.5v5c0 4.4-3.1 8.3-7.5 9.5-4.4-1.2-7.5-5.1-7.5-9.5v-5z" />
                    <path d="M9 12l2.2 2.2L15.5 10" />
                  </svg>
                </span>
                <div>
                  <h4>Tu dato, protegido</h4>
                  <p>La información se usa solo para consolidar el directorio y enviar comunicaciones oficiales. No se comparte con terceros sin tu autorización expresa.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PASOS (secuencia real: por eso van numerados) */}
        <section className="seccion seccion--claro" id="pasos">
          <div className="wrap">
            <div className="encabezado con-cinta">
              <p className="eyebrow">Cómo funciona</p>
              <h2>De la inscripción a la red</h2>
            </div>
            <div className="pasos">
              <div className="paso">
                <p className="paso__n">01</p><h4>Te inscribes</h4>
                <p>Nombre, municipio, contacto, especialidad y certificaciones. Cinco campos, sin costo.</p>
              </div>
              <div className="paso">
                <p className="paso__n">02</p><h4>Creas tu cuenta</h4>
                <p>El Directorio tiene su propio ingreso. Si ya usas Kaffetal Regal o Cherry Picked, entra con el mismo correo o Google: una sola clave para todo el ecosistema.</p>
              </div>
              <div className="paso">
                <p className="paso__n">03</p><h4>Completas tu ficha</h4>
                <p>Añades experiencia, certificaciones y biografía. CTC verifica y le pone el sello.</p>
              </div>
              <div className="paso">
                <p className="paso__n">04</p><h4>Te conectas</h4>
                <p>Navegas el directorio, escribes a otros especialistas y publicas en el muro de la red.</p>
              </div>
            </div>
          </div>
        </section>

        {/* REQUISITOS */}
        <section className="seccion" id="requisitos">
          <div className="wrap req">
            <div>
              <p className="eyebrow">Registro</p>
              <h2>Solo necesitamos<br />información básica</h2>
              <ul className="req__lista brecha">
                <li><i>01</i><div><b>Nombre completo</b><span>Como quieres que aparezca en tu ficha pública.</span></div></li>
                <li><i>02</i><div><b>Departamento y municipio</b><span>Tu ubicación en cualquier región de Colombia — de Nariño a La Guajira.</span></div></li>
                <li><i>03</i><div><b>Teléfono / WhatsApp</b><span>Solo visible para miembros del directorio si tú lo autorizas.</span></div></li>
                <li><i>04</i><div><b>Especialidad</b><span>Barismo, tueste, catación, caficultura, beneficio, preparación de bebidas…</span></div></li>
                <li><i>05</i><div><b>Certificaciones o experiencia</b><span>SCA, CQI, SENA, cursos, autodidacta. La experiencia también cuenta.</span></div></li>
              </ul>
            </div>
            <div>
              <div className="aviso">
                <h4>Manejo de tus datos</h4>
                <p style={{ margin: 0 }}>
                  El tratamiento se realiza bajo estricto cumplimiento de la Ley 1581 de 2012 (Habeas
                  Data). La información se utilizará exclusivamente para la consolidación del directorio
                  profesional del café y el envío de comunicaciones oficiales. No se comparten datos con
                  terceros sin autorización expresa.
                </p>
              </div>
              <div className="tarjeta" style={{ marginTop: "1.2rem" }}>
                <h4>¿Qué es una ficha verificada?</h4>
                <p style={{ fontSize: ".88rem", color: "#4a3a63", margin: 0 }}>
                  CTC contrasta el nombre, el municipio y al menos una certificación declarada. Cuando
                  cuadra, tu ficha recibe el sello y sube en los resultados de búsqueda. Si aún no tienes
                  certificaciones, tu ficha se publica igual — la experiencia declarada también es
                  información útil para quien busca.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="seccion">
          <div className="wrap">
            <div className="cta-final">
              <p className="eyebrow">Es hora de hacer visible tu talento</p>
              <h2>
                Hagamos que el talento cafetero<br />de Colombia se reconozca<br />dentro y fuera del país
              </h2>
              <p className="brecha">
                El registro toma menos de 2 minutos y no tiene costo. Juntos fortalecemos la cadena del
                café colombiano, de la finca a la taza.
              </p>
              <div className="hero__acciones">
                <button className="btn btn--oro" type="button" onClick={onInscribirme}>
                  Inscribirme
                </button>
                <button className="btn btn--fantasma" type="button" onClick={onIngresar}>
                  Ya tengo cuenta
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ECOSISTEMA */}
        <section className="seccion seccion--claro" id="ecosistema">
          <div className="wrap">
            <div className="encabezado con-cinta">
              <p className="eyebrow">Con el respaldo de</p>
              <h2>Dos plataformas, un solo hilo</h2>
              <p className="deck">
                El directorio es la capa de personas sobre el ecosistema de CTC: Kaffetal Regal recoge lo
                mejor de Colombia, Cherry Picked lo reparte en Europa.
              </p>
            </div>
            <div className="eco">
              <a className="eco__card" href={PLATAFORMA_LINKS.kr} target="_blank" rel="noopener noreferrer">
                <div className="eco__logo">
                  <Image src={LOGOS.kaffetal} alt="Kaffetal Regal" width={1254} height={1254} />
                </div>
                <p className="eco__rol">En Colombia · Para el productor</p>
                <p>
                  El portal donde los caficultores registran fincas y lotes georreferenciados, compiten en
                  la Cupping Arena y firman tratos con primas indexadas.
                </p>
                <ul>
                  <li>Registro gratuito de fincas (requisito EUDR) y lotes con ficha técnica</li>
                  <li>Cupping Arena: catación a ciegas ante Q-Graders, dos veces al año</li>
                  <li>Certificación CTC gratis, con feedback de mejora del panel</li>
                </ul>
              </a>
              <a className="eco__card" href={PLATAFORMA_LINKS.cp} target="_blank" rel="noopener noreferrer">
                <div className="eco__logo">
                  <Image src={LOGOS.cherry} alt="Cherry Picked" width={852} height={858} />
                </div>
                <p className="eco__rol">En Europa · Para el tostador</p>
                <p>
                  La vitrina donde las tostadurías compran fracciones de microlotes con nombre propio:
                  spot, preorden, subasta y narrativa lista para la taza.
                </p>
                <ul>
                  <li>Microlotes en fracciones desde el mínimo de cada lote</li>
                  <li>Grados Black · Red · Blue · Gold · Tyrian, decididos en la taza</li>
                  <li>Página pública con QR y trazabilidad EUDR al predio</li>
                </ul>
              </a>
              <a className="eco__card" href={PLATAFORMA_LINKS.home} target="_blank" rel="noopener noreferrer">
                <div className="eco__logo">
                  <Image src={LOGOS.full} alt="Colombian Trading Company" width={2234} height={1231} />
                </div>
                <p className="eco__rol">El puente · Piedecuesta, Santander</p>
                <p>
                  Compañía exportadora de café verde fundada por un padre y un hijo. Muestras, cataciones,
                  cumplimiento EUDR y logística completa.
                </p>
                <ul>
                  <li>Recepción y gestión de muestras · reporte de cataciones</li>
                  <li>Declaración de debida diligencia EUDR en cada despacho</li>
                  <li>Acopio, trilla, empaque, consolidación y embarque a Ámsterdam</li>
                </ul>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="pie">
        <div className="wrap">
          <div className="pie__grid">
            <div>
              <Image
                src={LOGOS.full}
                alt="Colombian Trading Company"
                width={2234}
                height={1231}
                style={{ maxWidth: 230, height: "auto", marginBottom: "1rem" }}
              />
              <p>
                Cafés de Colombia, para el mundo.<br />
                Cra. 4 #8N-30, vía Guatiguará, casa 205, conjunto campestre Santillana · Piedecuesta,
                Santander · info@ctcexport.com
              </p>
            </div>
            <div>
              <h4>El ecosistema</h4>
              <ul>
                <li>Kaffetal Regal — portal del productor</li>
                <li>Cherry Picked — vitrina en Europa</li>
                <li>CTC Tech — tecnologías agrónomas en finca</li>
                <li>CTC Co-Create — proyectos en EE.UU. y Europa</li>
                <li>Varietales registrados — genética verificada</li>
              </ul>
            </div>
            <div>
              <h4>Quiénes somos · G&amp;G</h4>
              <Image className="gyg" src={LOGOS.gyg} alt="Gabriel padre y Gabriel hijo, fundadores de CTC" width={1364} height={1153} />
              <p style={{ marginTop: ".8rem" }} className="voz">
                “Uno conoce cada vereda; el otro, cada tostaduría.”
              </p>
            </div>
          </div>
          <p className="pie__legal">
            Maqueta de demostración · datos simulados · Directorio de Especialistas del Café · Colombia
          </p>
        </div>
      </footer>
      {/* Botón flotante que también lleva de regreso a ctcexport.com (primera
          entrada fija de QuickNav) -- mismo componente que usan Kaffetal Regal
          y Cherry Picked, así que el Directorio queda consistente con el resto
          del ecosistema en vez de ser la única superficie sin salida.
          QuickNav espera los tokens COMPARTIDOS (--primary/--accent/--card/...)
          que llegan por [data-theme] en las otras plataformas; el Directorio
          usa su PROPIO sistema de tokens (.dir: --tinta/--oro/...), así que se
          remapean aquí en vez de tocar globals.css (que sí afectaría a las
          demás plataformas). */}
      <div
        style={{
          ["--primary" as string]: "var(--tinta)",
          ["--primary-deep" as string]: "var(--tinta-2)",
          ["--accent" as string]: "var(--oro)",
          ["--accent-soft" as string]: "#FBE18A",
          ["--card" as string]: "var(--blanco)",
          ["--paper" as string]: "var(--papel)",
          ["--line" as string]: "var(--linea)",
          ["--ink" as string]: "var(--tinta)",
          ["--muted" as string]: "var(--gris)",
        } as React.CSSProperties}
      >
        <QuickNav sections={DC_SECTIONS} />
      </div>
      {/* Pie legal compartido: el mismo NIT, reserva de derechos e insignia de
          versión que cierran CTC Home, Kaffetal Regal y Cherry Picked. */}
      <LegalFooter />
    </div>
  );
}
