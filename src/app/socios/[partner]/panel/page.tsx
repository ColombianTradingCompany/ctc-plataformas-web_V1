import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PARTNERS, isPartnerSlug } from "@/lib/partners/partners";
import { requirePartner } from "@/lib/partners/requirePartner";
import { getStudioIdentity } from "@/lib/coffeed/studioGate";
import { STUDIO_APPS, STUDIO_PARTNER_SLUG } from "@/lib/coffeed/studioApps";
import { PartnerPasswordCard } from "./PartnerPasswordCard";
import styles from "../socios.module.css";

// The partner's module, behind requirePartner(). Today: the scaffold of its v3
// screens (the real flows arrive with the OCP mirror in later phases).
//
// EXCEPCIÓN, 2026-08-03: el Estudio de Contenido ya no es un scaffold — es un
// TALLER con apps de creación reales, así que tiene su propio lanzador y su
// propia compuerta (`studioGate`, que también abre para un operador interno
// del ECP; ver src/lib/coffeed/studioGate.ts).
export default async function PartnerPanelPage({ params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  if (!isPartnerSlug(partner)) notFound();
  if (partner === STUDIO_PARTNER_SLUG) return <StudioFloor />;

  const p = PARTNERS[partner];
  const identity = await requirePartner(p.slug);

  return (
    <div className={styles.page} style={{ "--p-accent": p.accent } as React.CSSProperties}>
      <div className={styles.stripe} />
      <div className={styles.wrap}>
        <div className={styles.topbar}>
          <div className={styles.brandline}>
            <Image src={p.logo} alt={p.name} width={44} height={44} />
            <span className={styles.brandName}>
              {p.name}
              <span className={styles.brandSub}>Módulo del socio</span>
            </span>
          </div>
          <form action={`/api/socios/auth/logout?node=${p.slug}`} method="post">
            <button className="btn btn-sm" type="submit">
              Cerrar sesión
            </button>
          </form>
        </div>

        <div className={styles.panelHead}>
          <div>
            <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 24, color: "var(--primary-deep)" }}>
              Hola, {identity.contactName || identity.orgName}
            </h1>
            <p className={styles.orgLine}>
              {identity.orgName} · credencial activa para {p.name}
            </p>
          </div>
        </div>
        <span className={styles.soon}>Módulos en construcción — así se verá tu tramo del pasaporte</span>

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
          <span className={styles.selloK}>Tu sello en el pasaporte del lote</span>
          <span className={styles.sello}>{p.sello}</span>
        </div>

        <PartnerPasswordCard />

        <div className={styles.foot}>
          <span>Red orquestada · Colombian Trading Company</span>
          <span>Soporte: info@ctcexport.com</span>
        </div>
      </div>
    </div>
  );
}

/** El taller: las apps de creación del Estudio, cada una con su puerta. */
async function StudioFloor() {
  const identity = await getStudioIdentity();
  if (!identity) redirect(`/socios/${STUDIO_PARTNER_SLUG}/acceso`);
  const p = PARTNERS[STUDIO_PARTNER_SLUG];

  return (
    <div className={styles.page} style={{ "--p-accent": p.accent } as React.CSSProperties}>
      <div className={styles.stripe} />
      <div className={styles.wrap}>
        <div className={styles.topbar}>
          <div className={styles.brandline}>
            <Image src={p.logo} alt={p.name} width={44} height={44} />
            <span className={styles.brandName}>
              {p.name}
              <span className={styles.brandSub}>El taller de la red</span>
            </span>
          </div>
          {identity.via === "partner" && (
            <form action={`/api/socios/auth/logout?node=${p.slug}`} method="post">
              <button className="btn btn-sm" type="submit">
                Cerrar sesión
              </button>
            </form>
          )}
        </div>

        <div className={styles.hero}>
          <span className={styles.eyebrow}>Hola, {identity.displayName}</span>
          <h1>Las apps del Estudio</h1>
          <p className={styles.lede}>
            Cada app produce una pieza distinta y todas terminan en el mismo sitio: la cola de <b>Entregas</b> del ECP, donde
            CTC les da luz verde y las publica en Coffeed. Aquí se produce; allá se publica.
          </p>
        </div>

        <div className={styles.screens}>
          {STUDIO_APPS.map((a, i) =>
            a.built ? (
              <Link key={a.id} href={`/socios/${STUDIO_PARTNER_SLUG}/panel/${a.id}`} className={styles.scr}>
                <span className={styles.scrN}>0{i + 1}</span>
                <span>
                  <strong>{a.name}</strong>
                  <small>
                    {a.tagline} <b>Entrega:</b> {a.delivers}
                  </small>
                </span>
              </Link>
            ) : (
              <div key={a.id} className={styles.scr} style={{ opacity: 0.6 }}>
                <span className={styles.scrN}>0{i + 1}</span>
                <span>
                  <strong>{a.name} · en construcción</strong>
                  <small>
                    {a.tagline} <b>Entregará:</b> {a.delivers}
                  </small>
                </span>
              </div>
            )
          )}
        </div>

        <div className={styles.selloRow}>
          <span className={styles.selloK}>Tu sello en el pasaporte del lote</span>
          <span className={styles.sello}>{p.sello}</span>
        </div>

        {identity.via === "partner" && <PartnerPasswordCard />}

        <div className={styles.foot}>
          <span>Red orquestada · Colombian Trading Company</span>
          <span>Soporte: info@ctcexport.com</span>
        </div>
      </div>
    </div>
  );
}
