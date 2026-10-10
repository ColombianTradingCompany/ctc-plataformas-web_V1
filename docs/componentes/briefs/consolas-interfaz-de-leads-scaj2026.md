# Interfaz de Leads · SCAJ 2026 — informe para el owner (V6.2, madrugada del 2026-10-11)

> Lo que pediste la noche del 10 de octubre: «una "Interfaz de Leads" como módulo de LCP · General, con "Forms" que se activan o
> desactivan para aparecer (una a la vez) en la página principal de ctcexport.com [...] la primera Form para "SCAJ2026"». La
> especificación campo a campo es la tuya (`reference/Web_Lead_Form/prompt-formulario-leads-scaj2026.md`). Aquí va lo que quedó
> hecho, lo que decidí distinto y por qué, lo que te toca a ti antes del miércoles y cómo lo pruebas.

## 1 · Lo que hay en vivo

| Qué | Dónde |
|---|---|
| **El formulario** (ES · EN · 日本語, móvil primero) | `https://www.ctcexport.com/scaj2026` — el QR del stand lleva a `https://www.ctcexport.com/scaj2026?source=qr-stand` |
| **La insignia «SCAJ2026»** en la cabecera de CTC Home (sale solo mientras el formulario esté ENCENDIDO) | `https://www.ctcexport.com` → lleva a `/scaj2026?source=web` |
| **El módulo «Interfaz de Leads»** (encender/apagar, configuración, QR para imprimir, vista previa de los correos, los leads, el CSV) | LCP · General → `https://www.ctcexport.com/lcp/formularios` |
| **El aviso de privacidad** que enlaza el consentimiento (ES · EN · JA; puedes cambiarlo por otra URL en la configuración) | `https://www.ctcexport.com/scaj2026/privacidad` |
| **La baja** (enlace que va al pie de cada correo) | `https://www.ctcexport.com/scaj2026/baja?id=…&t=…` |

**El formulario quedó ENCENDIDO** (lo encendí para probarlo de punta a punta y lo dejé así: la insignia ya sale en la portada y la
página recibe envíos). **Los correos quedaron APAGADOS** hasta que apruebes los textos (§4): cada lead queda guardado con su fecha y
hora y con la fecha en que vence su seguimiento (siete días después, a la misma hora), así que nada se pierde mientras tanto.

## 2 · Cómo funciona

1. El visitante escanea el QR, el formulario abre en el idioma de su navegador (japonés, español; cualquier otro, inglés) y lo
   cambia arriba. Las preguntas cambian según el tipo (tu tabla, más las de la casa del §3). «Qué valoras» son casillas y, al
   marcar una, aparece la escala de **cinco granos de café**.
2. Al enviar se guarda **una fila en `event_leads`** (Supabase, solo service role: ni la tabla ni las fotos son visibles desde fuera).
   La foto de la tarjeta va al bucket **privado** `event-leads` con nombre aleatorio; la consola la enseña con una URL firmada de 10
   minutos. Si la foto falla, el lead se guarda igual (sin foto).
3. **Nada se pierde**: lo escrito se guarda en el celular (vuelve si se cierra la página), si la conexión falla se reintenta con un
   botón, y **un doble toque en Enviar no crea dos leads** (cada envío lleva una clave que la base rechaza la segunda vez).
4. **Protección contra bots que nadie nota**: un campo oculto que solo un bot llena (se finge éxito y no se guarda nada) y un sello de
   tiempo firmado por el servidor (un envío a menos de 3 s de abrir la página, o a más de 24 h, se rechaza).
5. Al terminar: «Gracias. Ya quedamos conectados» y el botón **«Registrar a otra persona»**, que deja el formulario vacío (para
   cuando llenes tú por alguien).
6. **Correo inmediato** (cuando lo enciendas): sale al guardar, en el idioma del formulario (**el japonés recibe inglés** hasta la
   revisión nativa), abre con lo más valorado, enfoca por tipo (comprador → Cherry Picked; productor → Kaffetal Regal; prensa →
   conversar y material), responde a lo que pidió (Sample Pack → pide la dirección; catálogo → enlace al catálogo público;
   videollamada → tu enlace de agenda o «propón dos horarios») y añade el Master Roaster si lo marcó. Firma quien tú digas; las
   respuestas llegan al Reply-To que configures (hoy `info@ctcexport.com`).
7. **Seguimiento** (cuando lo enciendas): un cron horario manda, exactamente siete días después del envío (a la hora), un solo correo
   que retoma `wants` y `timing` y propone un paso concreto. **No sale** si la persona se dio de baja, si ya le salió, o si **ya
   respondió** (se mira el Buzón: un correo entrante desde su dirección después del primero). También lo puedes marcar a mano.
8. **Qué lead quedó en qué estado**: cada fila lleva cuándo salió cada correo (o qué falló), cuándo vence el seguimiento, si
   respondió, si se dio de baja, tu nota y la etapa (nuevo · en conversación · convertido · cerrado).

## 3 · Lo que añadí desde el conocimiento de la casa (preguntas nuevas, todas con un toque)

| Pregunta | A quién | Por qué sirve |
|---|---|---|
| **¿Qué grados CTCx te interesan?** Black · Red · Blue · Gold · Tyrian, con una línea de qué es cada uno | compradores | Segmenta por la escalera de la casa desde el primer contacto: a quién se le habla de Black de barra y a quién de Gold y Tyrian |
| **¿En qué formato te sirve recibir el café?** fracciones de 6 kg al vacío · sacos de 35 kg (GrainPro + yute) · contenedor consolidado vía un tostador socio · aún no sé | compradores | Es la doble unidad del modelo (bolsa de 6 kg ↔ saco de 35 kg ↔ contenedor por el Master Roaster): dice en qué programa cae |
| **¿Qué certificaciones exige tu mercado?** JAS Orgánico · Rainforest · Fairtrade · libre de deforestación (EUDR) · ninguna | compradores | En Japón manda el JAS orgánico; saberlo antes evita ofrecer lo que no pueden comprar |
| **¿Verde o ya tostado en Japón?** | cafetería / distribuidor | Separa a quien tuesta de quien necesita el programa Roast (tostado por un tostador socio) |
| **¿Te interesa operar como nodo logístico de CTC en Japón?** | importador / distribuidor | Es el «Regional Operation Enablement» del modelo: el socio que recibe el contenedor y guarda el verde. Los importadores son los candidatos naturales |
| **¿Te interesa evaluar y vender tu café con CTCx?** | productor | En el stand de ProColombia pasarán productores: esta casilla los manda a Kaffetal Regal con un correo que lo explica |

El formulario sigue corto: cada tipo ve como mucho tres o cuatro de estas, todas de un toque.

## 4 · Lo que te toca a ti (antes del miércoles 14, 10:00 de Japón)

1. **Aprobar los textos de los correos** (§5, abajo) y, si quieres cambiar algo, decírmelo: son bloques de texto, no un modelo, y se
   corrigen en `src/lib/leadForms/correos.ts`. Cuando los apruebes: LCP → Interfaz de Leads → Configuración → marcar **«Correo
   inmediato»** y **«Seguimiento»** → Guardar. Los leads que ya llegaron sin correo se mandan con **«Enviar los pendientes»**.
2. **Las cuatro cosas que solo tú sabes**, en la misma configuración: el **enlace de agenda** para la videollamada (vacío, el correo
   pide dos horarios), el **aviso de privacidad** (ya hay uno en `/scaj2026/privacidad`; cámbialo si tienes otro), el **Reply-To**
   (hoy `info@ctcexport.com`, que es tu Buzón) y **la firma** (nombre y cargo; vacío, firma la casa).
3. **El japonés**: los textos del formulario están en `src/lib/leadForms/scaj2026/textos.json` (ES · EN · JA): un hablante nativo
   los corrige ahí, sin tocar código. Los correos no tienen versión japonesa: quien llenó en japonés recibe inglés (es lo que pediste).
4. **Imprimir el QR**: LCP → Interfaz de Leads → «Descargar el QR (SVG)». Lleva a `/scaj2026?source=qr-stand`. Si imprimes más de uno,
   cambia `qr-stand` por otro valor en la URL y genera otro QR (cualquier generador sirve; el `source` es lo que distingue cada uno).
5. **Probar desde tu celular**: escanea el QR o abre la URL, llena en cada idioma y mira el lead en la LCP (aparece al instante, con
   «✉ pendiente» hasta que enciendas los correos). Para probar el seguimiento sin esperar siete días: en el lead, **«Enviar el
   seguimiento ahora»**.

## 5 · Los textos de los correos, con cuatro perfiles de ejemplo

Generados con los constructores reales. **No afirman precios, puntajes, plazos ni condiciones del Sample Pack**: solo lo publicado
(el guardián `qa-lead-forms` falla si asoma una cifra). El enlace de baja de abajo es de ejemplo; cada correo real lleva el suyo.

### Tostador japonés que pide muestras y marca Master Roaster (llenó en japonés → recibe inglés)

**Correo inmediato · EN** · asunto: _Haruki, thank you for stopping by the CTC stand at SCAJ 2026_

```
Hello Haruki,

Thank you for the conversation at SCAJ. You told us that what weighs most for you is farm-to-cup traceability, verified cup quality and consistency across lots and harvests: noted, because that is exactly how we work every lot.

Our catalogue for roasters lives in Cherry Picked: Colombian lots with their CTCx grade, their evaluation and their Dossier, bought through CTCx. https://cherry-picked.ctcexport.com

You asked for the Sample Pack: reply with the shipping address (company, street, city, postal code, country and a phone number) and we will coordinate it with you.

The public lot catalogue, with each lot's reference, is here: https://www.ctcexport.com/ctcx-public-catalogue

You marked an interest in the CTC Master Roaster role: the partner roastery at destination that receives the container, stores the green coffee and roasts coffee that is already sold. We would like to talk it through with you: reply and we will set up a conversation.

What you are looking for right now, in your words: “Washed lots for filter, 5 to 10 bags”. We have it in mind.

Warm regards,
[Nombre y cargo del owner — se fija en la LCP]
Colombian Trading Company · CTCx
info@ctcexport.com

If you would rather not receive further emails about this conversation, you can unsubscribe here: https://www.ctcexport.com/scaj2026/baja?id=<id>&t=<testigo>
```

**Seguimiento (7 días) · EN** · asunto: _Haruki, shall we continue? · CTC after SCAJ 2026_

```
Hello Haruki,

A week ago we met at the CTC stand at SCAJ 2026. I am writing to pick up where we left off.

If you have not yet sent us the shipping address for the Sample Pack, reply with it (company, street, city, postal code, country and phone) and we will get it moving.

The public lot catalogue is still here: https://www.ctcexport.com/ctcx-public-catalogue

You told us you plan to buy in the coming months: this is a good time to choose lots and talk quantities. Reply and we will make it concrete.

Warm regards,
[Nombre y cargo del owner — se fija en la LCP]
Colombian Trading Company · CTCx
info@ctcexport.com

If you would rather not receive further emails about this conversation, you can unsubscribe here: https://www.ctcexport.com/scaj2026/baja?id=<id>&t=<testigo>
```

### Importador que solo explora y pide una videollamada (inglés)

**Correo inmediato · EN** · asunto: _Mei, thank you for stopping by the CTC stand at SCAJ 2026_

```
Hello Mei,

Thank you for the conversation at SCAJ. You told us that what weighs most for you is consistency across lots and harvests, documented sustainability and a competitive price: noted, because that is exactly how we work every lot.

Our catalogue for roasters lives in Cherry Picked: Colombian lots with their CTCx grade, their evaluation and their Dossier, bought through CTCx. https://cherry-picked.ctcexport.com

For the video call, reply with two time slots that suit you (Japan time) and we will confirm one.

You also marked an interest in operating as a CTC logistics node in Japan, the partner that receives the container and stores the green coffee for the region's roasters. We can talk it through whenever you like.

Warm regards,
[Nombre y cargo del owner — se fija en la LCP]
Colombian Trading Company · CTCx
info@ctcexport.com

If you would rather not receive further emails about this conversation, you can unsubscribe here: https://www.ctcexport.com/scaj2026/baja?id=<id>&t=<testigo>
```

**Seguimiento (7 días) · EN** · asunto: _Mei, shall we continue? · CTC after SCAJ 2026_

```
Hello Mei,

A week ago we met at the CTC stand at SCAJ 2026. I am writing to pick up where we left off.

If we have not set the video call yet, reply with two time slots (Japan time) and we will confirm it.

You told us you are exploring, no rush. If it helps, we can send you material on how we work each lot; just reply to this email.

Warm regards,
[Nombre y cargo del owner — se fija en la LCP]
Colombian Trading Company · CTCx
info@ctcexport.com

If you would rather not receive further emails about this conversation, you can unsubscribe here: https://www.ctcexport.com/scaj2026/baja?id=<id>&t=<testigo>
```

### Productor colombiano de visita, interesado en evaluar su café (español)

**Correo inmediato · ES** · asunto: _Rosalba, gracias por pasar por el stand de CTC en SCAJ 2026_

```
Hola Rosalba,

Gracias por la conversación en SCAJ y por dejarnos tus datos.

Kaffetal Regal es nuestra plataforma para el productor: allí se registra la finca, se arma la ficha de cada lote y el café se evalúa con protocolo para recibir su grado CTCx y una oferta. https://kaffetal-regal.ctcexport.com

Nos marcaste interés en evaluar y vender tu café con CTCx: cuéntanos de tu finca y de tu café respondiendo a este correo y te decimos cómo empieza la evaluación.

Para la videollamada, respóndenos con dos horarios que te sirvan (hora de Japón) y te confirmamos uno.

Un abrazo,
[Nombre y cargo del owner — se fija en la LCP]
Colombian Trading Company · CTCx
info@ctcexport.com

Si no quieres recibir más correos sobre esta conversación, puedes darte de baja aquí: https://www.ctcexport.com/scaj2026/baja?id=<id>&t=<testigo>
```

**Seguimiento (7 días) · ES** · asunto: _Rosalba, ¿seguimos? · CTC después de SCAJ 2026_

```
Hola Rosalba,

Hace una semana nos conocimos en el stand de CTC en SCAJ 2026. Te escribo para retomar lo que hablamos.

Si aún no fijamos la videollamada, respóndeme con dos horarios (hora de Japón) y la confirmamos.

Un abrazo,
[Nombre y cargo del owner — se fija en la LCP]
Colombian Trading Company · CTCx
info@ctcexport.com

Si no quieres recibir más correos sobre esta conversación, puedes darte de baja aquí: https://www.ctcexport.com/scaj2026/baja?id=<id>&t=<testigo>
```

### Prensa que pide material (español)

**Correo inmediato · ES** · asunto: _Carlos, gracias por pasar por el stand de CTC en SCAJ 2026_

```
Hola Carlos,

Gracias por la conversación en SCAJ y por dejarnos tus datos.

Con gusto conversamos contigo y te compartimos material sobre CTCx y el café colombiano con trazabilidad de finca a taza. Dinos qué formato te sirve (entrevista, imágenes, visita a origen) y lo preparamos.

El catálogo público de lotes, con la referencia de cada uno, está aquí: https://www.ctcexport.com/ctcx-public-catalogue

Lo que buscas ahora, en tus palabras: «Historias de productores con datos verificables». Lo tenemos presente.

Un abrazo,
[Nombre y cargo del owner — se fija en la LCP]
Colombian Trading Company · CTCx
info@ctcexport.com

Si no quieres recibir más correos sobre esta conversación, puedes darte de baja aquí: https://www.ctcexport.com/scaj2026/baja?id=<id>&t=<testigo>
```

**Seguimiento (7 días) · ES** · asunto: _Carlos, ¿seguimos? · CTC después de SCAJ 2026_

```
Hola Carlos,

Hace una semana nos conocimos en el stand de CTC en SCAJ 2026. Te escribo para retomar lo que hablamos.

El catálogo público de lotes sigue aquí: https://www.ctcexport.com/ctcx-public-catalogue

Un abrazo,
[Nombre y cargo del owner — se fija en la LCP]
Colombian Trading Company · CTCx
info@ctcexport.com

Si no quieres recibir más correos sobre esta conversación, puedes darte de baja aquí: https://www.ctcexport.com/scaj2026/baja?id=<id>&t=<testigo>
```


## 6 · Lo que decidí distinto a tu documento, y por qué

- **Sin Make**: todo corre dentro de lo que ya tienes (Resend con el remitente verificado `info@ctcexport.com`, Vercel Cron para el
  seguimiento, Supabase para guardar). Una pieza menos que pueda fallar en la feria, y el estado de cada correo queda en la misma
  fila del lead.
- **Los correos nacen apagados** (tú lo pediste: «antes de activar cualquier envío, muéstrame los textos»). El interruptor está en la LCP.
- **El seguimiento es a la hora, no al minuto**: el cron corre cada hora (minuto 5), así que sale dentro de la hora en que se cumplen
  los siete días. Es la granularidad de Vercel Cron.
- **El formulario no se indexa** (`noindex`): es una puerta de la feria, no una página para buscadores.
- **Los valores se guardan en inglés** como en tu tabla; «values» se llama `values_beans` en la base (la palabra `values` es reservada
  en SQL). Las preguntas de la casa van en `extra` (jsonb), para que el siguiente formulario pueda traer otras sin migrar.
- **Una fila `lead_forms` por formulario**: el módulo de la LCP enciende uno a la vez (la base lo impide con un índice único). El
  siguiente formulario es: una carpeta de textos, una entrada en el registro del código, una página de tres líneas y una fila.
- **«Alguna protección contra envíos automáticos»** = honeypot + sello de tiempo. Sin captcha, como pediste.
- **Lo probé desde el panel del navegador en tamaño móvil** (tres envíos: tostador en japonés con granos, grados, formato y JAS;
  productor en español con «evaluar con CTCx»; prensa en inglés), más el bucket de las fotos por script (subida firmada anónima, sin
  listado ni lectura sin firma, lectura firmada, borrado). **Desde un celular real te toca a ti**: la cámara y el teclado japonés no
  se pueden conducir desde aquí. Las tres filas de prueba (`source = prueba-dev`, correos `@ctc-qa-test.co`) las borré al terminar.

## 7 · Pendiente

- Revisión nativa del japonés (formulario) y, si la quieres, una versión japonesa de los correos.
- El Reply-To, la firma, el enlace de agenda y el aviso de privacidad definitivos (§4.2).
- El Sample Pack: el correo pide la dirección y no promete condiciones; cuando definas qué kit va a Japón y cómo, se lo decimos al lead a mano.
- Un segundo formulario (otra feria) copiará este; si quieres uno para la Embajada o ProColombia con otro `source`, es solo otro QR.
