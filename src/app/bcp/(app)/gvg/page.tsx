import Link from "next/link";
import { GvgMasthead } from "./GvgMasthead";
import styles from "./gvg.module.css";

// GVG-Space home: the submodule index. One submodule for now; the grid is
// ready for more.
export default function GvgHomePage() {
  return (
    <div>
      <GvgMasthead />
      <div className={styles.grid}>
        <Link href="/bcp/gvg/cv" className={styles.card}>
          <span className={styles.cardName}>CV App Manager</span>
          <span className={styles.cardDesc}>
            The job-application engine: master experience repository, career paths, AI job matching, tailored CV +
            cover letter rendering, and the application pipeline from &ldquo;Match Me&rdquo; to follow-up.
          </span>
        </Link>
      </div>
    </div>
  );
}
