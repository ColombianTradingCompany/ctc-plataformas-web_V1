import Image from "next/image";
import { notFound } from "next/navigation";
import { PARTNERS, isPartnerSlug } from "@/lib/partners/partners";
import { requirePartner } from "@/lib/partners/requirePartner";
import { PartnerPasswordCard } from "./PartnerPasswordCard";
import styles from "../socios.module.css";

// The partner's module, behind requirePartner(). Today: the scaffold of its v3
// screens (the real flows arrive with the OCP mirror in later phases).
export default async function PartnerPanelPage({ params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  if (!isPartnerSlug(partner)) notFound();
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
        {p.slug === "estudio-contenido" && (
          <div style={{ margin: "14px 0 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", border: "1px solid var(--p-accent)", padding: "14px 16px" }}>
            <div style={{ flex: "1 1 260px" }}>
              <strong style={{ display: "block" }}>Coffeed · línea de producción editorial</strong>
              <small style={{ color: "var(--muted-foreground, #6b6b6b)" }}>
                El muro de noticias y anuncios + las 7 etapas: mesa de cata, extracción, propuestas, borrador y guion de vídeo.
              </small>
            </div>
            <a className="btn btn-sm" href={`/socios/${p.slug}/panel/coffeed`} style={{ background: "var(--p-accent)", color: "#fff", borderColor: "var(--p-accent)" }}>
              Abrir Coffeed →
            </a>
          </div>
        )}
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
