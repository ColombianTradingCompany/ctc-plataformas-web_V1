import { redirect } from "next/navigation";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { isGvgUnlocked } from "@/lib/gvg/lock";
import { GvgGate } from "./GvgGate";
import styles from "./gvg.module.css";

// ── GVG-Space (2026-07-27) ───────────────────────────────────────────────────
// The owner's personal space inside the ECP. Two gates stack here on purpose:
// owner-only (a collaborator with ECP access never sees it, matching the
// owner-only nav entry) and then the space's own soft password, which mints a
// 12h cookie scoped to /ecp/gvg. Everything inside renders on the blue theme.
export default async function GvgLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireConsoleAccess("ecp");
  if (!identity.isOwner) redirect("/ecp");
  const unlocked = await isGvgUnlocked(identity.userId);
  return <div className={styles.space}>{unlocked ? children : <GvgGate />}</div>;
}
