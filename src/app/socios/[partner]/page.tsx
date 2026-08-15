import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PARTNERS, PARTNER_SLUGS, isPartnerSlug } from "@/lib/partners/partners";
import { metadatosDeSuperficieAsync } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { LegalFooter } from "@/components/LegalFooter";
import styles from "./socios.module.css";

export function generateStaticParams() {
  return PARTNER_SLUGS.map((partner) => ({ partner }));
}

// Los cinco nodos comparten una sola página, así que su tarjeta de enlace se
// firma por nodo desde `PARTNERS` — que ya es la fuente única de su nombre, su
// papel y su descripción. El slug interno y el subdominio público NO siempre
// coinciden (`estudio-contenido` se sirve en `ctc-content`), pero eso lo
// resuelve el mapa de la red: aquí basta con dar la ruta.
export async function generateMetadata({ params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  if (!isPartnerSlug(partner)) return {};
  const p = PARTNERS[partner];
  // Los cinco nodos pasan por las mismas excepciones de Manejo de Plataformas
  // que las demás superficies: cada uno tiene su fila, con su ruta por clave.
  return metadatosDeSuperficieAsync({
    route: `/socios/${p.slug}`,
    title: `${p.name} · Nodo socio de la red CTC · ${p.role}`,
    description: p.what,
    siteName: `${p.name} · Red CTC`,
    image: `socio-${p.slug}.jpg`,
    imageAlt: `Logotipo de ${p.name}, nodo socio de la red CTC`,
  });
}

// Public landing of a partner node — the first half of its "couple". Copy comes
// from the v3 vision board (what/why/screens/sello), branded by node accent.
export default async function PartnerLandingPage({ params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  if (!isPartnerSlug(partner)) notFound();
  const p = PARTNERS[partner];

  return (
    <div className={styles.page} style={{ "--p-accent": p.accent } as React.CSSProperties}>
      {/* La empresa que emite la credencial es CTC, no el socio: los cinco
          nodos son puertas de ESTA casa, y así es como debe leerse la página
          desde fuera. La ficha del socio como organización propia sería otra
          cosa — y hoy no la declaramos porque no somos nosotros quienes la
          podemos afirmar. */}
      <OrganizationLd />
      <div className={styles.stripe} />
      <div className={styles.wrap}>
        <div className={styles.topbar}>
          <div className={styles.brandline}>
            <Image src={p.logo} alt={p.name} width={44} height={44} />
            <span className={styles.brandName}>
              {p.name}
              <span className={styles.brandSub}>Red CTC · nodo partner</span>
            </span>
          </div>
          <Link className="btn btn-sm" href={`/socios/${p.slug}/acceso`}>
            Acceso de socios
          </Link>
        </div>

        <div className={styles.hero}>
          <span className={styles.eyebrow}>{p.role}</span>
          <h1>{p.name}</h1>
          <p className={styles.lede}>{p.what}</p>
        </div>

        <div className={styles.grid2}>
          <div className={styles.card}>
            <div className={styles.cardK}>Su papel en la red</div>
            <p>{p.why}</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardK}>Cómo funciona la credencial</div>
            <p>
              La credencial la emite CTC desde su Base Control Panel y es revocable en un clic. Cada socio entra a{" "}
              <b>su</b> módulo, ve solo su tramo del pasaporte del lote y estampa el sello que le corresponde — nadie más
              que CTC ve el expediente completo.
            </p>
          </div>
        </div>

        <h2 className={styles.secTitle}>Su módulo · pantallas</h2>
        <div className={styles.screens}>
          {p.screens.map(([name, desc], i) => (
            <div key={name} className={styles.scr}>
              <span className={styles.scrN}>0{i + 1}</span>
              <span>
                <strong>{name}</strong>
                <small>{desc}</small>
              </span>
            </div>
          ))}
        </div>

        <div className={styles.selloRow}>
          <span className={styles.selloK}>Sello que estampa en el pasaporte del lote</span>
          <span className={styles.sello}>{p.sello}</span>
        </div>

        <Link className={styles.cta} href={`/socios/${p.slug}/acceso`}>
          Entrar a mi módulo →
        </Link>
        <p className={styles.ctaNote}>¿Aún sin credencial? La emite el equipo de CTC — escríbenos a info@ctcexport.com.</p>

        <div className={styles.foot}>
          <span>
            Un nodo de la red orquestada de <a href="https://ctcexport.com">Colombian Trading Company</a>
          </span>
          <span>Piedecuesta, Santander · Colombia</span>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
