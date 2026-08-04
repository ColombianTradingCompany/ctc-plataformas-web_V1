import Image from "next/image";
import Link from "next/link";
import { PARTNERS } from "@/lib/partners/partners";
import { STUDIO_APPS, STUDIO_PARTNER_SLUG, type StudioAppId } from "@/lib/coffeed/studioApps";
import type { StudioIdentity } from "@/lib/coffeed/studioGate";
import styles from "./studioShell.module.css";

/**
 * El marco común de las apps del Estudio de Contenido. Da tres cosas que ninguna
 * app debería re-implementar: de dónde vienes (el taller), quién eres (socio o
 * CTC por dentro) y a dónde va lo que produzcas (la cola del ECP).
 */
export function StudioAppShell({
  app,
  identity,
  children,
}: {
  app: StudioAppId;
  identity: StudioIdentity;
  children: React.ReactNode;
}) {
  const meta = STUDIO_APPS.find((a) => a.id === app)!;
  const node = PARTNERS[STUDIO_PARTNER_SLUG];

  return (
    <div className={styles.shell} style={{ "--app-accent": meta.accent } as React.CSSProperties}>
      <div className={styles.stripe} />
      <header className={styles.bar}>
        <Link href={`/socios/${STUDIO_PARTNER_SLUG}/panel`} className={styles.back}>
          <Image src={node.logo} alt="" width={30} height={30} />
          <span>
            <b>Estudio de Contenido</b>
            <small>← Volver al taller</small>
          </span>
        </Link>
        <span className={styles.appName}>{meta.name}</span>
        <span className={styles.who}>
          {identity.displayName}
          <small>
            {identity.via === "partner" ? "Credencial del socio" : "CTC · por dentro"} · entrega al ECP
          </small>
        </span>
      </header>
      <main className={styles.body}>{children}</main>
    </div>
  );
}
