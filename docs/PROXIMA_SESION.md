# Pendientes · escrito al cierre del 2026-08-05 (V3.0)

La sesión del 5 de agosto cerró con el hito **V3.0**: las fases F0–F3 de
integraciones vivas, Coffeed dando la vuelta completa por primera vez, y el
barrido leyendo feeds. Esto es lo
que quedó abierto, en orden de valor.

## Coffeed

1. **Probar la extracción de vídeo con Gemini EN VIVO.** `gemini.ts` está
   desplegado pero la forma de la respuesta REST de la Interactions API no está
   documentada con claridad; el parser prueba las formas conocidas y si falla
   cae al camino de texto. Basta con seleccionar un vídeo del barrido, extraer,
   y mirar los logs de Vercel: `[coffeed:ia:extract:gemini:…]` = cayó al texto.
2. **5 medios sin feed**: Federación Nacional de Cafeteros, Perfect Daily
   Grind, Coffee ad Astra (¡es YouTube y no resolvió el channel_id — mirar por
   qué!), Comunicaffe, ICO. Van por el agente (lento, 150 s si expira). O se
   les encuentra el feed a mano y se escribe en `coffeed_sources.feed_url`, o
   se acepta el camino lento.
3. **Calidad editorial** («clunky y básico», dixit el owner): el tono vive en
   `VOZ` (aiActions.ts) y en `coffeed_brand.art_direction` (lo edita el ECP).
   Afinar con ejemplos reales, ahora que ya salen piezas.
4. `deliverables`: solo existe 1 (la prueba de vida). El muro en las 4
   superficies sigue casi vacío — producir 2-3 capítulos reales.

## Integraciones (F4 · F5)

5. **F4 (redes)** sigue esperando: decidido que se desbloqueaba Coffeed
   primero. Cuando haya piezas reales: carrusel→Instagram exige render a
   imagen (posible proyecto Canva) + bucket público + cuenta IG Business.
   La vía barata mientras tanto: capturar a mano el permalink como entrega
   `embed` (el muro ya lo modela).
6. **`cotizacion.nota` sin probar de punta a punta** — falta emitir una
   cotización REAL desde el OCP, escribirle la Nota comercial en Notion y
   esperar el barrido de 15 min. Todo lo demás del espejo está probado.
7. **F5 (WhatsApp)**: sin empezar; recordar las semanas de trámite de Meta.

## Deuda y limpieza

8. `qa-guard-check.mjs` no corre: necesita una cuenta QA de productor
   (procedimiento en la memoria del roster). Crear Prueba, correr, borrar.
9. **Version Wrap V27** de la documentación interactiva: el Log V26 tiene ~12
   entradas del 5 de agosto sin compilar (skill `architecture-doc-versioning`).
10. Registrar en `/ecp/automatizaciones` una nota sobre la GEMINI_API_KEY
    (vive en Vercel, la usa la plataforma — NO Make).
11. GDPR: la política de privacidad sigue sin escribirse y la lista de
    subprocesadores creció hoy: Resend, Notion, Google, Make, Anthropic y
    ahora Google Gemini (vídeo). Cada día que pasa es más urgente.
12. Rotar `INTEGRACIONES_SECRET_MAKE` quedó HECHO (2026-08-05); la variable de
    Make (`{{var.organization.CTC_SECRET}}`) hace que rotar sea: Vercel +
    variable de Make + redeploy. Documentado en el registro del ECP.

## Salud del sistema (auditado 2026-08-05 al cierre)

- Guardianes: feeds 25/25 · grados 44/44 · integraciones 9/9 · docs 14/14 ·
  claims 26/26 · embed 26/26 · anclas 13/13 · espejo-notion 9/9.
- Cola de integraciones: 0 pendientes, 0 fallidos, 0 entrantes sin aplicar.
- Escenarios de Make: los 3 activos, con el secreto vía variable de org.
- `quotes`: 2, intactas. Bitácora V26: 0 marcas «pending» (selladas por blame).
