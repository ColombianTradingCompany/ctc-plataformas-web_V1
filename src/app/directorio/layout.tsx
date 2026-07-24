import { Big_Shoulders, IBM_Plex_Mono, Lora } from "next/font/google";
import "./directorio.css";

// Las tres familias del prototipo, servidas por next/font en vez del <link> a
// Google Fonts: se autoalojan en el build, así que no hay petición a un
// tercero ni salto tipográfico al cargar.
//
// OJO con el nombre: el prototipo pedía "Big Shoulders Display", pero Google
// rebautizó esa familia como "Big Shoulders" a secas y next/font solo exporta
// `Big_Shoulders` (el `_Display` ya no existe). Es la misma tipografía.
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// `.dir` es el ancla de TODA la hoja de estilo del directorio: lleva los
// tokens de color y las tres variables de fuente. Ver el comentario de cabecera
// en directorio.css para por qué no van en :root.
export default function DirectorioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`dir ${bigShoulders.variable} ${lora.variable} ${plexMono.variable}`}>
      {children}
    </div>
  );
}
