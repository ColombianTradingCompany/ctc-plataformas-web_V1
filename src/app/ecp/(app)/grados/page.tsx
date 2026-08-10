import { redirect } from "next/navigation";

// Grados de Calidad se mudó dentro del módulo Direccionamiento (2026-08-10).
// La URL vieja se queda viva: está enlazada desde fuera de la consola y no
// cuesta nada mantenerla (mismo patrón que /bcp/login → /login).
export default function GradosRedirect() {
  redirect("/ecp/direccionamiento/grados");
}
