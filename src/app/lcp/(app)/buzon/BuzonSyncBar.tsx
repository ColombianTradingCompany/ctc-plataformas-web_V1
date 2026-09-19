"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncBuzonNow } from "../buzonActions";
import styles from "./buzon.module.css";

export function BuzonSyncBar() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function sync() {
    setMsg(null);
    startTransition(async () => {
      // Each run imports a bounded batch and reports what's left; loop until the
      // whole mailbox (history included) is archived, refreshing as we go.
      let stored = 0,
        cleaned = 0;
      for (let i = 0; i < 20; i++) {
        const r = await syncBuzonNow();
        if (!r.ok) {
          setMsg({ ok: false, text: r.error ?? "Fallo en la sincronización." });
          router.refresh();
          return;
        }
        stored += r.stored;
        cleaned += r.cleaned;
        setMsg({ ok: true, text: `Importando… ${stored} archivados, quedan ${r.remaining}.` });
        router.refresh();
        if (r.remaining <= 0) break;
      }
      setMsg({
        ok: true,
        text: `Sincronizado: ${stored} nuevo${stored === 1 ? "" : "s"} archivado${stored === 1 ? "" : "s"}${cleaned ? `, ${cleaned} limpiado${cleaned === 1 ? "" : "s"} del buzón remoto` : ""}. Buzón al día.`,
      });
    });
  }

  return (
    <div className={styles.syncBar}>
      <button className="btn btn-solid btn-sm" onClick={sync} disabled={pending}>
        {pending ? "Sincronizando…" : "↻ Sincronizar buzón"}
      </button>
      {msg && <span className={msg.ok ? styles.syncOk : styles.syncErr}>{msg.text}</span>}
    </div>
  );
}
