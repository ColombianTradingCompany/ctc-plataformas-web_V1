import Link from "next/link";
import { notFound } from "next/navigation";
import { Hud } from "@/components/os/Hud";
import { ProcedenciaProvider } from "@/components/os/Procedencia";
import { Acciones } from "@/components/os/vistas/Acciones";
import { Almacen } from "@/components/os/vistas/Almacen";
import { Estafeta } from "@/components/os/vistas/Estafeta";
import { Hacienda } from "@/components/os/vistas/Hacienda";
import { InicioVista } from "@/components/os/vistas/Inicio";
import { Taller } from "@/components/os/vistas/Taller";
import { demoPermitido } from "@/lib/os/demo/permitido";
import { ACCIONES_DEMO, ESTAFETA_DEMO, IDENTIDAD_DEMO, TABLERO_DEMO } from "@/lib/os/demo/datos";
import { parsearModulos } from "@/lib/os/modulos";
import s from "@/components/os/os.module.css";
import "@/components/os/identidad/os-tokens.css";

// ── CTCx OS · el modo demostración (V6.19, F2) · SOLO LOCAL ──────────────────
// Las MISMAS vistas de la OS con un tablero inventado (`demo/datos.ts`), para las capturas de revisión
// de identidad (PLAN §7.8) con Chrome sin interfaz: la OS de verdad pide contraseña y código por correo.
// Vive FUERA de `(app)`: no pasa por la compuerta de la consola, así que trae su propio contexto de quien
// mira (una identidad inventada) y sus propios tokens del juego (crítica 10). No toca la base ni los
// lectores. Sin `OS_DEMO=1`, o en producción, es un 404 (`demoPermitido`).

export const dynamic = "force-dynamic";

const VISTAS = [
  { clave: undefined, titulo: "Inicio" },
  { clave: "hacienda", titulo: "Hacienda" },
  { clave: "almacen", titulo: "Almacén" },
  { clave: "taller", titulo: "Taller" },
  { clave: "estafeta", titulo: "Estafeta" },
  { clave: "acciones", titulo: "Acciones" },
] as const;

export default async function OsDemoPage({ params }: { params: Promise<{ vista?: string[] }> }) {
  if (!demoPermitido()) notFound();
  const { vista } = await params;
  if (vista && vista.length > 1) notFound();
  const clave = vista?.[0];
  if (clave !== undefined && !VISTAS.some((v) => v.clave === clave)) notFound();
  // Los valores por defecto del registro, salvo los dos de F3 (en obra, apagados por defecto en la OS de verdad): la
  // demostración los enciende para que la revisión vea su hoja y su vista. No lee la base.
  const modulos = parsearModulos({ version: 1, modulos: { estafeta: { encendido: true }, acciones: { encendido: true } } });

  return (
    <ProcedenciaProvider consolas={IDENTIDAD_DEMO.consolas} isOwner={IDENTIDAD_DEMO.isOwner} nombre={IDENTIDAD_DEMO.nombre}>
      <main data-os-juego="" className={s.demo}>
        <div className={s.demoBanda}>
          <span role="status">Modo demostración · datos inventados</span>
          <nav aria-label="Vistas de la demostración" className={s.demoNav}>
            {VISTAS.map((v) => (
              <Link key={v.titulo} href={v.clave ? `/os/demo/${v.clave}` : "/os/demo"} aria-current={v.clave === clave ? "page" : undefined}>
                {v.titulo}
              </Link>
            ))}
          </nav>
        </div>
        <Hud tablero={TABLERO_DEMO} />
        {clave === undefined && <InicioVista tablero={TABLERO_DEMO} modulos={modulos} base="/os/demo" />}
        {clave === "hacienda" && <Hacienda tablero={TABLERO_DEMO} modulos={modulos} base="/os/demo" />}
        {clave === "almacen" && <Almacen tablero={TABLERO_DEMO} />}
        {clave === "taller" && <Taller tablero={TABLERO_DEMO} version="V0.0-EJEMPLO" sha="ejemplo" />}
        {clave === "estafeta" && <Estafeta estafeta={ESTAFETA_DEMO} />}
        {clave === "acciones" && <Acciones acciones={ACCIONES_DEMO} />}
      </main>
    </ProcedenciaProvider>
  );
}
