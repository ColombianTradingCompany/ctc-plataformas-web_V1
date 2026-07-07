"use client";

import { useState } from "react";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import { GRADES, STAGES, type Finca, type GeneralInfo, type Lot } from "./data";
import styles from "./AppDashboard.module.css";

export function AppDashboard({
  userName,
  lots,
  fincas,
  gi,
  onBackHome,
  onNewLot,
  onOpenFicha,
  onRenameLot,
  onOpenFincaModal,
  onOpenInfoModal,
}: {
  userName: string;
  lots: Lot[];
  fincas: Finca[];
  gi: GeneralInfo;
  onBackHome: () => void;
  onNewLot: () => void;
  onOpenFicha: (lotId: string) => void;
  onRenameLot: (lotId: string, newName: string) => void;
  onOpenFincaModal: (index: number) => void;
  onOpenInfoModal: () => void;
}) {
  const { showToast } = useToast();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [humConfirmed, setHumConfirmed] = useState<number | null>(null);
  const [humInput, setHumInput] = useState("");

  function startRename(l: Lot) {
    setRenamingId(l.id);
    setRenameValue(l.name);
  }
  function saveRename(id: string) {
    if (renameValue.trim()) onRenameLot(id, renameValue.trim());
    setRenamingId(null);
  }

  function confirmHum() {
    const v = parseFloat(humInput);
    if (!v) {
      showToast("Escriba el porcentaje leído en la papeleta HIC");
      return;
    }
    setHumConfirmed(v);
    if (v > 12.5) showToast(`⚠ ${v.toFixed(1)}% está alto: reacondicione el secado. Un asesor de CTC lo contactará (demo)`);
    else showToast(`Humedad de fin de mes 2 confirmada: ${v.toFixed(1)}% ✓`);
  }

  return (
    <div>
      <div className={styles.appTop}>
        <div className={`wrap ${styles.nav}`}>
          <a href="#" className={styles.brand} onClick={(e) => { e.preventDefault(); onBackHome(); }}>
            <Image className={styles.krl} src="/images/shared/kaffetal-regal-logo.png" alt="Kaffetal Regal" width={1254} height={1254} />
            <span>
              <span className={styles.name}>Kaffetal Regal</span>
              <span className={styles.by}>Panel del productor · by CTC</span>
            </span>
          </a>
          <button className="btn btn-sm" style={{ marginLeft: "auto", borderColor: "var(--t-tyrian)", color: "var(--t-tyrian)" }} onClick={() => showToast("Cherry Picked · así se ve su café en Europa (demo)")}>
            Cherry Picked ↗
          </button>
          <button className="btn btn-sm" onClick={onBackHome}>← Inicio</button>
          <button className="btn btn-sm btn-solid" onClick={onNewLot}>+ Registrar nuevo lote</button>
        </div>
      </div>

      <div className={`wrap ${styles.main}`}>
        <p className="eyebrow">Panel del productor</p>
        <h1 className={styles.h1}>Buenos días, {userName}</h1>
        <div className={styles.ag}>
          <div className={`${styles.acard} ${styles.wide}`}>
            <span className={styles.k}>Mis lotes · cada café se asocia a una finca</span>
            <div style={{ marginTop: 8 }}>
              {lots.map((l) => {
                const col = l.grade ? GRADES[l.grade] : "var(--accent)";
                const state = l.grade ? `Galardonado ${l.grade}` : STAGES[l.stage];
                return (
                  <div className={styles.lotrow} style={{ ["--lc" as string]: col } as React.CSSProperties} key={l.id}>
                    <div>
                      {renamingId === l.id ? (
                        <div className={styles.rn}>
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveRename(l.id)}
                            autoFocus
                          />
                          <button className={styles.iconbtn} onClick={() => saveRename(l.id)}>✓</button>
                          <button className={styles.iconbtn} onClick={() => setRenamingId(null)}>✕</button>
                        </div>
                      ) : (
                        <h4>
                          {l.id} · {l.name}{" "}
                          <button className={styles.iconbtn} title="Renombrar lote" aria-label={`Renombrar ${l.id}`} onClick={() => startRename(l)}>✎</button>
                        </h4>
                      )}
                      <div className={styles.sub}>Finca: {l.finca} · {l.extra}</div>
                      <div className={styles.track}>
                        {STAGES.slice(0, 6).map((_, i) => (
                          <i key={i} className={i <= l.stage ? styles.on : ""} />
                        ))}
                      </div>
                    </div>
                    <span className={styles.state} style={{ ["--lc" as string]: col } as React.CSSProperties}>{state}</span>
                    <button className="btn btn-sm" onClick={() => onOpenFicha(l.id)}>{l.stage === 0 ? "Completar ficha" : "Ver ficha"}</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.acard}>
            <span className={styles.k}>Información general · se registra una sola vez</span>
            <div className={styles.alist} style={{ marginTop: 8 }}>
              Razón social: <b>{gi.razon}</b><br />
              NIT / CC: <b>{gi.nit}</b><br />
              Agricultor: <b>{gi.agri}</b><br />
              Estado: <b className={styles.ok}>verificado ✓</b>
            </div>
            <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={onOpenInfoModal}>Editar información</button>
          </div>

          <div className={`${styles.acard} ${styles.wide}`}>
            <span className={styles.k}>Oferta activa · L-0007 galardonado <b style={{ color: "var(--t-blue)" }}>BLUE</b> · Arena #12</span>
            <div className={styles.alist} style={{ marginTop: 8 }}>
              Congelado: <b>400 kg pergamino</b> · Compra inicial muestras: <b>15 kg pagados ✓</b><br />
              Pedidos confirmados desde Europa: <b>240 kg</b> (aumentos firmados: 2)<br />
              Fin mes 1: liberó <b>120 kg</b> al mercado local (tenía derecho a 200)<br />
              Corte y pago total: <b>fin del mes 3 · 28 sep 2026</b> · Contrato renovable
            </div>
            <div className={styles.track} aria-label="Progreso del trato"><i className={styles.on} /><i className={styles.on} /><i /></div>
            <div className={styles.alist} style={{ marginTop: 4 }}>Mes 1 ✓ · Mes 2 en curso · Mes 3 pendiente</div>
          </div>

          <div className={styles.acard}>
            <span className={styles.k}>Mis fincas · {fincas.length} registradas</span>
            <div>
              {fincas.map((f, i) => (
                <div className={styles.fincarow} key={f.name + i}>
                  <h5>{f.name}</h5>
                  <div className={styles.sub}>
                    {f.vereda} · {f.mun}, {f.depto} · {f.alt} msnm · {f.ha} ha<br />
                    {f.hist}<br />
                    {f.carac}
                  </div>
                  <div style={{ marginTop: 8 }}><button className="btn btn-sm" onClick={() => onOpenFincaModal(i)}>Editar</button></div>
                </div>
              ))}
            </div>
            <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => onOpenFincaModal(-1)}>+ Agregar finca</button>
          </div>

          <div className={styles.acard}>
            <span className={styles.k}>Control de humedad · L-0007</span>
            <div className={styles.humMonth}>Fin mes 1 · <span className={styles.ok}>10,8 % ✓</span> <span style={{ color: "var(--muted)" }}>· papeleta HIC #0331</span></div>
            {humConfirmed === null ? (
              <div className={styles.humMonth}>
                Fin mes 2 · <span className={styles.pend}>pendiente</span>
                <input type="number" step="0.1" min={8} max={14} placeholder="%" value={humInput} onChange={(e) => setHumInput(e.target.value)} />
                <button className="btn btn-sm btn-solid" onClick={confirmHum}>Confirmar</button>
              </div>
            ) : (
              <div className={styles.humMonth}>Fin mes 2 · <span className={styles.ok}>{humConfirmed.toFixed(1).replace(".", ",")} % ✓</span> <span style={{ color: "var(--muted)" }}>· confirmado hoy</span></div>
            )}
            <div className={styles.humMonth}>Fin mes 3 · <span style={{ color: "var(--muted)" }}>se habilita el 31 ago</span></div>
            <div className={styles.alist} style={{ marginTop: 8 }}>
              Papeletas HIC: <b>enviadas gratis ✓</b> ·{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); showToast("Video: cómo medir con la papeleta HIC (demo)"); }} style={{ color: "var(--primary)", fontWeight: 600 }}>▸ Capacitación</a>
            </div>
          </div>

          <div className={styles.acard}>
            <span className={styles.k}>Certificación CTC</span>
            <div className={styles.v} style={{ fontSize: 20 }}>2 emitidas</div>
            <div className={styles.alist}>
              L-0007 · Blue · Arena #12<br />
              L-0009 · Evaluado (sin galardón) + feedback<br />
              Sello: <b>0x3f8a…9c2</b> ⛓ verificable
            </div>
            <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => showToast("Certificado CTC con sello verificable (demo)")}>Ver certificados</button>
          </div>

          <div className={`${styles.acard} ${styles.wide}`}>
            <span className={styles.k}>Envío de muestras · 2 kg pergamino por lote</span>
            <div className={styles.alist} style={{ marginTop: 6 }}>
              <b>CTC · Cra. 4 # 10-8 · Piedecuesta, Santander · Colombia</b><br />
              Marque el paquete con el código del lote. El envío corre por su cuenta; con la muestra recibida, el lote entra en fila para la Arena.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
