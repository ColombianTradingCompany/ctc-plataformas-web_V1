# Notas de la tanda de revamp público (abierta 2026-08-11)

Documento **temporal y vivo**. Existe porque el revamp de las páginas públicas va
por varias sesiones y el Version Wrap se hará al final, no en medio: aquí se
apunta lo que hay que recordar mientras tanto, sin esperar a compilar el mapa.

**Cuando se haga el wrap: volcar esto en el log de la documentación interactiva
y BORRAR este archivo.** Si sigue aquí después del wrap, algo se quedó sin
compilar.

---

## Estado al cierre del 2026-08-11

Desplegado y verificado en producción, `APP_VERSION 3.15`:

| Commit | Qué |
|---|---|
| `c4fb902` | CTC Home: hero mínimo, cinta de mercado, ventanas, Contexto, menús, pie |
| `eba190b` | Sellado de bitácora |
| `5489a19` | Cherry Picked se parte: hub + Green |
| `b92fcf2` | Sellado de bitácora |
| `b2b67a3` | El callback viejo manda a la Green canónica |

DNS completo: los 14 subdominios responden 200, `cherry-picked-green` incluido.

Las cuatro entradas de detalle están en
`docs/architecture/Log_Documentacion_Interactiva_V29.txt`, ya selladas con su
commit. **Este archivo no las repite**: recoge lo que NO cabe en el log.

---

## Decisiones abiertas, esperando al owner

### 1. El estilo de los botones del hero
El owner los encontró «bland y power-pointy». Van dos rondas de propuestas, todas
dibujadas encima del hero real (mismo fotograma, mismo velo, mismos colores).

**Ronda 1 — descartadas 2 y 3:**
1. **Sello** — del sello de grado (Papagayo Beans): anillo grueso, grano de
   papel, disco con la flecha que gira 45°. **SIGUE EN PIE.**
2. ~~Ficha~~ — etiqueta de saco con esquina cortada y ojal. Descartada.
3. ~~Cinta~~ — panel translúcido estilo cinta de mercado. Descartada.

**Ronda 2 — el owner pidió «realismo, quizá con algo de 3D»**, así que las tres
nuevas se construyeron sobre materiales y relieve de verdad:

4. **Tecla** — la más física. El canto es un `box-shadow` SÓLIDO (`0 6px 0`), no
   una sombra difuminada: eso es lo que la hace leerse como un cuerpo con
   altura. Al pulsar baja 5 px y el canto se reduce a 1 — el recorrido real de
   una tecla.
5. **Placa** — del mundo de la instrumentación (sorter óptico, Koffee Senser):
   metal cepillado, bisel, dos remaches y el texto GRABADO (luz debajo de la
   letra, sombra encima — al revés que un relieve). Un brillo especular cruza en
   diagonal al pasar.
6. **Costal** — el saco de exportación, que es literalmente el objeto del
   negocio: trama de yute en las dos direcciones, pespunte por dentro y letra de
   plantilla con la tinta ligeramente corrida.

**RESUELTO: el owner eligió COSTAL**, y pidió conservar los cuatro para
reutilizarlos. Ya no es una decisión abierta — es un sistema:

- Los cuatro tratamientos viven en `globals.css` como la familia **`.ctcb`**,
  con **tratamiento** y **tono** en ejes independientes. Un tono nuevo son seis
  variables y funciona con los cuatro; un tratamiento nuevo hereda los cuatro
  tonos. Marcado y ejemplo, en el comentario del propio bloque.
- Tonos listos: `ctcb-gold`, `ctcb-blue`, `ctcb-green`, `ctcb-ink`.
- El hero va con **Costal** en oro (vender) y azul (comprar). `Hero.module.css`
  se quedó solo con el reparto de la fila: **cambiar de tratamiento es cambiar
  una clase en `Hero.tsx`**.

Al reutilizarlos en otras superficies, ojo con dos cosas: Costal pone la segunda
línea en VERSALITA (`text-transform:uppercase`), así que la copia tiene que
aguantarlo; y las cuatro variantes asumen fondo oscuro o medio — sobre `--paper`
el relieve casi no se ve.

### 2. Co-Create está renombrado a medias
El hub de Cherry Picked ya lo llama **«Cherry Picked Co-Create»**, porque el
owner lo definió como el primer programa de la plataforma de compra. Pero su
propia landing —`co-create.ctcexport.com`, `components/services/CoCreateLanding`—
sigue diciendo **«CTC Co-Create»** y sigue siendo una superficie de captación
Clase B: sin login, con formulario que deposita en `leads`, y con el armazón de
las landings de servicio, no con el de la familia Cherry Picked (FamilyHeader,
FamilyBubble, runtime trilingüe propio).

Nada está roto. Lo que pasa es que **quien va del hub a Co-Create ve que el
nombre le cambia debajo**. Para cerrarlo hay que decidir dos cosas, y ninguna es
mía:

- ¿Se renombra la marca en su landing y en el CRM del BCP (`/bcp/co-create`)?
- ¿Se lleva al armazón de la familia, o se queda como superficie de captación?
  Si se lleva, deja de ser Clase B y eso toca la regla de las tres clases de
  V4 (ver `docs/V4_RED_RESTRUCTURE_ANALYSIS.md`).

El subdominio `co-create.ctcexport.com` no hace falta cambiarlo en ningún caso.

---

### 3. La tipografía del titular del hero
El owner quiere probar familias y tamaños. Se montó **`/lab/tipografia`** — sin
enlazar, excluida en `robots.ts`, no guarda nada. Ocho familias reales cargadas
con `next/font` solo en esa ruta, más tamaño, grosor, espaciado, interlínea,
conmutador de lengua con los titulares REALES y tratamientos sueltos para la
palabra «café».

**Pendiente: que elija familia y números.** Al montarlo hay que llevar la familia
elegida a `src/app/layout.tsx` (donde vive `Fraunces` hoy) y traducir el tamaño
del laboratorio, que es fijo, al `clamp()` del hero, que crece con la pantalla.
Después: **borrar `src/app/lab/` y las siete fuentes que no se usen**, o se
quedan cargando para siempre.

⚠️ El velo del escenario del laboratorio está COPIADO de `Hero.module.css`. Si
allí se retoca y aquí no, el laboratorio deja de decir la verdad.

## Deuda que dejó esta tanda

- **El robusta de Londres y los inventarios de ICE no salen en la cinta** porque
  no tienen fuente pública gratuita (probados RC=F, RM=F, LRC=F, el buscador de
  Yahoo y Stooq, 2026-08-11). Están declarados como anclas
  (`robusta_londres`, `ice_certificados` en `src/lib/anclas/types.ts`) y la cinta
  los dibuja sola en cuanto `market_anchors` tenga una lectura suya — pero el
  tablero del OCP (`AnclasBoard`) sigue administrando solo `ANCHOR_KINDS[0]`.
  Para poder anotarlos a mano hace falta hacer ese tablero multi-tipo.
- **El hub de Cherry Picked no tiene captación de correo.**
  `newsletter_subscribers` tiene un CHECK que solo admite `roast | x | ctc-home`
  y no se hizo una migración en producción por una comodidad que nadie pidió.
  Si se quiere lista de espera por mercado para Green, es una migración + un
  campo de país, no solo una fuente nueva.
- **Dos imágenes se quedaron sin sitio** al retirar «El hilo de integración»: el
  mapa de regiones cafeteras (`thread-regiones-cafeteras.jpg`) y los sellos de
  grado (`thread-grados-ctc.png`). Siguen en `public/images/ctc-home/`.
- **El proxy compara con `startsWith`**, así que `cherry-picked.ctcexport.com`
  también sirve `/cherry-picked-green`, `/cherry-picked-roast` y
  `/cherry-picked-x`. Es anterior a esta tanda y se dejó como está, pero si
  alguna vez importa el contenido duplicado, se arregla comparando el segmento
  completo y no el prefijo de cadena.

---

## Lecciones de herramienta (no van al mapa, pero cuestan tiempo)

- **Chrome headless en Windows no puede fotografiar móvil.** El sistema impone
  un ancho mínimo de ventana, así que `--window-size=390,H` maqueta a ~600px y
  la captura es la franja izquierda de una página más ancha: *parece* desborde
  horizontal y cabecera rota, y no es ninguna de las dos cosas. `--headless=new`
  tampoco lo arregla. Para anchos estrechos hay que medir en el DOM vivo
  (`documentElement.scrollWidth === clientWidth`).
- **Para fotografiar un estado `:hover` o un `<details>` abierto**, añadir una
  regla temporal (`opacity:1 !important`, o el atributo `open`), disparar y
  revertir — y hacer `grep` del marcador antes de commitear.

---

## Lo que sigue

El owner anunció **más revamp de las otras páginas públicas**. Candidatas por
orden de deuda visible:

1. **Kaffetal Regal** — su landing todavía cuenta Specialty/Black a su manera
   (`ProcessFlow`), sin el vocabulario canónico de la Fase 0 de V4.
2. **Cherry Picked Green** — misma pendiente en `BlackSection`.
3. **Co-Create** — ver la decisión abierta de arriba.
4. **Varietales** — sigue esperando material de la landing por parte del owner.
