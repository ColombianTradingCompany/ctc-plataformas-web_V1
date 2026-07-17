"use client";

import { useEffect, useState } from "react";

// One short hop every 10-15 s. The interval is re-randomized on every cycle
// and per mount, so stacked bubbles never bounce in sync.
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
      }, 10000 + Math.random() * 5000);
    };
    schedule();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, []);

  return bouncing;
}
