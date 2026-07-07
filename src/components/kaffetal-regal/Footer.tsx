"use client";

import Image from "next/image";
import { useToast } from "@/components/Toast";
import styles from "./Footer.module.css";

export function Footer() {
  const { showToast } = useToast();
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.foot}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Image src="/images/shared/ctc-logo-full.png" alt="Colombian Trading Company" width={2234} height={1231} className={styles.ctcLogo} />
          <span>
            <strong style={{ color: "var(--ink)" }}>Kaffetal Regal</strong> es una iniciativa de Colombian Trading Company.
            <br />
            El destino de sus lotes: <strong>Cherry Picked</strong>, nuestra vitrina de microlotes en Europa.{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                showToast("Cherry Picked (demo)");
              }}
              style={{ fontWeight: 600, color: "var(--t-tyrian)" }}
            >
              Conocerla ↗
            </a>
          </span>
        </div>
        <div className="mono">Cra. 4 # 10-8 · Piedecuesta, Santander · info@ctcexport.com</div>
      </div>
    </footer>
  );
}
