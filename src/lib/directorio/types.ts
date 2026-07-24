// ── Directorio del Café · shared types ──────────────────────────────────────
// DB-facing shapes for the real (Supabase-backed) Directorio. No "use client"
// / "use server": imported by both the client components and the server
// actions. See src/lib/directorio/actions.ts for how rows map onto these.

export type DirectorioEstado =
  | "pendiente"
  | "en_revision"
  | "aprobado"
  | "verificado"
  | "rechazado";

export type DocKind = "file" | "url";
export type DocEnlace = "certificacion" | "especialidad";

export type FichaDoc = {
  id: string;
  kind: DocKind;
  url: string | null; // signed URL (file) or the web URL (kind='url')
  nombre: string;
  tipo: string;
  enlazaA: DocEnlace | null;
  enlaceValor: string | null;
  tam: number | null; // bytes, when known (files)
};

/** The signed-in user's own ficha — everything, editable. */
export type MiFicha = {
  profileId: string;
  codigo: string; // derived DC-XXXXXXXX
  nombre: string;
  correo: string; // from auth (profiles.email)
  departamento: string;
  municipio: string;
  telefono: string;
  mostrarTelefono: boolean;
  mostrarCorreo: boolean;
  recibirMensajes: boolean;
  anios: number;
  esp: string[];
  cert: string[];
  bio: string;
  motivo: string;
  motivoTxt: string;
  color: string;
  estado: DirectorioEstado;
  /** estado==='aprobado' and a verification code is waiting to be entered. */
  tieneCodigo: boolean;
  createdAt: string;
  documentos: FichaDoc[];
};

/** A public directory card for another verified member. */
export type Ficha = {
  profileId: string;
  codigo: string;
  nombre: string;
  departamento: string;
  municipio: string;
  telefono: string | null; // only when the owner allows it (mostrar_telefono)
  correo: string | null; // only when the owner allows it (mostrar_correo)
  recibirMensajes: boolean;
  anios: number;
  esp: string[];
  cert: string[];
  bio: string;
  motivoTxt: string;
  color: string;
  iniciales: string;
};

export type Post = {
  id: string;
  autorId: string | null;
  autor: string;
  sub: string;
  ini: string;
  color: string;
  etiqueta: string;
  fijo: boolean;
  esCtc: boolean;
  cuando: string; // relative time
  megusta: number;
  miGusta: boolean;
  texto: string;
};

export type Mensaje = { id: string; yo: boolean; esCtc: boolean; texto: string; hora: string };

export type Hilo = {
  /** "ecp" for the CTC conversation; otherwise the other member's profileId. */
  clave: string;
  canal: "ecp" | "directo";
  nombre: string;
  color: string;
  iniciales: string;
  sub: string;
  noLeido: boolean;
  mensajes: Mensaje[];
};

/** Everything the app needs for one signed-in session, gated by estado. */
export type DirectorioBundle = {
  ficha: MiFicha | null; // null ⇒ authenticated but no ficha yet (show inscription)
  correo: string;
  hiloCtc: Hilo; // conversation with CTC — always present once a ficha exists
  directorio: Ficha[]; // other verified members (empty unless the viewer is verified)
  posts: Post[]; // wall (empty unless verified)
  hilosDirectos: Hilo[]; // member DMs (empty unless verified)
};
