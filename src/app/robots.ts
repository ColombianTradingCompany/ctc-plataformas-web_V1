import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // `/lab` es la mesa de pruebas del owner (tipografía del titular): no está
    // enlazada desde ningún sitio y no debe indexarse. Ver app/lab/.
    rules: [{ userAgent: "*", disallow: ["/bcp", "/lab"] }],
  };
}
