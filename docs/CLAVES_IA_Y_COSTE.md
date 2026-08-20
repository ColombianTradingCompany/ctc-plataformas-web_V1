# Las claves de IA, y cuánto cuesta cada cosa

Escrito el 2026-08-20 (V5.10), tras la primera generación real de Redacción, que
falló por credenciales y dejó al descubierto lo que faltaba explicar.

## 1. Las tres claves, dónde van y qué enciende cada una

Todas viven en **Vercel → proyecto `ctc-plataformas-web-v1` → Settings →
Environment Variables**, ámbito **Production** (y Preview si quieres probar en
rama). ⚠️ Vercel **no aplica una variable nueva a un despliegue viejo**: después
de guardarla hay que **redesplegar** (Deployments → el último → ⋯ → Redeploy).

| Variable | De dónde sale | Qué enciende | Si falta |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys | El redactor de Redacción, el triaje/propuestas de Coffeed, Direccionamiento, el «¿Y ahora qué?» de KR | Todo sigue funcionando **a mano**: Redacción saca un borrador determinista y lo dice |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key | La lectura de vídeo de YouTube y **la portada** de Redacción | La entrega sale **sin portada**, avisando |
| `GEMINI_IMAGE_MODEL` | opcional | Fija el modelo de imagen (por defecto el del código) | Se usa el de por defecto |

### Cómo saber cuál es el problema sin adivinar

El aviso que viaja con la entrega ya lo dice, y hay que leerlo literal:

- **«Sin ANTHROPIC_API_KEY»** → la variable **no está** en Vercel.
- **«Claude 401 · authentication_error»** → la variable **sí está**, pero la clave
  está revocada, rotada o caducada. *Esto pasó el 2026-08-20: la última llamada
  buena fue del 11 de agosto.* Se arregla generando una clave nueva y pegándola.
- **«Gemini … NO TIENE CUOTA para generar imagen (429)»** → la clave es válida,
  pero **la generación de imagen no entra en el nivel gratuito**. Hay que activar
  facturación en el proyecto de Google AI de esa clave, o apuntar
  `GEMINI_IMAGE_MODEL` a un modelo que tu plan sí cubra.

El libro de consumo (`ai_usage`, tablero en **ECP → Consumo**) guarda cada
llamada con su error: es el sitio donde comprobar «¿esto funcionó alguna vez?».

## 2. Lo que cuesta cada cosa, medido

Tarifas de `src/lib/ai/precios.ts`. Un post real ronda 700 tokens de entrada y
900 de salida:

| Paso | Modelo | Coste |
|---|---|---|
| **Leer los medios** (`refrescarNoticias`) | ninguno | **$0** |
| Escribir el capítulo | **Haiku** (por defecto) | **~$0.005** |
| Escribir el capítulo | Sonnet | ~$0.010 · **~$0.016 desde el 01/09** |
| Portada | Gemini imagen | **el renglón más caro** — por eso se pide |

📌 **Sonnet está de precio de lanzamiento hasta el 2026-08-31.** El 1 de
septiembre la misma llamada cuesta un 50 % más sin que nadie toque el código.

## 3. Dónde se iba el dinero de verdad

El gasto grande **no era la redacción**: era el **barrido agéntico** del Estudio
(`sweepSources` en `aiActions.ts`), que le pregunta a Sonnet **con búsqueda web**
qué publicó cada medio — `webSearch: 5` por medio, 14 medios. Eso son hasta **70
búsquedas por barrido**, que Anthropic factura aparte del token, más ~$0.27 de
tokens por vuelta. Repetido a lo largo de un día, ahí están los dólares.

**V5.9 lo reemplazó por RSS**: `refrescarNoticias` lee los mismos medios por su
feed —instantáneo, con fecha exacta, gratis y sin clave— y deja el modelo solo
para lo que un programa no sabe hacer: escribir. Si el barrido viejo sigue
disponible en el taller del Estudio, **úsalo solo para los medios sin feed**.

## 4. La regla, para lo que venga

Escrita por el owner el 2026-08-20 y adoptada como criterio:

1. **Lo que puede hacer un programa, que no lo haga un modelo.** Leer un feed,
   deduplicar, filtrar por palabra, ordenar, formatear: todo eso es código.
2. **El modelo más pequeño que haga el trabajo.** Redactar 7 paneles a partir de
   un titular es Haiku, no Sonnet. Subir de modelo es cambiar UNA constante
   (`MODELO_REDACTOR`) y cuesta el doble — que sea una decisión, no una inercia.
3. **El techo de salida es coste.** `maxTokens` generoso no es una red de
   seguridad: es divagación pagada. El de Redacción bajó de 2200 a 1400.
4. **La búsqueda web se factura aparte.** `webSearch: n` multiplica por medio y
   por vuelta; es el parámetro más caro de todo el código.
5. **Lo caro se pide, no se da por hecho.** La portada es una casilla a la vista
   con su precio al lado, no un efecto secundario de pulsar «Crear».
6. **Sin clave, todo sigue operable a mano y avisando.** Ninguna función se cae
   porque falte una credencial; saca su versión determinista y lo dice.
