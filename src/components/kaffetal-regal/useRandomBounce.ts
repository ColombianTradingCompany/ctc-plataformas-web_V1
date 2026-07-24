"use client";

import { useEffect, useState } from "react";

// One short hop roughly every 7 s (6-8.5 s jittered, re-randomized every cycle
// and per mount) so the two side FABs never bounce in sync with each other.
// Same shape as the Cherry Picked / lang-kit bounce hooks (10-15 s there);
// duplicated rather than imported so Kaffetal Regal stays self-contained.
export function useRandomBounce(): boolean {
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (stop) return;
        setBouncing(true);
        timer = window.setTimeout(() => {
          if (stop) return;
          setBouncing(false);
          schedule();
        }, 800);
      }, 6000 + Math.random() * 2500);
    };
    schedule();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, []);

  return bouncing;
}
