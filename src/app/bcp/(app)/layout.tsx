import { requireAdminProfile } from "@/lib/bcp/requireAdminProfile";
import { BcpSidebar } from "./BcpSidebar";
import styles from "./appShell.module.css";

export default async function BcpAppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdminProfile();

  return (
    <div className={styles.shell}>
      <BcpSidebar adminName={profile?.full_name ?? profile?.email ?? ""} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
