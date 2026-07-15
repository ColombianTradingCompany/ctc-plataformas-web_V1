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
