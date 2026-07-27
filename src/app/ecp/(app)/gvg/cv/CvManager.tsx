"use client";

import { useState } from "react";
import type { CvSetupData } from "@/lib/gvg/cvActions";
import type { GvgApplication, GvgEvent } from "@/lib/gvg/cvData";
import { GvgMasthead } from "../GvgMasthead";
import { SetupTab } from "./SetupTab";
import { ApplicationsTab } from "./ApplicationsTab";
import { FollowupTab } from "./FollowupTab";
import { CalendarTab } from "./CalendarTab";
import styles from "./cv.module.css";

type TopTab = "setup" | "applications" | "followup" | "calendar";

/** CV App Manager shell: Setup (the profile that feeds the AI), Applications
 *  (the process kanban) and Follow-up (after "Application Sent"). */
export function CvManager({
  initialSetup,
  applications,
  events,
}: {
  initialSetup: CvSetupData;
  applications: GvgApplication[];
  events: GvgEvent[];
}) {
  const [tab, setTab] = useState<TopTab>("applications");
  const activeCount = applications.filter((a) => a.status !== "sent").length;
  const sentCount = applications.filter((a) => a.status === "sent").length;

  return (
    <div>
      <GvgMasthead sub="CV App Manager" />
      <div className={styles.tabs} role="tablist" aria-label="CV App Manager">
        {(
          [
            ["applications", `Applications · ${activeCount}`],
            ["followup", `Follow-up · ${sentCount}`],
            ["calendar", "Calendar"],
            ["setup", "Setup"],
          ] as [TopTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "setup" && <SetupTab initial={initialSetup} />}
      {tab === "applications" && (
        <ApplicationsTab
          applications={applications}
          baselineEducation={initialSetup.profile.education}
          baselineLanguages={initialSetup.profile.languages}
        />
      )}
      {tab === "followup" && <FollowupTab applications={applications} />}
      {tab === "calendar" && <CalendarTab applications={applications} events={events} />}
    </div>
  );
}
