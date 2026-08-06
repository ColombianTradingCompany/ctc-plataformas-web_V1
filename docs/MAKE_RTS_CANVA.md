# RT-Scriptor · fase 2 — el reparto real entre la plataforma y Make

Escrito el 2026-08-06 después de mirar las conexiones de verdad del equipo de
Make, no de oídas.

## El plan decía «Gemini vía Make». No se puede, y no hace falta

Las conexiones reales del equipo **Colombian Trading Company Core** son:

| App | Estado |
|---|---|
| Canva | conectada (OAuth, expira 2027-08-05) |
| Gmail · Google · Notion | conectadas, ya en uso por los 3 escenarios vivos |
| OpenAI · ClickUp | conectadas, sin uso |
| **Gemini** | **NO existe** |

Y la plataforma **sí** tiene `GEMINI_API_KEY` en Vercel — la misma que Coffeed
usa para leer vídeo, con una nota ya escrita en el registro del ECP que dice
exactamente esto: *la usa la plataforma, NO Make*.

Así que el reparto correcto es el que ya existía en la casa:

```
Gemini  →  la plataforma   (tenemos la clave)
Canva   →  Make            (allí vive el OAuth, aquí no)
```

Meter Gemini en Make habría exigido dar de alta una conexión que no existe y
mover una clave que ya está bien donde está.

## Qué hace la plataforma (hecho)

`renderTake({ provider: "imagen" })`:

1. Compone y guarda **el dibujo** de cada fotograma. Siempre, también cuando se
   pidió fotografía: es lo que garantiza que un revelado nunca se quede sin nada
   que mirar.
2. El navegador rasteriza ese mismo dibujo a PNG (`raster.ts` — con un canvas,
   sin `sharp`, que no es dependencia declarada de este proyecto) y lo manda
   como **referencia de encuadre**.
3. Por cada fotograma llama a Gemini con el prompt + esa referencia
   (`geminiImage.ts`). **Falla blando y uno a uno**: si el fotograma 3 no sale,
   se queda en dibujo con el motivo escrito y los otros siete siguen.
4. Si salió alguna fotografía, emite el evento `rts.tablero`.

## Qué tiene que hacer el escenario de Make (PENDIENTE)

**Nombre sugerido**: `RT-Scriptor · Tablero en Canva`
Ya está registrado en `/ecp/automatizaciones` en etapa **propuesta**; al montarlo,
pegar ahí el `scenarioId` y pasarlo a **piloto**.

### Entra

El despachador manda a `MAKE_WEBHOOK_URL` (el mismo router de siempre, rama
nueva por `tipo`):

```json
{
  "tipo": "rts.tablero",
  "dominio": "ventas_marketing",
  "payload": {
    "jobId": "uuid del revelado",
    "projectId": "uuid",
    "projectTitle": "La ruta del lote",
    "scene": "EXT. PATIO DE SECADO — AMANECER",
    "take": 3,
    "aspect": "16:9",
    "frames": { "coffeed/rts/<proj>/frames/<job>/01.png": "https://…firmada…" }
  }
}
```

⚠️ **Las urls están firmadas a 1 hora.** El escenario tiene que descargarlas
dentro de esa ventana; no sirven para guardarlas en Canva como enlace.

### Los módulos

1. **Canva › Upload an Image** (`uploadAsset`), uno por cada url de `frames`.
   Iterar sobre el objeto — es un mapa ruta → url, así que hace falta un
   iterador sobre sus valores.
2. **Canva › Create a Design** (`createADesign`) con los assets subidos.
3. *(opcional)* **Canva › Export a Design** (`exportDesign`) si además se quiere
   un PNG/PDF plano.

### Vuelve

Un HTTP POST a la puerta de siempre:

```
POST https://www.ctcexport.com/api/integraciones/make
Authorization: Bearer {{var.organization.CTC_SECRET}}
```
```json
{
  "tipo": "rts.tablero",
  "dominio": "ventas_marketing",
  "payload": { "jobId": "el mismo", "canva_url": "https://www.canva.com/design/…", "design_id": "DA…" }
}
```

El manejador está escrito y es una lista blanca estrecha
(`src/lib/integraciones/aplicar.ts` → `rtsTablero`): solo guarda **dónde quedó
el diseño**. No toca los fotogramas ni el trabajo de revelado — misma regla que
el espejo de Notion, vuelve la referencia y no el contenido.

## Gotchas que ya costaron una vez (memoria de blueprints)

- El secreto va por **variable de organización** (`{{var.organization.CTC_SECRET}}`),
  nunca pegado: editar un escenario por API borra los secretos pegados a mano.
- En un filtro de Make el arreglo exterior de `conditions` es **OR** y el
  interior **AND**. Filtrar por `tipo` es una sola condición; no anidar de más.
- Los módulos HTTP traen **campos «avanzados» obligatorios** que la API exige
  aunque la interfaz los oculte.

## Lo que queda sin probar, y hay que decirlo

- **La llamada a Gemini no se ha ejecutado nunca.** La clave vive solo en
  Vercel, así que desde local no se puede. El primer «Acción · imagen» en
  producción es la prueba de vida.
- **El identificador del modelo es una apuesta.** Por eso es configurable:
  `GEMINI_IMAGE_MODEL` en Vercel, con `gemini-3-pro-image` por defecto. Si el
  log dice `El modelo «…» no existe o no admite imagen`, se cambia la variable
  y no hace falta desplegar.
- El escenario de Canva no está montado.
