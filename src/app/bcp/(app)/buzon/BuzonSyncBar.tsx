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
      const r = await syncBuzonNow();
      if (r.ok) {
        setMsg({
          ok: true,
          text: `Sincronizado: ${r.stored} nuevo${r.stored === 1 ? "" : "s"}, ${r.skipped} ya archivado${r.skipped === 1 ? "" : "s"}${r.cleaned ? `, ${r.cleaned} limpiado${r.cleaned === 1 ? "" : "s"} del buzón remoto` : ""}.`,
        });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error ?? "Fallo en la sincronización." });
      }
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
