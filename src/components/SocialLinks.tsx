import styles from "./SocialLinks.module.css";

// CTC's social profiles, shared by the satellite-site footers (Kaffetal
// Regal + the Cherry Picked family). CTC Home's footer keeps its own inline
// markup for these same two profiles — if a URL changes, update both.
const SOCIALS = [
  {
    href: "https://instagram.com/ctcexport",
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r=".8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "https://www.youtube.com/@ctcx.oficial",
    label: "YouTube",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
        <path d="M10 9.3v5.4l4.8-2.7z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function SocialLinks() {
  return (
    <div className={styles.social}>
      {SOCIALS.map((s) => (
        <a key={s.label} href={s.href} target="_blank" rel="noopener" aria-label={`${s.label} · CTC`}>
          {s.icon}
        </a>
      ))}
    </div>
  );
}
