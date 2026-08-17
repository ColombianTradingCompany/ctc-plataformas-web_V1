# OCP · Transcripciones — transcribir en la nube (AssemblyAI)

Cómo dejar de depender de que el equipo con GPU esté encendido. **Cinco minutos, una sola vez.**

El módulo funciona sin esto: el worker local (`Iniciar transcriptor.bat` en
`ctc-platform/tools/transcriptor/`, desde V4.15 — antes vivía fuera del repo) sigue siendo la
vía gratis, y en conversación normal la calidad es equivalente (ver §4: la nube acierta casi lo
mismo y a veces menos en tecnicismos). Lo de aquí añade un botón **«Transcribir en la nube»**
para cuando el PC está apagado o hay prisa. Mientras no se configure, el botón **no aparece**
— nada se rompe.

---

## 1 · Crear la cuenta y sacar la clave

1. <https://www.assemblyai.com/> → **Sign up** (correo + contraseña).
2. Añadir una tarjeta en **Billing**. Hay saldo gratis de prueba; el uso real es tan barato
   que conviene mirar el punto 4 antes de asustarse.
3. Copiar la **API key** del panel (empieza por una cadena larga hexadecimal).

> Ninguna de estas tres cosas la puede hacer Claude: crear cuentas y meter datos de pago
> es tuyo por diseño.

## 2 · Poner las dos variables

**En Vercel** (Project → Settings → Environment Variables), entorno *Production* (y *Preview*
si quieres probar allí):

| Variable | Valor |
|---|---|
| `ASSEMBLYAI_API_KEY` | la clave del paso 1 |
| `ASSEMBLYAI_WEBHOOK_SECRET` | una cadena larga y aleatoria que generes tú (p. ej. `openssl rand -base64 32`). **Nunca la escribas en este repo: es público.** (La cadena de ejemplo que hubo aquí se rotó el 2026-08-17.) |

Después hay que **redeplegar** para que el build las tome (Deployments → ⋯ → Redeploy).

**En local** (`ctc-platform/.env.local`), las mismas dos líneas, si quieres probarlo en
`npm run dev`. En local el webhook no llega —AssemblyAI no puede llamar a `localhost`— pero
el detalle **sondea** al proveedor cada 10 s, así que igual termina.

## 3 · Usarlo

OCP → Cotizadores → Transcripciones → subir el audio como siempre. En el detalle, mientras
esté **Pendiente**, aparece **«Transcribir en la nube»**. Al pulsarlo:

1. Se firma un enlace del audio en Storage (6 h de vida) y se manda el trabajo.
2. La fila pasa a **Transcribiendo en AssemblyAI**.
3. Cuando termina, AssemblyAI llama a `/api/transcripciones/callback` con la cabecera
   secreta; la fila pasa a **Lista** y la página se actualiza sola.
4. Si ese aviso se perdiera, el sondeo del detalle pregunta igualmente. No se queda colgada.

Una transcripción en error también ofrece el botón: **Reintentar en el equipo** o mandarla a
la nube.

## 4 · Lo que cuesta

AssemblyAI cobra **US$0,15/hora** de audio + **US$0,02/hora** por diarización = **US$0,17/hora**.

| Audio | Coste |
|---|---|
| nota de voz de 10 min | ~US$0,03 |
| llamada de 22 min | ~US$0,06 |
| 10 horas al mes | ~US$1,70 |

El worker local sigue costando **cero**. La regla práctica: nube cuando corre prisa o el PC
está apagado; equipo para lo demás y para lo sensible.

## 5 · Lo que hay que saber antes de pulsar

- **El audio sale a un tercero.** Va a los servidores de AssemblyAI por un enlace firmado que
  caduca en 6 horas. Con el worker local no sale de tu equipo. Para una llamada de negocio
  normal no hay problema; para algo confidencial, usa el local.
- **La calidad es buena, pero no idéntica.** El local corre Whisper `large-v3` + pyannote, que
  en español con jerga cafetera va muy fino. AssemblyAI acierta prácticamente lo mismo en
  conversación normal y a veces menos en tecnicismos.
- **Los hablantes se renombran igual**: sus etiquetas A/B/C se traducen a `SPEAKER_00/01/02`,
  así que el resto del módulo (chips, nombres, exportar) no nota la diferencia.

## 6 · Comprobar que quedó bien puesto (sin entrar al OCP)

Un POST **sin** cabecera secreta al webhook distingue los tres estados:

```bash
curl -s -o - -w "\n%{http_code}\n" -X POST https://www.ctcexport.com/api/transcripciones/callback -H "content-type: application/json" -d "{}"
```

| Respuesta | Qué significa |
|---|---|
| **401** `unauthorized` | ✅ el secreto está puesto y el endpoint rechaza a los desconocidos |
| **503** `webhook not configured` | falta `ASSEMBLYAI_WEBHOOK_SECRET` en ese entorno (o el deploy es anterior a añadirla) |
| otra cosa | mirar los logs del deploy |

Y la prueba completa —manda un audio de verdad y espera el webhook, ~US$0,002—:

```bash
node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-transcripciones-nube.mjs
```

Siembra una fila de prueba, la manda, comprueba el resultado y **borra fila y audio** al terminar.
Dice además si el aviso llegó **por webhook** (vía rápida) o **por sondeo** (el webhook no llegó:
mirar el secreto).

## 7 · Si algo falla

| Síntoma | Causa | Qué hacer |
|---|---|---|
| No aparece el botón | falta `ASSEMBLYAI_API_KEY` en ese entorno | añadirla y redeplegar |
| «AssemblyAI rechazó el trabajo: …» | clave inválida o sin saldo | revisar Billing |
| Se queda en *Transcribiendo* | webhook no llegó | el sondeo lo resuelve solo; si no, el detalle lo reintenta |
| 401 en `/api/transcripciones/callback` | el secreto de Vercel y el que se mandó no coinciden | volver a mandar el trabajo tras corregir la variable |

Código: `src/lib/transcripciones/cloud.ts` (envío, ingesta, sondeo),
`src/app/api/transcripciones/callback/route.ts` (webhook),
`src/lib/transcripciones/actions.ts` (`sendTranscriptToCloud`, `refreshCloudStatus`).
