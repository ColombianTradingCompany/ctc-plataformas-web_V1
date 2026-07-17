import styles from "./HarvestCalendar.module.css";

export type CalSegment = {
  css: "cbSearch" | "cbHarvest" | "cbArena" | "cbSamples" | "cbPack" | "cbLiq" | "cbShip" | "cbSeason";
  start: number; // grid column start (1-13)
  end: number; // grid column end (1-13)
  text: string;
};

export type CalBlock = {
  label: string;
  rows: CalSegment[][];
};

export type CalLegendItem = { color: string; text: string };

// Default month labels stay Spanish so Kaffetal Regal renders unchanged;
// Cherry Picked passes its own per-language set.
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

export function HarvestCalendar({
  blocks,
  legend,
  months = MONTHS,
}: {
  blocks: CalBlock[];
  legend: CalLegendItem[];
  months?: string[];
}) {
  return (
    <div className={styles.calWrap}>
      <div className={styles.cal}>
        <div className={styles.calMonths}>
          {months.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>

        {blocks.map((block, bi) => (
          <div key={bi}>
            <p className={styles.calLabel}>{block.label}</p>
            {block.rows.map((segments, ri) => (
              <div className={styles.calRow} key={ri}>
                <div className={styles.calGridLines}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <i key={i} />
                  ))}
                </div>
                {segments.map((seg, si) => (
                  <div
                    key={si}
                    className={`${styles.calBar} ${styles[seg.css]}`}
                    style={{ gridColumn: `${seg.start}/${seg.end}` }}
                  >
                    {seg.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        <div className={styles.calLegend}>
          {legend.map((l, i) => (
            <span key={i}>
              <i style={{ background: l.color }} />
              {l.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
