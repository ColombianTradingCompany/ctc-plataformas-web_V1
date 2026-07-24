# `directoriodelcafe.ctcexport.com` · configuración de dominio

Estado del código: **CONSTRUIDO.** El Directorio de Especialistas del Café · Santander
vive en `/directorio` y `src/proxy.ts` ya mapea el subdominio a esa ruta. Falta solo el
paso externo (Vercel + Hostinger), idéntico al que ya se hizo para `kaffetal-regal`,
`cherry-picked` y los 5 nodos socios.

| Subdominio | Ruta interna |
|---|---|
| `directoriodelcafe.ctcexport.com` | `/directorio` |

En desarrollo y sin DNS, la misma página responde por ruta: `http://localhost:3000/directorio`.

## Los dos pasos

### 1 · Vercel — registrar el dominio en el proyecto

1. Entra a **vercel.com** → proyecto **`ctc-plataformas-web-v1`** → pestaña **Settings** →
   **Domains**.
2. En el campo de arriba escribe el subdominio **completo**:

   ```
   directoriodelcafe.ctcexport.com
   ```

   y pulsa **Add**.
3. Vercel dirá que el dominio no está configurado y mostrará el registro DNS que hay que
   crear. Será un **CNAME**. **Copia el destino que te muestre esa pantalla** — históricamente
   para este proyecto ha sido:

   ```
   ade3fc85fa244f17.vercel-dns-017.com
   ```

   pero si Vercel muestra otro, manda el de Vercel, no el de este documento.
4. Deja esa pestaña abierta; vuelves a ella en el paso 3.

### 2 · Hostinger — crear el CNAME

1. Entra a **hpanel.hostinger.com** → **Dominios** → **ctcexport.com** → **DNS / Nameservers**
   (la sección "Editor de zona DNS").
2. **Añadir nuevo registro** con exactamente estos valores:

   | Campo | Valor |
   |---|---|
   | Tipo | `CNAME` |
   | Nombre | `directoriodelcafe` |
   | Destino / Apunta a | el destino que copiaste de Vercel (p. ej. `ade3fc85fa244f17.vercel-dns-017.com`) |
   | TTL | `300` |

   ⚠️ En **Nombre** va **solo la etiqueta** (`directoriodelcafe`), NO el dominio completo.
   Hostinger le añade `.ctcexport.com` solo. Si escribes el dominio entero te queda
   `directoriodelcafe.ctcexport.com.ctcexport.com` y no resuelve nunca.
3. Guardar.

### 3 · Confirmar

Vuelve a la pestaña de Vercel y recarga. En unos minutos (a veces 30, rara vez más de
una hora) el dominio pasa de "Invalid Configuration" a **"Valid Configuration"** y Vercel
emite el certificado HTTPS solo. Cuando eso ocurra, `https://directoriodelcafe.ctcexport.com`
sirve la landing del directorio.

Comprobación desde una terminal, sin esperar al navegador:

```bash
nslookup directoriodelcafe.ctcexport.com
```

## Lo que NO se toca

Nada más de la zona DNS. En particular **no toques los registros MX ni los TXT de correo**
(SPF/DKIM/DMARC de Resend y del buzón `info@ctcexport.com`): un CNAME nuevo con una
etiqueta propia es aditivo y no interfiere con ninguno de ellos.

## Por qué no hace falta tocar código

`src/proxy.ts` lee el `Host:` de la petición, saca la primera etiqueta (`directoriodelcafe`)
y reescribe la ruta a `/directorio`. Ya está en `SUBDOMAIN_ROUTES`, así que en cuanto el DNS
resuelva y Vercel enrute el dominio al proyecto, la página aparece sin desplegar nada nuevo.

Verificado en local antes de pedir el DNS:

```bash
curl -s -H "Host: directoriodelcafe.ctcexport.com" http://localhost:3000/ | grep -o "<title>[^<]*</title>"
# <title>Directorio de Especialistas del Café · Santander — CTC</title>
```
