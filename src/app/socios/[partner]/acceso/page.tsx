import { notFound } from "next/navigation";
import { PARTNERS, isPartnerSlug } from "@/lib/partners/partners";
import { PartnerLoginForm } from "./PartnerLoginForm";
import styles from "../socios.module.css";

export default async function PartnerAccessPage({ params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  if (!isPartnerSlug(partner)) notFound();
  const p = PARTNERS[partner];

  return (
    <div className={styles.page} style={{ "--p-accent": p.accent } as React.CSSProperties}>
      <div className={styles.stripe} />
      <div className={styles.center}>
        <PartnerLoginForm slug={p.slug} name={p.name} />
      </div>
    </div>
  );
}
