// ── V5.166 (owner, 2026-10-06) · EL DOSSIER DEL LOTE, FORMATO CTCx ─────────────────────────────────────────────────────
// «Es muy simple. Quiero un formato interesante, que use los recursos que hemos coleccionado del Lote, la Finca y el
// Productor, con las gráficas, el mapa y figuras conceptuales con una diagramación interesante. Organízalo en páginas y
// usa un formato mejor logrado, de la marca CTCx», más la Visa EUDR dentro del dossier.
// Hojas A4 (pantalla = papel): portada · origen (mapa de cafetales, ubicación, altitud, finca y productor) · Visa EUDR
// (estado, cadena finca → lote → DDS → comprador, criterios) · el grado (El Punto × la Tríada, escala CTC) · perfil de
// taza (radar, rueda) · análisis físico (rendimiento, mallas, medidores) · mejora y respaldo (anotaciones de la Rueda del
// Sabor, certificaciones, ficha pública). Presentacional: los datos los reúne `lib/kaffetal/dossierDatos.ts`.
// Solo afirma lo que la plataforma tiene; cada bloque dice su vacío.
// V5.198 (owner, 2026-10-10): el MISMO documento es el Dossier público del CTCx Public Catalogue cuando trae `d.publico`
// (lo pone `lib/kaffetal/dossierPublico.ts`, la lista blanca): sin la Visa ni la Mejora, el origen por región y sin productor,
// el respaldo sin la matriz interna, sin marca de agua y con la vuelta a «Find my Lot».
// V5.201 (owner, 2026-10-10): «El Dossier que abre el carrusel NO debe tener la opción de imprimir en PDF. Es más, quiero que
// sea un html continuo con un botón en la parte inferior para navegar sus titulares». El público ya no son hojas A4: es UNA
// columna de papel con las secciones una tras otra (cada una con su ancla, sin cabecera ni pie de página; la línea legal va una
// vez, al final), el índice de la portada enlaza a ellas y `NavegacionDelDossier` flota abajo. Sin botón de imprimir, y si
// alguien imprime desde el navegador sale solo el aviso de que se consulta en línea. El del productor no cambia.

import Link from "next/link";
import { Big_Shoulders } from "next/font/google";
import { Bean, Bug, Check, Clock, Coffee, Droplets, Grid3x3, Mountain, Scale, Sprout, TriangleAlert, X } from "lucide-react";
import type { DossierCtcxData, EstadoCriterio } from "@/lib/kaffetal/dossierDatos";
import { CTC_LEGAL_LINE } from "@/lib/legal";
import { NIVELES, ORDEN_TRIADA, letras } from "@/lib/pvc/escala";
import type { IconoConjetura } from "@/lib/kaffetal/conjeturas";
import { RUEDA, ZONA_LABEL, zonaDeIntensidad } from "@/lib/catacion/rueda";
import { ICONO_DE_ACIDEZ, ICONO_DE_TEXTURA, IconoDeNota } from "@/components/catacion/IconosDeSabor";
import { TEXTOS, type Textos } from "./textos";
import { BotonImprimir } from "./BotonImprimir";
import { NavegacionDelDossier } from "./NavegacionDelDossier";
import { MarcaDeAgua } from "../blindaje/MarcaDeAgua";
import { Blindaje } from "../blindaje/Blindaje";
import { AVISO_SIN_CONTRATO } from "@/lib/kaffetal/blindaje";
import { AltitudEnLaMontana, BarraDeIntensidad, EscalaCtc, IlustracionGranos, IlustracionTaza, MORADO, Mallas, MatrizDeRespaldo, Medidor, Radar, RadarCva, Rendimiento, RuedaFamilias, oscurece } from "./figuras";
import s from "./dossier.module.css";

const display = Big_Shoulders({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-dossier-display" });

type Hoja = { id: keyof Textos["secciones"] | "portada"; render: (n: number, total: number) => React.ReactNode };

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** V5.201: el ancla de cada sección del Dossier público (la usan el índice de la portada y la navegación de abajo). */
const ancla = (id: Hoja["id"]) => `dossier-${id}`;

function Dato({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }) {
  if (v == null || v === "") return null;
  return (
    <div>
      <div className={s.k}>{k}</div>
      <div className={cx(s.v, mono && s.mono)}>{v}</div>
    </div>
  );
}

/** El icono de cada conjetura (de la familia de iconos del proyecto). */
const ICONO_CONJETURA: Record<IconoConjetura, typeof Coffee> = {
  taza: Coffee,
  gota: Droplets,
  insecto: Bug,
  grano: Bean,
  mallas: Grid3x3,
  montana: Mountain,
  balanza: Scale,
  variedad: Sprout,
  alerta: TriangleAlert,
};

/** V5.167 (owner): el perfil de taza va segundo. El orden de las hojas, en un solo sitio. */
const ORDEN_DE_HOJAS = ["portada", "origen", "taza", "visa", "grado", "fisico", "mejora", "respaldo"];

/** V5.197: una fila de la descriptiva que no es nota (la acidez, la sensación en boca): su ícono, qué se marcó, la intensidad
 *  en casillas y lo que escribió el Q-Grader. */
function Descriptiva({ icono, titulo, linea, sub, intensidad, texto, nota }: { icono: React.ReactNode; titulo: string; linea: string | null; sub: string | null; intensidad: number | null; texto: string; nota: string | null }) {
  return (
    <div className={s.descriptivaCaja}>
      <span className={s.descriptivaIcono}>{icono}</span>
      <div>
        <div className={s.descriptivaTitulo}>
          <span className={s.k}>{titulo}</span>
          <span className={s.descriptivaValor}>{texto}</span>
        </div>
        {linea && (
          <div className={s.descriptivaLinea}>
            {linea}
            {sub ? <span className={s.notaSub}> · {sub}</span> : null}
          </div>
        )}
        {intensidad != null && <BarraDeIntensidad valor={intensidad} color={MORADO} etiqueta={`${titulo}: ${texto}`} />}
        {nota && <div className={s.notaComentario}>«{nota}»</div>}
      </div>
    </div>
  );
}

function IconoCriterio({ estado }: { estado: EstadoCriterio }) {
  const I = estado === "ok" ? Check : estado === "stop" ? X : Clock;
  return (
    <span className={cx(s.criterioIcono, s[estado])}>
      <I size={11} strokeWidth={3} aria-hidden />
    </span>
  );
}

export function DossierCtcx({ d }: { d: DossierCtcxData }) {
  const t = TEXTOS[d.lang];
  const pub = d.publico ?? null;
  const loc = d.lang === "en" ? "en-GB" : "es-CO";
  const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" }) : null);
  const num = (v: number | null | undefined, dec = 2) => (v == null ? null : v.toLocaleString(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec }));
  /** La intensidad de la descriptiva como la escribe la planilla (pasos de 0,5), con la coma o el punto del idioma. */
  const fmtI = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 1 });
  const finca = d.fincas[0] ?? null;
  const c = d.caracterizacion;
  const cif = c.cifras ?? null;
  const g = d.grado;
  const titulo = d.lot.productName || d.lot.name;
  const lugar = finca ? [finca.municipio, finca.departamento, finca.pais].filter(Boolean).join(", ") : null;
  const cosecha =
    d.lot.harvestFrom && d.lot.harvestTo
      ? `${new Date(d.lot.harvestFrom).toLocaleDateString(loc, { day: "2-digit", month: "short" })} ${d.lang === "en" ? "to" : "a"} ${fecha(d.lot.harvestTo)}`
      : null;
  const hayTaza = !!(cif && (cif.sca.length >= 3 || cif.cva.length >= 3 || cif.rueda.length)) || !!d.ficha?.atributos;
  const hayFisico = !!(cif && (cif.pesos || cif.mallas.length || cif.humedadVerde != null || cif.defectos.length));

  // ── Encabezado y pie comunes ──
  const marco = (id: Hoja["id"], n: number, total: number, cuerpo: React.ReactNode) =>
    pub ? (
      // V5.201 · el Dossier público: una SECCIÓN del documento continuo. La franja de la marca va una vez, arriba de la portada;
      // las demás abren con su número y su nombre (es lo que lista la navegación de abajo).
      <section className={s.seccionContinua} key={id} id={ancla(id)} tabIndex={-1} aria-label={id === "portada" ? t.docPublico : t.secciones[id]}>
        {id === "portada" ? (
          <div className={s.franja} aria-hidden>
            <span />
            <span />
            <span />
          </div>
        ) : (
          <div className={s.cabezaSeccion}>
            <span className={s.mono}>{String(n).padStart(2, "0")}</span>
            <span>{t.secciones[id]}</span>
          </div>
        )}
        <div className={s.cuerpo}>{cuerpo}</div>
      </section>
    ) : (
    <section className={s.hoja} key={id} aria-label={id === "portada" ? t.doc : t.secciones[id]}>
      <div className={s.franja} aria-hidden>
        <span />
        <span />
        <span />
      </div>
      {id !== "portada" && (
        <div className={s.cabecera}>
          {/* eslint-disable-next-line @next/next/no-img-element -- documento imprimible, sin optimizador */}
          <img src="/tools/assets/ctcx-logo.png" alt="Colombian Trading Company" />
          <span>
            {t.secciones[id]} ·{" "}
            <span className={s.mono} translate="no">
              {d.lot.reference}
            </span>
          </span>
        </div>
      )}
      <div className={s.cuerpo}>{cuerpo}</div>
      {/* V5.168 · el blindaje: la marca de agua en cada hoja, en pantalla y en el PDF. */}
      {d.blindaje.marca ? <MarcaDeAgua texto={d.blindaje.marca} /> : null}
      <div className={s.pie}>
        <span>{CTC_LEGAL_LINE}</span>
        <span className={s.mono}>
          {t.pagina} {n} / {total}
        </span>
      </div>
    </section>
    );

  const hojas: Hoja[] = [];

  // ── 1 · Portada ─────────────────────────────────────────────────────────
  hojas.push({
    id: "portada",
    render: (n, total) =>
      marco(
        "portada",
        n,
        total,
        <>
          <div className={s.cabecera} style={{ borderBottom: 0, paddingBottom: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- documento imprimible */}
            <img src="/tools/assets/ctcx-logo.png" alt="Colombian Trading Company" style={{ height: "11mm" }} />
            <span style={{ textAlign: "right" }}>
              <b style={{ color: "var(--tinta)", fontSize: "9pt" }}>{pub ? t.docPublico : t.doc}</b>
              <br />
              {t.generado} {fecha(d.generatedOn)}
            </span>
          </div>
          <div className={s.portadaFoto}>
            {finca?.fotoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto firmada de Storage */}
                <img src={finca.fotoUrl} alt={`${t.fotoFinca} ${finca.name}`} />
                <span className={s.portadaFotoPie}>
                  {t.fotoFinca} {finca.name}
                  {lugar ? ` · ${lugar}` : ""}
                </span>
              </>
            ) : d.mapaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- mapa estático de Google
              <img src={d.mapaUrl} alt={t.cafetales} />
            ) : (
              <div className={s.portadaSinFoto}>
                <span className={cx(s.display)} style={{ fontSize: "40pt", opacity: 0.9 }}>
                  {d.lot.reference}
                </span>
              </div>
            )}
          </div>
          <div className={s.portadaTitulo}>
            <div>
              <h1 className={cx(s.display, s.portadaProducto)} style={titulo.length > 34 ? { fontSize: "30pt" } : titulo.length > 22 ? { fontSize: "38pt" } : undefined}>
                {titulo}
              </h1>
              <p className={s.portadaSub}>
                {titulo !== d.lot.name ? `${d.lot.name} · ` : ""}
                <span className={s.mono} translate="no">
                  {d.lot.reference}
                </span>
              </p>
            </div>
            <div className={s.sello}>
              {g.grado ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- sello del grado */}
                  <img src={g.grado.logo} alt={g.grado.nombre} />
                  <div>
                    <div className={s.k}>{t.grado}</div>
                    <div className={s.selloNumero} style={{ color: g.grado.hex }}>
                      {g.grado.nombre}
                    </div>
                    {g.puntaje && (
                      <div className={s.k} style={{ marginTop: "1mm" }}>
                        {Math.round(g.puntaje.puntos).toLocaleString(loc)} {t.puntos}
                        {g.punto ? ` · ${t.punto} ${num(g.punto.valor)}` : ""}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className={s.k}>{t.sinGrado}</div>
              )}
            </div>
          </div>
          <div className={s.datosPortada}>
            <Dato k={t.origenDe} v={lugar} />
            <Dato k={t.altitud} v={d.lot.altitudeM != null ? `${d.lot.altitudeM.toLocaleString(loc)} m` : null} />
            <Dato k={t.variedad} v={d.lot.variety || d.lot.variedades.map((v) => v.nombre).join(", ") || null} />
            <Dato k={t.proceso} v={d.lot.process} />
            <Dato k={t.cosecha} v={cosecha} />
          </div>
          <div className={s.indice}>
            <div>
              <div className={s.h3}>{t.indice}</div>
              <ol className={s.indiceLista}>
                {hojas
                  .slice(1)
                  .map((h, i) => ({ h, n: i + 2 }))
                  .map(({ h, n: pag }) => (
                    <li key={h.id}>
                      {pub ? (
                        // V5.201 · en el documento continuo el índice no da páginas: lleva a la sección.
                        <a href={`#${ancla(h.id)}`} className={s.indiceEnlace}>
                          <span>{h.id === "portada" ? "" : t.secciones[h.id]}</span>
                          <b>{String(pag).padStart(2, "0")}</b>
                        </a>
                      ) : (
                        <>
                          <span>{h.id === "portada" ? "" : t.secciones[h.id]}</span>
                          <b>{String(pag).padStart(2, "0")}</b>
                        </>
                      )}
                    </li>
                  ))}
              </ol>
            </div>
            {d.qrSvg && d.catalogoUrl && (
              <div className={s.qr}>
                <span dangerouslySetInnerHTML={{ __html: d.qrSvg }} />
                CTCx Public Catalogue
              </div>
            )}
          </div>
        </>
      ),
  });

  // V5.198 · el origen PÚBLICO: la región (pin a un decimal, ~11 km), la altitud y la finca con su historia; sin el mapa de los
  // cafetales, sin coordenadas, sin vereda ni tenencia y sin el productor (la vitrina enseña la finca, nunca a la persona).
  const origenPublico = pub ? (
    <>
      <div>
        <h2 className={s.h2}>{t.origenTitulo}</h2>
        {finca && (
          <p className={s.lead}>
            <b style={{ color: "var(--tinta)" }}>{finca.name}</b>
            {lugar ? ` · ${lugar}` : ""}
          </p>
        )}
      </div>
      <figure className={s.mapa} style={{ margin: 0 }}>
        {d.ubicacionUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- mapa estático de Google
          <img className={s.mapaImg} src={d.ubicacionUrl} alt={t.region} />
        ) : (
          <div className={cx(s.vacio, s.mapaImg)} style={{ border: 0 }}>
            {t.region}: {lugar ?? "—"}
          </div>
        )}
        <figcaption className={s.mapaPie}>{t.regionPie}</figcaption>
      </figure>
      {finca && (
        <div className={s.datosYAltitud}>
          <div>
            <div className={s.datos3}>
              <Dato k={t.municipio} v={finca.municipio} />
              <Dato k={t.departamento} v={finca.departamento} />
              <Dato k={t.pais} v={finca.pais} />
              <Dato k={t.altitud} v={(finca.altitud ?? d.lot.altitudeM) != null ? `${(finca.altitud ?? d.lot.altitudeM)!.toLocaleString(loc)} m` : null} />
              <Dato k={t.area} v={finca.hectares != null ? `${finca.hectares.toLocaleString(loc)} ha` : null} />
              <Dato k={t.sistema} v={finca.sistema ? t.sistemaLabel[finca.sistema] ?? finca.sistema : null} />
            </div>
            {finca.infra.length > 0 && (
              <div style={{ marginTop: "3mm" }}>
                <div className={s.k} style={{ marginBottom: "1.2mm" }}>
                  {t.infraTitulo}
                </div>
                <div className={s.chips}>
                  {finca.infra.map((k) => (
                    <span key={k} className={s.chip}>
                      {t.infra[k] ?? k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {(finca.altitud ?? d.lot.altitudeM) != null && (
            <div>
              <div className={s.k}>{t.escalaAltitud}</div>
              <AltitudEnLaMontana metros={(finca.altitud ?? d.lot.altitudeM)!} etiqueta={t.altitud} loc={loc} />
            </div>
          )}
        </div>
      )}
      {finca && (finca.historia || finca.caracteristicas) && (
        <div className={s.mitades}>
          {finca.historia && (
            <div>
              <div className={s.h3}>{t.historia}</div>
              <p className={s.cita} style={{ WebkitLineClamp: 8 }}>
                {finca.historia}
              </p>
            </div>
          )}
          {finca.caracteristicas && (
            <div>
              <div className={s.h3}>{t.caracteristicas}</div>
              <p className={s.cita} style={{ WebkitLineClamp: 8 }}>
                {finca.caracteristicas}
              </p>
            </div>
          )}
        </div>
      )}
      {d.visa.status.code === "eudr_ready" && (
        <div className={s.limpio}>
          <Check size={22} strokeWidth={2.5} color="var(--ok)" aria-hidden />
          <span>{t.eudrListo}</span>
        </div>
      )}
    </>
  ) : null;

  // ── 2 · Origen ──────────────────────────────────────────────────────────
  hojas.push({
    id: "origen",
    render: (n, total) =>
      marco(
        "origen",
        n,
        total,
        pub ? origenPublico : <>
          <div>
            <h2 className={s.h2}>{t.origenTitulo}</h2>
            {finca && (
              <p className={s.lead}>
                <b style={{ color: "var(--tinta)" }}>{finca.name}</b> <span className={s.mono}>{finca.code}</span>
                {lugar ? ` · ${lugar}` : ""}
              </p>
            )}
          </div>
          <div className={s.dosTercios}>
            <figure className={s.mapa} style={{ margin: 0 }}>
              {d.mapaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- mapa estático de Google
                <img className={s.mapaImg} src={d.mapaUrl} alt={t.cafetales} />
              ) : (
                <div className={cx(s.vacio, s.mapaImg)} style={{ border: 0 }}>
                  {t.cafetales}: —
                </div>
              )}
              <figcaption className={s.mapaPie}>
                {t.cafetales}
                {finca ? ` · ${finca.vertices >= 3 ? t.vertices(finca.vertices) : finca.lat != null ? t.puntoGeo : ""}` : ""}
                {finca?.lat != null && finca.lng != null ? (
                  <span className={s.mono}>
                    {" "}
                    · {finca.lat.toFixed(5)}, {finca.lng.toFixed(5)}
                  </span>
                ) : null}
              </figcaption>
            </figure>
            <figure className={s.mapa} style={{ margin: 0 }}>
              {d.ubicacionUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- mapa estático de Google
                <img className={s.mapaImg} src={d.ubicacionUrl} alt={t.ubicacion} />
              ) : (
                <div className={cx(s.vacio, s.mapaImg)} style={{ border: 0 }} />
              )}
              <figcaption className={s.mapaPie}>
                {t.ubicacion}
                {lugar ? ` · ${lugar}` : ""}
              </figcaption>
            </figure>
          </div>
          {finca && (
            <div className={s.datosYAltitud}>
              <div>
                <div className={s.datos}>
                  <Dato k={t.vereda} v={finca.vereda} />
                  <Dato k={t.municipio} v={finca.municipio} />
                  <Dato k={t.departamento} v={finca.departamento} />
                  <Dato k={t.area} v={finca.hectares != null ? `${finca.hectares.toLocaleString(loc)} ha` : null} />
                  <Dato k={t.altitud} v={finca.altitud != null ? `${finca.altitud.toLocaleString(loc)} m` : null} />
                  <Dato k={t.sistema} v={finca.sistema ? t.sistemaLabel[finca.sistema] ?? finca.sistema : null} />
                  <Dato k={t.siembra} v={finca.siembra ? fecha(finca.siembra) : null} />
                  <Dato k={t.tenencia} v={finca.tenencia ? t.tenenciaLabel[finca.tenencia] ?? finca.tenencia : null} />
                </div>
                {finca.infra.length > 0 && (
                  <div style={{ marginTop: "3mm" }}>
                    <div className={s.k} style={{ marginBottom: "1.2mm" }}>
                      {t.infraTitulo}
                    </div>
                    <div className={s.chips}>
                      {finca.infra.map((k) => (
                        <span key={k} className={s.chip}>
                          {t.infra[k] ?? k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {(finca.altitud ?? d.lot.altitudeM) != null && (
                <div>
                  <div className={s.k}>{t.escalaAltitud}</div>
                  <AltitudEnLaMontana metros={(finca.altitud ?? d.lot.altitudeM)!} etiqueta={t.altitud} loc={loc} />
                </div>
              )}
            </div>
          )}
          <div className={s.productor}>
            {d.productor.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto firmada de Storage
              <img className={s.avatar} src={d.productor.avatarUrl} alt={d.productor.nombre} />
            ) : (
              <div className={s.avatar} aria-hidden />
            )}
            <div style={{ display: "grid", gridTemplateColumns: d.productor.galeria.length ? "1fr 62mm" : "1fr", gap: "5mm" }}>
              <div>
                <div className={s.k}>{t.productor}</div>
                <div className={s.v} style={{ fontSize: "12pt" }}>
                  {d.productor.nombre}
                  {d.productor.empresa && d.productor.empresa !== d.productor.nombre ? <span style={{ fontWeight: 400, color: "var(--tinta-suave)" }}> · {d.productor.empresa}</span> : null}
                </div>
                {finca?.historia && (
                  <>
                    <div className={s.k} style={{ marginTop: "2.5mm" }}>
                      {t.historia}
                    </div>
                    <p className={s.cita}>{finca.historia}</p>
                  </>
                )}
                {finca?.caracteristicas && (
                  <>
                    <div className={s.k} style={{ marginTop: "2mm" }}>
                      {t.caracteristicas}
                    </div>
                    <p className={s.cita}>{finca.caracteristicas}</p>
                  </>
                )}
              </div>
              {d.productor.galeria.length > 0 && (
                <div>
                  <div className={s.k} style={{ marginBottom: "1.2mm" }}>
                    {t.galeria}
                  </div>
                  <div className={s.galeria} style={{ gridTemplateColumns: d.productor.galeria.length === 1 ? "1fr" : undefined }}>
                    {d.productor.galeria.map((u, i) => (
                      // eslint-disable-next-line @next/next/no-img-element -- foto firmada de Storage
                      <img key={i} src={u} alt={`${t.galeria} ${i + 1}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {d.fincas.length > 1 && (
            <div>
              <div className={s.h3}>{t.otrasFincas}</div>
              <table className={s.tabla}>
                <tbody>
                  {d.fincas.slice(1).map((f) => (
                    <tr key={f.id}>
                      <td>
                        <b>{f.name}</b> <span className={s.mono}>{f.code}</span>
                      </td>
                      <td>{[f.municipio, f.departamento].filter(Boolean).join(", ")}</td>
                      <td className={s.num}>{f.kg != null ? `${f.kg.toLocaleString(loc)} kg` : ""}</td>
                      <td>{t.pasaporteEstado[f.pasaporte.code] ?? f.pasaporte.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ),
  });

  // ── 3 · Visa EUDR ───────────────────────────────────────────────────────
  const visaOk = d.visa.status.code === "eudr_ready";
  const fincasOk = d.fincas.length > 0 && d.fincas.every((f) => f.pasaporte.code === "apta");
  const eslabones = [
    { titulo: t.cadena.finca, sub: t.cadena.fincaSub, hecho: fincasOk },
    { titulo: t.cadena.lote, sub: t.cadena.loteSub, hecho: visaOk },
    { titulo: t.cadena.dds, sub: t.cadena.ddsSub, hecho: !!d.visa.dds },
    { titulo: t.cadena.ue, sub: t.cadena.ueSub, hecho: !!d.visa.dds?.verificationCode },
  ];
  hojas.push({
    id: "visa",
    render: (n, total) =>
      marco(
        "visa",
        n,
        total,
        <>
          <div className={s.visaCabeza}>
            <div>
              <h2 className={s.h2}>{t.visaTitulo}</h2>
              <p className={s.lead}>{t.visaLead}</p>
              <span className={cx(s.estado, s[`tono_${d.visa.status.tone}`])}>
                {d.visa.status.tone === "ok" ? <Check size={16} strokeWidth={3} aria-hidden /> : d.visa.status.tone === "stop" ? <X size={16} strokeWidth={3} aria-hidden /> : <Clock size={16} strokeWidth={2.5} aria-hidden />}
                {t.visaEstado[d.visa.status.code] ?? d.visa.status.label}
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- sello EUDR voluntario CTC */}
            <img src="/docs/eudr/sello-eudr-voluntario-560.png" alt="Sello EUDR Voluntario CTCx" style={{ opacity: visaOk ? 1 : 0.35, filter: visaOk ? undefined : "grayscale(1)" }} />
          </div>
          <div className={s.cadena}>
            {eslabones.map((e, i) => (
              <div key={e.titulo} className={cx(s.eslabon, e.hecho && s.hecho)}>
                <div className={s.eslabonNum}>
                  0{i + 1} {e.hecho ? <Check size={11} strokeWidth={3} aria-hidden /> : <Clock size={11} strokeWidth={2.5} aria-hidden />}
                </div>
                <div className={s.eslabonTitulo}>{e.titulo}</div>
                <div className={s.eslabonSub}>{e.sub}</div>
              </div>
            ))}
          </div>
          {d.fincas.map((f, i) =>
            i === 0 ? (
              <div key={f.id}>
                <div className={s.h3}>
                  {t.criteriosTitulo} · {f.name} <span className={s.mono} style={{ fontWeight: 400 }}>{f.code}</span>
                </div>
                <ul className={s.criterios}>
                  {f.criterios.map((cr) => (
                    <li key={cr.id}>
                      <IconoCriterio estado={cr.estado} />
                      <span>
                        {t.criterio[cr.id]}
                        {cr.id === "geo" && cr.detalle ? (
                          <span className={s.criterioEstado}> · {cr.detalle === "punto" ? t.geoPunto : t.geoPoligono(Number(cr.detalle.split(":")[1]))}</span>
                        ) : null}
                        {cr.id === "tenencia" && cr.detalle ? <span className={s.criterioEstado}> · {t.tenenciaLabel[cr.detalle] ?? cr.detalle}</span> : null}
                        {cr.id === "revision" && cr.detalle === "sin_remitir" ? <span className={s.criterioEstado}> · {t.sinRemitir}</span> : null}
                      </span>
                      <span className={s.criterioEstado}>{t.estadoCriterio[cr.estado]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p key={f.id} className={s.nota}>
                {f.name} <span className={s.mono}>{f.code}</span> · {t.pasaporteEstado[f.pasaporte.code] ?? f.pasaporte.label}
              </p>
            )
          )}
          <div className={s.tercios}>
            <div className={s.tile}>
              <div className={s.k}>{t.riesgoPais}</div>
              <div className={s.v}>
                {finca?.pais ?? "Colombia"} · {d.visa.paisRiesgo}
              </div>
              <p className={s.nota}>{t.riesgoPaisNota}</p>
            </div>
            <div className={s.tile}>
              <div className={s.k}>{t.dds}</div>
              {d.visa.dds ? (
                <div className={cx(s.v, s.mono)} style={{ fontSize: "9pt", overflowWrap: "anywhere" }}>
                  {d.visa.dds.reference}
                  {d.visa.dds.verificationCode ? ` · ${t.ddsVerificacion} ${d.visa.dds.verificationCode}` : ""}
                  {d.visa.dds.filedAt ? ` · ${fecha(d.visa.dds.filedAt)}` : ""}
                </div>
              ) : (
                <p className={s.nota} style={{ marginTop: "1mm" }}>
                  {t.sinDds}
                </p>
              )}
            </div>
            <div className={s.tile}>
              <div className={s.k}>{t.sellos}</div>
              {d.visa.sellos.length ? (
                <div className={s.chips} style={{ marginTop: "1mm" }}>
                  {d.visa.sellos.map((x) => (
                    <span key={x.label} className={s.chip}>
                      {x.label} · {x.verified ? t.verificado : t.declarado}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={s.nota} style={{ marginTop: "1mm" }}>
                  {t.sinSellos}
                </p>
              )}
            </div>
          </div>
          {finca && (finca.poligono.length >= 3 || finca.lat != null) && (
            <div className={s.geo}>
              {d.mapaUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- mapa estático de Google
                <img src={d.mapaUrl} alt={t.geoTitulo} />
              )}
              <div>
                <div className={s.h3}>{t.geoTitulo}</div>
                <p className={s.nota} style={{ marginTop: 0, marginBottom: "2mm" }}>
                  {finca.poligono.length >= 3 ? t.geoLead : t.geoPuntoLead}
                </p>
                <table className={s.tabla}>
                  <thead>
                    <tr>
                      <th>{t.vertice}</th>
                      <th className={s.num}>{t.latitud}</th>
                      <th className={s.num}>{t.longitud}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(finca.poligono.length >= 3 ? finca.poligono : [{ lat: finca.lat!, lng: finca.lng! }]).slice(0, 8).map((v, i) => (
                      <tr key={i}>
                        <td className={s.mono}>{finca.poligono.length >= 3 ? `V${i + 1}` : "P"}</td>
                        <td className={s.num}>{v.lat.toFixed(6)}</td>
                        <td className={s.num}>{v.lng.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {finca.poligono.length > 8 && <p className={s.nota}>{t.masVertices(finca.poligono.length - 8)}</p>}
              </div>
            </div>
          )}
          <p className={s.noPrint} style={{ margin: 0, display: "flex", gap: 14, flexWrap: "wrap" }}>
            {visaOk && (
              <a href={`/kaffetal-regal/certificacion-lote/${d.lot.id}`} style={{ color: "var(--morado)", fontWeight: 600 }}>
                {t.verVisa}
              </a>
            )}
            {d.fincas.map((f) => (
              <a key={f.id} href={`/kaffetal-regal/certificacion/${f.id}`} style={{ color: "var(--morado)", fontWeight: 600 }}>
                {t.verPasaporte(f.name, f.code)}
              </a>
            ))}
          </p>
        </>
      ),
  });

  // ── El grado (V5.167: sin el ajuste CTCx, sin «lo que pide cada grado»; con la imagen y las variedades del lote) ──
  hojas.push({
    id: "grado",
    render: (n, total) =>
      marco(
        "grado",
        n,
        total,
        <>
          <div className={g.grado ? s.gradoCabeza : undefined}>
            {g.grado && (
              // eslint-disable-next-line @next/next/no-img-element -- sello del grado
              <img src={g.grado.logo} alt={g.grado.nombre} />
            )}
            <div>
              <h2 className={s.h2}>{t.gradoTitulo}</h2>
              <p className={s.lead}>{t.gradoLead}</p>
              {g.grado && (
                <p className={s.lema}>
                  {g.grado.nombre} · &ldquo;{g.grado.lema}&rdquo;
                </p>
              )}
            </div>
          </div>
          {g.punto && g.puntaje ? (
            <div className={s.ecuacion}>
              <div>
                <div className={s.k}>{t.punto}</div>
                <div className={s.ecuacionNum}>{num(g.punto.valor)}</div>
                <div className={s.nota}>{g.punto.protocoloFuente === "cva" ? t.puntoCva : t.puntoSca2004}</div>
              </div>
              <div className={s.ecuacionOp}>×</div>
              <div>
                <div className={s.k}>
                  {t.multiplicador} · {letras(g.triada.triada)}
                </div>
                <div className={s.ecuacionNum}>{g.puntaje.mult.toLocaleString(loc, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div>
              </div>
              <div className={s.ecuacionOp}>=</div>
              <div className={s.ecuacionTotal}>
                <div className={s.k}>{t.total}</div>
                <div className={s.ecuacionNum}>{Math.round(g.puntaje.puntos).toLocaleString(loc)}</div>
              </div>
            </div>
          ) : (
            <div className={s.vacio}>{t.sinEvaluacion}</div>
          )}
          <div className={s.triadaYFoto}>
            <div>
              <div className={s.h3}>{t.tituloTriada}</div>
              {ORDEN_TRIADA.map((a) => {
                const nivel = g.triada.triada[a];
                const razon = g.triada[a];
                return (
                  <div key={a} className={s.filaTriada}>
                    <div className={s.filaTriadaNombre}>{t.triada[a]}</div>
                    <div className={s.filaTriadaNiveles}>
                      {[...NIVELES].map((l) => (
                        <div key={l} className={cx(s.nivel, l === nivel && s.nivelActivo)}>
                          <span className={s.escalonLetra}>{l}</span>
                          <span>{t.niveles[a][l]}</span>
                        </div>
                      ))}
                    </div>
                    {/* El motivo lo escribe el cálculo de la tríada, solo en español. */}
                    {razon.por && d.lang === "es" && <div className={s.porque}>{razon.por}</div>}
                  </div>
                );
              })}
            </div>
            <figure className={s.fotoGrado}>
              {/* eslint-disable-next-line @next/next/no-img-element -- foto del lote o la ilustración de CTCx */}
              <img src={d.imagenGrado.url} alt={d.imagenGrado.porDefecto ? t.imagenDefecto : titulo} />
              {d.imagenGrado.porDefecto && <figcaption className={s.mapaPie}>{t.imagenDefecto}</figcaption>}
            </figure>
          </div>
          {d.variedadesInfo.length > 0 && (
            <div>
              <div className={s.h3}>{t.variedadesTitulo}</div>
              <div className={s.variedades} style={{ gridTemplateColumns: d.variedadesInfo.length > 1 ? "1fr 1fr" : "1fr" }}>
                {d.variedadesInfo.slice(0, 2).map((v) => (
                  <div key={v.nombre} className={s.variedad} style={{ borderLeftColor: v.ficha?.color ?? "var(--linea)" }}>
                    <div className={s.variedadNombre}>
                      {v.nombre}
                      {v.pct != null ? <span className={s.k}> · {Math.round(v.pct)} %</span> : null}
                    </div>
                    {v.ficha ? (
                      <>
                        <div className={s.k}>
                          {v.ficha.grupo} · {v.ficha.tipo}
                        </div>
                        {v.ficha.historia && (
                          <p className={s.cita} style={{ WebkitLineClamp: 3 }}>
                            {v.ficha.historia}
                          </p>
                        )}
                        <div className={s.variedadDatos}>
                          <Dato k={t.origenVariedad} v={v.ficha.lugar} />
                          <Dato k={t.altitudVariedad} v={v.ficha.altitud ? `${v.ficha.altitud[0].toLocaleString(loc)} a ${v.ficha.altitud[1].toLocaleString(loc)} m` : null} />
                          <Dato k={t.granoVariedad} v={v.ficha.grano} />
                        </div>
                        {v.ficha.notas.length > 0 && (
                          <div className={s.chips} style={{ marginTop: "2mm" }}>
                            {v.ficha.notas.map((x) => (
                              <span key={x} className={s.chip}>
                                {x}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className={s.nota}>{t.sinFichaVariedad(v.nombre)}</p>
                    )}
                  </div>
                ))}
              </div>
              <p className={s.nota}>{t.variedadesFuente}</p>
            </div>
          )}
          <div>
            <div className={s.h3}>{t.escalaTitulo}</div>
            <EscalaCtc puntos={g.puntaje?.puntos ?? null} etiqueta={t.escalaTitulo} loc={loc} />
          </div>
        </>
      ),
  });

  // ── 5 · Perfil de taza ──────────────────────────────────────────────────
  // V5.197 (owner, 2026-10-10): la afectiva del CVA en la telaraña de 8 esquinas (las barras salieron) y la descriptiva con
  // un ícono por nota, por tipo de acidez y por textura en boca, cada una con su intensidad de 0 a 15 en casillas por zona.
  // Un 2004 sin CVA conserva su radar de diez atributos (6 a 10); sin planilla, los atributos de la Ficha.
  if (hayTaza) {
    const cva8 = cif && cif.cva.length === 8 ? cif.cva : null;
    const radarSca = !cva8 && cif && cif.sca.length >= 3 ? cif.sca.map((x) => ({ label: x.label, v: x.v })) : null;
    const fichaAttrs = !cva8 && !radarSca && d.ficha?.atributos ? Object.entries(d.ficha.atributos).filter(([, v]) => v != null).map(([k, v]) => ({ label: k, v: Number(v) })) : null;
    const notasRueda = (cif?.rueda ?? []).slice(0, 14);
    // Hasta siete notas caben junto a la rueda; con más, la lista va a dos columnas y la rueda (que ya no se leería) sale.
    const conFigura = notasRueda.length > 0 && notasRueda.length <= 7;
    const desc = cif?.descriptivo ?? null;
    const totalTaza = cva8 ? (cif?.cvaTotal ?? null) : radarSca ? (cif?.scaTotal ?? null) : null;
    const punto = g.punto;
    const intensidad = (v: number | null) => (v == null ? t.sinIntensidad : `${fmtI(v)}/15 · ${ZONA_LABEL[d.lang][zonaDeIntensidad(v)]}`);
    hojas.push({
      id: "taza",
      render: (n, total) =>
        marco(
          "taza",
          n,
          total,
          <>
            <div className={s.cabezaIlustrada}>
              <div>
                <h2 className={s.h2}>{t.tazaTitulo}</h2>
                <p className={s.lead}>{t.tazaLead}</p>
              </div>
              <IlustracionTaza />
            </div>
            <div className={s.afectiva}>
              <div>
                <div className={s.seccionK}>{t.afectiva}</div>
                <div className={s.h3}>{cva8 ? t.afectivaCva : radarSca ? t.afectivaSca : fichaAttrs ? t.afectivaFicha : t.tazaTitulo}</div>
                {cva8 ? (
                  <>
                    <RadarCva items={cva8.map((x) => ({ label: x.corto, v: x.v }))} etiqueta={t.radarCva} loc={loc} />
                    <p className={s.nota} style={{ marginTop: "1mm" }}>
                      {t.escalaCva}
                    </p>
                  </>
                ) : radarSca ? (
                  <Radar items={radarSca} />
                ) : fichaAttrs ? (
                  <Radar items={fichaAttrs} />
                ) : (
                  <div className={s.vacio}>{t.sinEvaluacion}</div>
                )}
              </div>
              <div className={s.columnaTaza}>
                {totalTaza != null && (
                  <div className={s.puntajeCaja}>
                    <div className={s.k}>{cva8 ? t.cvaTitulo : t.totalSca}</div>
                    <div className={s.puntajeNum}>{num(totalTaza)}</div>
                    {punto && <div className={s.puntajeSub}>{Math.abs(punto.valor - totalTaza) < 0.005 ? t.esElPunto : `${t.puntoRige}: ${num(punto.valor)}`}</div>}
                    {cva8 && cif?.cvaTazas && cif.cvaTazas.n > 0 ? <div className={s.puntajeSub}>{t.tazasCva(cif.cvaTazas.n, cif.cvaTazas.u, cif.cvaTazas.d)}</div> : null}
                    {!cva8 && c.b2?.sca?.tazas ? (
                      <div className={s.puntajeSub}>
                        {t.tazas} {c.b2.sca.tazas}
                      </div>
                    ) : null}
                    {punto?.comparativo ? <div className={s.puntajeSub}>{t.comparativo(punto.comparativo.protocolo === "cva" ? "CVA" : "SCA 2004", num(punto.comparativo.total) ?? "")}</div> : null}
                  </div>
                )}
                {desc && (desc.acidez || desc.boca) && (
                  <div>
                    <div className={s.seccionK}>{t.descriptiva}</div>
                    <p className={s.nota} style={{ margin: "0 0 1mm" }}>
                      {t.descriptivaLead}
                    </p>
                    {desc.acidez && (
                      <Descriptiva
                        icono={ICONO_DE_ACIDEZ[desc.acidez.tipo ?? ""]({ size: 24, strokeWidth: 1.7 })}
                        titulo={t.acidez}
                        linea={desc.acidez.tipo ? t.acidezTipo[desc.acidez.tipo][0] : null}
                        sub={desc.acidez.tipo ? t.acidezTipo[desc.acidez.tipo][1] : null}
                        intensidad={desc.acidez.intensidad}
                        texto={intensidad(desc.acidez.intensidad)}
                        nota={desc.acidez.nota}
                      />
                    )}
                    {desc.boca && (
                      <Descriptiva
                        icono={ICONO_DE_TEXTURA[(desc.boca.texturas[0]?.key ?? "") as keyof typeof ICONO_DE_TEXTURA]({ size: 24, strokeWidth: 1.7 })}
                        titulo={t.boca}
                        linea={desc.boca.texturas.length ? desc.boca.texturas.map((x) => x.label).join(" · ") : null}
                        sub={null}
                        intensidad={desc.boca.intensidad}
                        texto={intensidad(desc.boca.intensidad)}
                        nota={desc.boca.nota}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
            {notasRueda.length > 0 && (
              <div>
                <div className={s.seccionK}>{t.descriptiva}</div>
                <div className={s.h3}>{t.notasTitulo}</div>
                <div className={conFigura ? s.notasYRueda : undefined}>
                  <ul className={cx(s.notasDesc, !conFigura && s.notasDosColumnas)}>
                    {notasRueda.map((x) => (
                      <li key={x.id}>
                        <span className={s.notaIcono} style={{ background: `${x.color}1F`, color: oscurece(x.color, 0.2) }}>
                          <IconoDeNota id={x.id} size={24} strokeWidth={1.75} />
                        </span>
                        <span className={s.notaCuerpo}>
                          <span className={s.notaNombre}>
                            {x.nota}
                            {x.comentario ? <span className={s.notaComentario}> «{x.comentario}»</span> : null}
                            {x.defecto && <span className={s.marcaDefecto}>{t.defectoNota}</span>}
                          </span>
                          <span className={s.notaSub}>{[x.contexto, x.etapas].filter(Boolean).join(" · ")}</span>
                        </span>
                        <span className={s.notaIntensidad}>
                          <BarraDeIntensidad valor={x.intensidad} color={x.color} etiqueta={`${x.nota}: ${intensidad(x.intensidad)}`} />
                          <span className={s.notaSub}>
                            <b>{fmtI(x.intensidad)}</b>/15 · {ZONA_LABEL[d.lang][zonaDeIntensidad(x.intensidad)]}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {conFigura && (
                    <figure style={{ margin: 0 }}>
                      <RuedaFamilias
                        familias={RUEDA.map((f) => ({ id: f.id, nombre: d.lang === "en" ? f.en : f.es, color: f.color }))}
                        marcas={notasRueda.map((x) => ({ familiaId: x.familiaId, nota: x.nota, intensidad: x.intensidad, defecto: x.defecto }))}
                      />
                      <figcaption className={s.nota}>{t.ruedaFiguraNota}</figcaption>
                    </figure>
                  )}
                </div>
              </div>
            )}
            {c.b2?.perfil && (
              <div>
                <div className={s.h3}>{t.perfil}</div>
                <p className={s.cita} style={{ WebkitLineClamp: 4 }}>
                  {c.b2.perfil}
                </p>
              </div>
            )}
            {d.evaluacion && (
              <p className={s.nota} style={{ marginTop: "auto" }}>
                {t.fuente[d.evaluacion.fuente]} · {t.fechaAnalisis} {fecha(d.evaluacion.fecha)}
              </p>
            )}
            {!d.evaluacion && d.fichaSource && (
              <p className={s.nota} style={{ marginTop: "auto" }}>
                {t.fichaFuente[d.fichaSource]}
              </p>
            )}
          </>
        ),
    });
  }

  // ── 6 · Análisis físico ─────────────────────────────────────────────────
  if (hayFisico && cif) {
    const dec = d.lot.declarado;
    const declarado = (v: string | null, clave: string) => v ?? (dec.noSabe.includes(clave) ? t.noSabe : null);
    const comparacion = [
      { k: t.humedad, dec: declarado(dec.humedad != null ? `${num(dec.humedad, 1)} %` : null, "humidity"), med: cif.humedadVerde != null ? `${num(cif.humedadVerde, 1)} %` : null },
      { k: t.densidad, dec: declarado(dec.densidad != null ? `${dec.densidad.toLocaleString(loc)} g/L` : null, "density"), med: cif.densidad != null ? `${cif.densidad.toLocaleString(loc)} g/L` : null },
      { k: t.aw, dec: declarado(dec.aw != null ? num(dec.aw, 3) : null, "water_activity"), med: cif.aw != null ? num(cif.aw, 3) : null },
      { k: t.factor, dec: declarado(dec.factor != null ? num(dec.factor) : null, "yield_factor"), med: cif.factor != null ? num(cif.factor) : null },
    ].filter((x) => !pub && (x.dec || x.med));
    hojas.push({
      id: "fisico",
      render: (n, total) =>
        marco(
          "fisico",
          n,
          total,
          <>
            <div className={s.cabezaIlustrada}>
              <div>
                <h2 className={s.h2}>{t.fisicoTitulo}</h2>
                <p className={s.lead}>{t.fisicoLead}</p>
              </div>
              <IlustracionGranos />
            </div>
            {cif.pesos && (
              <div>
                <div className={s.h3}>{t.rendimiento}</div>
                <Rendimiento pesos={cif.pesos} t={t} loc={loc} />
              </div>
            )}
            <div className={s.tiles}>
              <div className={s.tile}>
                <div className={s.k}>{t.factor}</div>
                <div className={s.tileNum}>{num(cif.factor) ?? "—"}</div>
                <p className={s.nota}>{t.factorNota}</p>
              </div>
              <div className={s.tile}>
                <div className={s.k}>{t.humedad}</div>
                <div className={s.tileNum}>
                  {num(cif.humedadVerde, 1) ?? "—"}
                  <span className={s.tileUnidad}>%</span>
                </div>
                {cif.humedadVerde != null && <Medidor valor={cif.humedadVerde} min={8} max={14} rango={[10, 12]} loc={loc} />}
                <p className={s.nota}>{t.humedadRango}</p>
              </div>
              <div className={s.tile}>
                <div className={s.k}>{t.aw}</div>
                <div className={s.tileNum}>{num(cif.aw, 3) ?? "—"}</div>
                {cif.aw != null && <Medidor valor={cif.aw} min={0.3} max={0.8} decimales={2} loc={loc} />}
              </div>
              <div className={s.tile}>
                <div className={s.k}>{t.densidad}</div>
                <div className={s.tileNum}>
                  {cif.densidad != null ? cif.densidad.toLocaleString(loc) : "—"}
                  <span className={s.tileUnidad}>g/L</span>
                </div>
                {cif.defectuosaPct != null && (
                  <p className={s.nota}>
                    {t.defectuosa} {num(cif.defectuosaPct, 1)} %
                  </p>
                )}
              </div>
            </div>
            <div className={s.mitades}>
              <div>
                {cif.mallas.length > 0 && (
                  <>
                    <div className={s.h3}>{t.mallas}</div>
                    <Mallas mallas={cif.mallas} loc={loc} />
                    {c.b3?.estadoMallas && <p className={s.nota}>{c.b3.estadoMallas}</p>}
                  </>
                )}
              </div>
              <div style={{ display: "grid", gap: "5mm", alignContent: "start" }}>
                {cif.defectos.length > 0 && (
                  <div>
                    <div className={s.h3}>{t.defectos}</div>
                    <table className={s.tabla}>
                      <thead>
                        <tr>
                          <th>{t.defecto}</th>
                          <th className={s.num}>{t.granos}</th>
                          <th className={s.num}>{t.completos}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cif.defectos.map((x) => (
                          <tr key={x.defecto}>
                            <td>{x.defecto}</td>
                            <td className={s.num}>{x.granos}</td>
                            <td className={s.num}>{x.completos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {comparacion.length > 0 && (
                  <div>
                    <div className={s.h3}>{t.declaradoVsMedido}</div>
                    <table className={s.tabla}>
                      <thead>
                        <tr>
                          <th />
                          <th className={s.num}>{t.declarado2}</th>
                          <th className={s.num}>{t.medido}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparacion.map((x) => (
                          <tr key={x.k}>
                            <td>{x.k}</td>
                            <td className={s.num}>{x.dec ?? "—"}</td>
                            <td className={s.num}>{x.med ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {c.b3?.notas && (
              <div>
                <div className={s.h3}>{t.notasAnalisis}</div>
                <p className={s.cita}>{c.b3.notas}</p>
              </div>
            )}
          </>
        ),
    });
  }

  // ── 7 · Mejora y respaldo ───────────────────────────────────────────────
  const ruedaMarcada = (cif?.rueda.length ?? 0) > 0;
  type Marca = "si" | "pend" | "no";
  const hecho = (v: boolean): Marca => (v ? "si" : "pend");
  const fincaRevisada = d.fincas.length > 0 && d.fincas.every((f) => f.criterios.find((x) => x.id === "revision")?.estado === "ok");
  const evaluado = !!d.evaluacion;
  const respaldo: { dato: string; marcas: Marca[] }[] = [
    { dato: t.respaldoFilas.finca, marcas: [hecho(d.fincas.length > 0), hecho(fincaRevisada), "no"] },
    { dato: t.respaldoFilas.visa, marcas: [hecho(d.fincas.length > 0), hecho(visaOk), "no"] },
    { dato: t.respaldoFilas.triada, marcas: [hecho(d.lot.variedades.length > 0 || !!d.lot.process), hecho(evaluado), "no"] },
    { dato: t.respaldoFilas.taza, marcas: ["no", hecho(evaluado), hecho(evaluado)] },
    { dato: t.respaldoFilas.fisico, marcas: [hecho(d.lot.declarado.humedad != null), hecho(evaluado), hecho(hayFisico)] },
    { dato: t.respaldoFilas.grado, marcas: ["no", hecho(!!g.grado), "no"] },
    { dato: t.respaldoFilas.certs, marcas: [d.certificates.length ? "si" : "no", d.certificates.length ? "si" : "no", "no"] },
  ];
  hojas.push({
    id: "mejora",
    render: (n, total) =>
      marco(
        "mejora",
        n,
        total,
        <>
          <div>
            <h2 className={s.h2}>{t.mejoraTitulo}</h2>
          </div>
          <div>
            <div className={s.h3}>{t.anot}</div>
            {c.anotaciones.length > 0 ? (
              <>
                <p className={s.lead} style={{ marginTop: 0, marginBottom: "3mm" }}>
                  {t.anotLead}
                </p>
                <div className={s.anotaciones}>
                  {c.anotaciones.map((a) => (
                    <div key={a.id} className={s.anotacion}>
                      <div className={s.anotacionRuta}>{a.ruta}</div>
                      <p className={s.anotacionCausa}>
                        <span className={s.k}>{t.causa}</span>
                        <br />
                        {a.causa}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : ruedaMarcada ? (
              <div className={s.limpio}>
                <Check size={22} strokeWidth={2.5} color="var(--ok)" aria-hidden />
                <span>{t.anotLimpio}</span>
              </div>
            ) : (
              <div className={s.vacio}>{t.sinEvaluacion}</div>
            )}
          </div>
          {d.lectura.intro && (
            <div>
              <div className={s.h3}>{t.lecturaTitulo}</div>
              <div className={s.lectura}>
                <p>{d.lectura.intro}</p>
                {d.lectura.parrafos.map((x) => (
                  <p key={x}>{x}</p>
                ))}
                {d.lectura.sintesis && <p>{d.lectura.sintesis}</p>}
              </div>
              <p className={s.nota}>{t.lecturaFuente}</p>
            </div>
          )}
          {d.conjeturas.length > 0 && (
            <div>
              <div className={s.h3}>{t.conjeturasTitulo}</div>
              <p className={s.nota} style={{ marginTop: 0, marginBottom: "2.5mm" }}>
                {t.conjeturasLead}
              </p>
              <div className={s.conjeturas}>
                {d.conjeturas.slice(0, 10).map((x) => {
                  const I = ICONO_CONJETURA[x.icono];
                  return (
                    <div key={x.titulo} className={cx(s.conjetura, x.tono === "atencion" ? s.conjeturaAtencion : s.conjeturaBien)}>
                      <span className={s.conjeturaIcono}>
                        <I size={14} strokeWidth={2} aria-hidden />
                      </span>
                      <div>
                        <div className={s.conjeturaTitulo}>{x.titulo}</div>
                        <p className={s.conjeturaTexto}>{x.texto}</p>
                        <div className={s.notaSub}>
                          {t.areas[x.area]} · {t.evidencia}: {x.evidencia}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ),
  });

  hojas.push({
    id: "respaldo",
    render: (n, total) =>
      marco(
        "respaldo",
        n,
        total,
        <>
          <div>
            <h2 className={s.h2}>{t.respaldoHojaTitulo}</h2>
          </div>
          {/* V5.198 · en el Dossier público la Mejora no va (es devolución al productor), pero su lectura del perfil sí: es la
              taza contada, y le dice al comprador lo mismo que la rueda. */}
          {pub && d.lectura.intro && (
            <div>
              <div className={s.h3}>{t.lecturaTitulo}</div>
              <div className={s.lectura}>
                <p>{d.lectura.intro}</p>
                {d.lectura.parrafos.map((x) => (
                  <p key={x}>{x}</p>
                ))}
                {d.lectura.sintesis && <p>{d.lectura.sintesis}</p>}
              </div>
              <p className={s.nota}>{t.lecturaFuente}</p>
            </div>
          )}
          <div>
            <div className={s.h3}>{t.certs}</div>
            {d.certificates.length ? (
              <table className={s.tabla}>
                <thead>
                  <tr>
                    <th>{t.esquema}</th>
                    {!pub && <th>{t.numero}</th>}
                    <th>{t.vigencia}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.certificates.map((x, i) => (
                    <tr key={i}>
                      <td>{x.schemeLabel}</td>
                      {!pub && <td className={s.mono}>{x.certNumber || "—"}</td>}
                      <td>{[fecha(x.validFrom), fecha(x.validTo)].filter(Boolean).join(" · ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={s.nota}>{t.sinCerts}</p>
            )}
          </div>
          {!pub && (
            <div>
              <div className={s.h3}>{t.respaldoTitulo}</div>
              <p className={s.nota} style={{ marginTop: 0, marginBottom: "2mm" }}>
                {t.respaldoLead}
              </p>
              <MatrizDeRespaldo columnas={t.respaldoCols} filas={respaldo} />
            </div>
          )}
          <div className={s.cierre}>
            <div>
              <p style={{ margin: 0, fontSize: "8.5pt" }}>{pub ? t.avisoPublico : t.aviso}</p>
              {d.catalogoUrl && (
                <p className={s.nota}>
                  {t.catalogo}: <span className={s.mono}>{d.catalogoUrl.replace(/^https:\/\//, "")}</span>
                </p>
              )}
              <p className={s.nota}>
                {t.generado} {fecha(d.generatedOn)} · <span className={s.mono}>{d.lot.reference}</span>
              </p>
            </div>
            {d.qrSvg && (
              <div className={s.qr}>
                <span dangerouslySetInnerHTML={{ __html: d.qrSvg }} />
                CTCx Public Catalogue
              </div>
            )}
          </div>
        </>
      ),
  });

  if (pub) {
    for (const fuera of ["visa", "mejora"]) {
      const i = hojas.findIndex((h) => h.id === fuera);
      if (i >= 0) hojas.splice(i, 1);
    }
  }
  hojas.sort((a, b) => ORDEN_DE_HOJAS.indexOf(a.id) - ORDEN_DE_HOJAS.indexOf(b.id));
  const total = hojas.length;

  // V5.201 · el Dossier público: el documento continuo, sin imprimir, con la navegación de sus secciones abajo.
  if (pub) {
    return (
      <div className={cx(s.lienzo, s.lienzoContinuo, display.variable)} lang={d.lang}>
        <div className={s.barra}>
          <Link href={pub.volver} className={s.barraVolver}>
            ← {t.volverPortal}
          </Link>
          <a href={`${pub.url}?lang=${d.lang === "en" ? "es" : "en"}`}>{t.otroIdioma}</a>
        </div>
        <article className={s.papel}>
          {hojas.map((h, i) => h.render(i + 1, total))}
          <div className={cx(s.pie, s.pieContinuo)}>
            <span>{CTC_LEGAL_LINE}</span>
            <span className={s.mono} translate="no">
              {d.lot.reference}
            </span>
          </div>
        </article>
        <NavegacionDelDossier
          secciones={hojas.map((h, i) => ({ id: ancla(h.id), numero: String(i + 1).padStart(2, "0"), titulo: h.id === "portada" ? t.portadaNav : t.secciones[h.id] }))}
          etiqueta={t.indice}
          aria={t.navAria}
          cerrar={t.navCerrar}
        />
        {/* Lo único que sale si alguien imprime desde el navegador (la hoja de estilos esconde todo lo demás). */}
        <p className={s.soloImpresion}>
          {t.soloEnLinea}
          {d.catalogoUrl ? ` ${d.catalogoUrl.replace(/^https:\/\//, "")}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className={cx(s.lienzo, display.variable)} lang={d.lang}>
      <div className={s.barra}>
        <a href={`/kaffetal-regal/dossier/${d.lot.id}?lang=${d.lang === "en" ? "es" : "en"}`}>{t.otroIdioma}</a>
        {d.blindaje.puedeImprimir ? <BotonImprimir label={t.imprimir} /> : <span className={s.candado}>{AVISO_SIN_CONTRATO[d.lang]}</span>}
      </div>
      <Blindaje puedeImprimir={d.blindaje.puedeImprimir} aviso={AVISO_SIN_CONTRATO[d.lang]} />
      {hojas.map((h, i) => h.render(i + 1, total))}
    </div>
  );
}
