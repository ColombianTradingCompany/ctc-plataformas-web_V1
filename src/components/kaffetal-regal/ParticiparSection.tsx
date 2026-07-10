"use client";

import Image from "next/image";
import { InfoAccordion } from "@/components/InfoAccordion";
import { useToast } from "@/components/Toast";
import styles from "./ParticiparSection.module.css";

export function ParticiparSection({ onLogin }: { onLogin: () => void }) {
  const { showToast } = useToast();

  return (
    <section id="participar">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Cómo participar · Gratis</p>
            <h2>Cinco pasos entre su lote y la Arena</h2>
          </div>
          <p>
            Todo desde su cuenta, a su ritmo. Y si algo se le atraviesa —los videos, la ficha, la humedad— hay un
            video de capacitación esperándolo en cada paso.
          </p>
        </div>
        <div className={styles.steps}>
          <div className={styles.step}>
            <h4>Cree su cuenta gratis</h4>
            <p>Su información general se registra <strong>una sola vez</strong>: razón social, identificación legal (NIT/CC) y nombre del agricultor. Cinco minutos, sin costo.</p>
          </div>
          <div className={styles.step}>
            <h4>Registre sus fincas</h4>
            <p>Un proveedor puede tener varias fincas. Cada una con su identidad propia: ubicación completa, <strong>geolocalización (requisito EUDR)</strong>, altura, historia y características. Son la cara de su café en Europa.</p>
          </div>
          <div className={styles.step}>
            <h4>Llene la ficha técnica del lote</h4>
            <p>Cada café se asocia a una de sus fincas y hereda su origen. Usted completa lo propio del lote: variedades, proceso, perfil y caracterización física.</p>
            <a className={styles.mini} href="#" onClick={(e) => { e.preventDefault(); onLogin(); }}>▸ Ver la ficha técnica</a>
          </div>
          <div className={styles.step}>
            <h4>Adjunte sus videos</h4>
            <p>1–2 min cada uno: usted y su equipo · cada finca · cada café con su cosecha y beneficio. Con el celular y buena luz, queda perfecto.</p>
            <a className={styles.mini} href="#" onClick={(e) => { e.preventDefault(); showToast("Videos de muestra y capacitación (demo)"); }}>▸ Videos de muestra y capacitación</a>
          </div>
          <div className={styles.step}>
            <h4>Envíe la muestra</h4>
            <p>2 kg de café pergamino, por su cuenta, a nuestro laboratorio. Con la muestra recibida, su lote entra en fila para la Arena.</p>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <InfoAccordion
            tone="primary"
            icon={
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c-5-4.4-8-7.6-8-11a8 8 0 0 1 16 0c0 3.4-3 6.6-8 11z" transform="rotate(180 12 12)" /><path d="M12 3v10M12 8c-1.6-.4-2.8-1.4-3.4-3M12 6c1.4-.3 2.5-1.1 3-2.5" /></svg>
            }
            title="EUDR: el pasaporte ambiental de su café hacia Europa"
            subtitle="Reglamento UE contra la deforestación · toque para desplegar"
          >
            <p>
              Desde su entrada en vigor, la Unión Europea solo permite comercializar café que demuestre no estar
              vinculado a deforestación. Es el <b>Reglamento (UE) 2023/1115, conocido como EUDR</b>, y aplica a
              todo café que toque puerto europeo — incluido el suyo. Lo que exige, en concreto:
            </p>
            <ul>
              <li><b>Libre de deforestación:</b> el café debe provenir de predios donde <b>no haya habido deforestación después del 31 de diciembre de 2020</b></li>
              <li><b>Legalidad:</b> producido conforme a la ley colombiana — tenencia de la tierra, ambiente y derechos laborales</li>
              <li><b>Geolocalización de cada predio:</b> coordenadas GPS del lugar exacto donde crece el café; si el predio supera las <b>4 hectáreas, se exige el polígono</b> completo, no solo un punto</li>
              <li><b>Declaración de debida diligencia:</b> presentada en el sistema de información de la UE antes del despacho; su número de referencia acompaña cada embarque</li>
            </ul>
            <p>
              <b>¿Y quién hace todo ese papeleo? Nosotros.</b> Con la geolocalización de sus fincas (la captura al
              registrarlas, guiado por nuestro video de capacitación) y la trazabilidad del registro de la Arena
              —lote, finca, evaluación y sello criptográfico—, <b>CTC prepara y presenta la declaración de debida
              diligencia por usted</b>. Su único trabajo es georreferenciar sus predios con precisión y mantener su
              información al día. La aplicación plena para operadores llega escalonada entre finales de 2026 y
              mediados de 2027 según el tamaño de la empresa, pero la cadena europea ya lo está exigiendo desde hoy:
              llegar con la tarea hecha es llegar primero.
            </p>
            <div className={styles.tag3}>
              <span>Sin deforestación desde 31·dic·2020</span>
              <span>Geolocalización · polígono si &gt; 4 ha</span>
              <span>CTC presenta la declaración por usted</span>
            </div>
          </InfoAccordion>
        </div>

        <div className={styles.sendgrid}>
          <div className={styles.addrband} style={{ backgroundImage: "url('/images/kaffetal-regal/32-cerezas-rama.jpg')" }}>
            <p className="eyebrow" style={{ color: "var(--accent-soft)" }}>Envío de muestras · 2 kg pergamino</p>
            <strong style={{ color: "#fff", fontFamily: "var(--font-fraunces)", fontSize: 21 }}>De su cosecha a nuestra mesa de pruebas</strong>
            <span className="mono" style={{ fontSize: 13.5, color: "#fff" }}>CTC · Cra. 4 #8N-30, vía Guatiguará, casa 205, conjunto campestre Santillana · Piedecuesta, Santander</span>
            <span className="mono" style={{ color: "#C9A45C", fontSize: 12 }}>Marque el paquete con su código de lote (CTC_XXXXXX)</span>
          </div>
          <figure className={styles.bench}>
            <Image src="/images/kaffetal-regal/33-banco-pruebas-real.jpg" alt="Banco de pruebas de café en Piedecuesta" fill sizes="(max-width: 820px) 100vw, 40vw" style={{ objectFit: "cover" }} />
            <span>Su muestra, en nuestro banco de pruebas · Piedecuesta</span>
          </figure>
        </div>
      </div>
    </section>
  );
}
