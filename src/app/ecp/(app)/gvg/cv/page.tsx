import { redirect } from "next/navigation";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { isGvgUnlocked } from "@/lib/gvg/lock";
import { loadCvSetup } from "@/lib/gvg/cvActions";
import { loadGvgApplications } from "@/lib/gvg/matchActions";
import { CvManager } from "./CvManager";

// The AI match (web research + full analysis) can run for a couple of minutes;
// Server Actions posted to this route inherit this segment config on Vercel.
export const maxDuration = 300;

// CV App Manager. The layout renders the password gate INSTEAD of children when
// the space is locked — but Next still evaluates this page in parallel, so it
// must guard itself too (returning null keeps the gate as the only thing shown).
export default async function CvManagerPage() {
  const identity = await requireConsoleAccess("ecp");
  if (!identity.isOwner) redirect("/ecp");
  if (!(await isGvgUnlocked(identity.userId))) return null;
  const [setup, applications] = await Promise.all([loadCvSetup(), loadGvgApplications()]);
  return <CvManager initialSetup={setup} applications={applications} />;
}
