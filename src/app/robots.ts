import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // `/lab` es la mesa de pruebas del owner (tipografía del titular): no está
    // enlazada desde ningún sitio y no debe indexarse. Ver app/lab/.
    //
    // `/ecp` y `/ocp` se añadieron el 2026-08-14: nacieron con el login maestro
    // del 2026-07-15 y llevaban desde entonces fuera de esta lista. Es ORDEN, no
    // seguridad — quien de verdad las protege es `requireConsoleAccess()` y el
    // re-chequeo de cada Server Action; este archivo es público y pedir que no
    // se rastree una ruta es justamente anunciar que existe.
    //
    // OJO: el proxy excluye `robots.txt` de su matcher a propósito, así que este
    // MISMO archivo se sirve en los 18 subdominios. Por eso las reglas se
    // escriben por RUTA interna y valen para todos los hosts a la vez; hoy no
    // hay forma de darle reglas propias a un subdominio.
    rules: [{ userAgent: "*", disallow: ["/bcp", "/ecp", "/ocp", "/lab"] }],
  };
}
