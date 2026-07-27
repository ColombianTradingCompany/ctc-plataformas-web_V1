// ── GVG · CV App Manager — shared types (client + server) ───────────────────
// The Master Experience mirrors the owner's "Experience Deep-Dive & Capability
// Repository" document: every item (job, research, education, volunteering)
// deconstructs into the same six categories, which is what the AI matcher
// cross-references against a job posting.

export type ToolAptitude = { name: string; pct: number };

export type ExperienceSections = {
  /** Strategic & Business Translation Capabilities */
  strategic: string[];
  /** Operational & Management Learnings */
  operational: string[];
  /** Technical Competencies Acquired/Refined */
  technical: string[];
  hard_skills: string[];
  soft_skills: string[];
  tools: ToolAptitude[];
};

export const EMPTY_SECTIONS: ExperienceSections = {
  strategic: [],
  operational: [],
  technical: [],
  hard_skills: [],
  soft_skills: [],
  tools: [],
};

export const SECTION_LABELS: Record<Exclude<keyof ExperienceSections, "tools">, string> = {
  strategic: "Strategic & Business Translation Capabilities",
  operational: "Operational & Management Learnings",
  technical: "Technical Competencies Acquired/Refined",
  hard_skills: "Hard Skills",
  soft_skills: "Soft Skills",
};

export type ExperienceKind = "job" | "research" | "education" | "volunteering";

export const KIND_LABELS: Record<ExperienceKind, string> = {
  job: "Professional Experience",
  research: "Research, Innovation & Academic Projects",
  education: "Education & Certifications",
  volunteering: "Volunteering & Extracurriculars",
};

export const KIND_ORDER: ExperienceKind[] = ["job", "research", "education", "volunteering"];

export type GvgExperience = {
  id: string;
  kind: ExperienceKind;
  title: string;
  org: string | null;
  location: string | null;
  date_start: string | null;
  date_end: string | null; // null/"" = Present
  context: string | null;
  sections: ExperienceSections;
  position: number;
};

export type GvgCareerPath = {
  id: string;
  name: string;
  definition: string | null;
  core_focus: string | null;
  skills: string | null;
  active: boolean;
  position: number;
};

export type GvgCoverLetterSample = {
  id: string;
  title: string;
  asset_path: string | null;
  extracted_text: string | null;
  created_at: string;
};

export const MAX_COVER_LETTER_SAMPLES = 4;

export type GvgLanguage = { name: string; level: string };
/** Sidebar "Education & Certifications" entry on the CV template. */
export type GvgEducationEntry = { title: string; sub: string; detail: string };

export type GvgProfileData = {
  about: string;
  photo_path: string | null;
  headline: string;
  tagline: string;
  contact: { email: string; phone: string; location: string };
  languages: GvgLanguage[];
  education: GvgEducationEntry[];
};

export const EMPTY_PROFILE: GvgProfileData = {
  about: "",
  photo_path: null,
  headline: "",
  tagline: "",
  contact: { email: "", phone: "", location: "" },
  languages: [],
  education: [],
};

// ── Applications (the kanban card) ──────────────────────────────────────────

export type ApplicationStatus = "nueva" | "matching" | "analysis" | "rendering" | "ready" | "sent";
export type FollowupStatus = "sent" | "cold" | "next_steps" | "rejected";

/** What the AI matcher returns — stored verbatim in gvg_applications.match and
 *  editable in the Analysis Ready stage before rendering. */
export type MatchResult = {
  /** The consistent evaluation criteria — one score + verdict per axis. */
  evaluation: {
    overall_score: number; // 0-100
    verdict: string; // one-line "strong match because…"
    axes: { name: string; score: number; note: string }[];
    career_path: string; // which career path this maps to
    company_notes: string; // online-research digest
    hiring_contact: string | null;
  };
  /**
   * Content plan for each CV slot, keyed to the template. EVERYTHING the CV
   * shows is tailored per application — the header (headline/tagline) and the
   * whole sidebar (about, core skills, education, languages) included. The
   * profile in Setup is the BASELINE the AI selects and reorders from; it is
   * never rendered directly except as a fallback for pre-2026-07-27 rows.
   */
  cv_plan: {
    headline: string;
    tagline: string;
    about: string;
    core_skills: string[]; // 9 sidebar highlights
    /** Chosen and reordered from the profile's entries — never invented. */
    education?: GvgEducationEntry[];
    /** Reordered from the profile's languages (e.g. German first for a DE role). */
    languages?: GvgLanguage[];
    experiences: {
      experience_id: string; // gvg_experiences.id this entry draws from
      role_title: string; // headline for this CV entry
      bullets: string[]; // 3-4 tailored bullets
    }[];
  };
  cover_letter_md: string;
};

export type GvgApplication = {
  id: string;
  job_title: string | null;
  company: string | null;
  job_url: string | null;
  mhtml_path: string | null;
  job_text: string | null;
  status: ApplicationStatus;
  match: MatchResult | null;
  cv_html: string | null;
  cl_html: string | null;
  followup_status: FollowupStatus | null;
  interview_date: string | null;
  sent_at: string | null;
  notes: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};
