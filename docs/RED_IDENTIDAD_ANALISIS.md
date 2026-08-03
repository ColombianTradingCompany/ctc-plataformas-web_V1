# Análisis · La red, la identidad y la navegación entre plataformas

**2026-08-02 · respuesta al diagrama de relaciones del owner.** Verificado contra
el código y contra los datos reales de producción, no contra el plan.

---

## Veredicto en una frase

**Lo que usted describe es viable y en su mayor parte YA ESTÁ CONSTRUIDO** — pero
un concepto del diagrama hay que corregirlo, y precisamente esa corrección es lo
que hace que su requisito funcione.

---

## 1 · La corrección: no son logins independientes (y por eso funciona)

Usted escribe: *"cada bloque azul tiene un Login independiente; si un usuario usa
el mismo correo en más de una plataforma esto debe permitirse… supongo que
necesitará alguna lógica especial."*

**No hay lógica especial que construir, porque no son cuentas independientes.**
Hay **UNA identidad** (una fila en `auth.users` por correo) y cada superficie le
cuelga una **membresía** propia:

| Superficie | Su tabla de membresía |
|---|---|
| Kaffetal Regal | `producer_profiles` |
| Cherry Picked | `buyer_profiles` |
| Directorio del Café | `directorio_profiles` |
| Terratalento | `terratalento_recolectores` |
| Red de Socios | `partner_accounts` |

Los **formularios** de acceso sí son independientes y con la marca de cada
superficie; lo que autentican es la misma cuenta.

### La prueba, en sus propios datos (2026-08-02)

26 cuentas en `auth.users`, pero 21 productores + 1 comprador + 4 fichas de
Directorio + 1 recolector + 2 socios = **29 membresías**. Y **cuatro cuentas ya
pertenecen hoy a varias superficies con un solo correo** — entre ellas la suya:

```
ctcexportmain@gmail.com  → productor + Directorio + recolector  (rol bcp_admin)
gabriel.vasquez92@gmail.com → productor + Directorio
gabriel1vasquez@gmail.com   → productor + Directorio
```

Su requisito no solo es viable: **está corriendo en producción desde hace días.**

### Por qué "logins independientes con el mismo correo" es imposible (y no deseable)

`auth.users.email` tiene UNIQUE. Dos cuentas separadas con el mismo correo no
pueden existir en un proyecto de Supabase. Conseguirlo exigiría **un proyecto de
Supabase por plataforma** (adiós datos compartidos, adiós navegación cruzada,
cinco facturas) o una capa de auth propia (meses de trabajo y de riesgo).

La metáfora correcta es la que la plataforma ya usa para EUDR: **un Pasaporte,
varias Visas.** Una identidad, muchas membresías.

---

## 2 · Lo que ya coincide con su diagrama (nada que hacer)

- **Un correo, varias plataformas** — funcionando, con datos reales.
- **Sesión compartida entre subdominios** — la cookie es `Domain=.ctcexport.com`
  (`src/lib/supabase/cookieDomain.ts`, decisión del 2026-07-24): entrar en KR lo
  deja entrado en CP, DC y Terratalento.
- **Coffeed como módulo + home propia** — `CoffeedWall` montado en KR, Cherry
  Picked y el Directorio, más `coffeed.ctcexport.com`. Exactamente su dibujo.
- **Herramientas sin login propio** — la superficie no tiene formulario de
  acceso: reconoce la sesión que ya existe. (El rótulo "landing + login" de mi
  diagrama anterior estaba MAL; su diagrama nuevo tiene razón.)
- **Red de Socios aparte** — tier propio (`partner_accounts`), login de un solo
  factor por nodo, sin Coffeed ni Herramientas en sus paneles.
- **El Control Panel como pivote** — login maestro único que abre BCP/ECP/OCP,
  con su propia cookie (`ctc-panel-auth`) separada de la pública.

---

## 3 · Lo que falta de verdad (tres cosas, todas contenidas)

### 3.1 · El submenú de navegación interna — **el hueco real**
No existe como componente general. **Pero el patrón ya está probado**: el
Directorio tiene `misPlataformas()` (`src/lib/directorio/actions.ts`), que mira
el mismo `profile.id` y responde a qué otras superficies pertenece.

Trabajo: generalizarlo (sumar Directorio, Terratalento y Herramientas al
detector) y montarlo como conmutador en todas las superficies azules. Sin
infraestructura nueva.

### 3.2 · Herramientas no está montada en el Directorio
Su flecha naranja DC → Herramientas no existe todavía. `ToolPanel` está en KR,
Cherry Picked, el ECP y la superficie propia — falta la pestaña en el DC.
Trabajo pequeño: registrar `dc` como `ToolSurface` y montar el panel.

### 3.3 · La regla "Plus" hay que apretarla
Hoy `loadToolAccess("web")` da Plus a **cualquier sesión**. Su regla es más
estricta: Plus solo si el usuario entró con una de las **plataformas
principales** y su cuenta está **activa como tal**.

Propuesta concreta (una función, un solo sitio):

```
Plus  =  productor con Pasaporte del Kaffetal Club activo
      OR comprador con membresía por encima del escalón base (pintón/maduro)
      OR ficha del Directorio VERIFICADA
```

Consecuencia deliberada: un recolector de Terratalento, o alguien que solo tiene
cuenta pero ninguna membresía activa, ve las herramientas Default y no las Plus.
**Falta que usted confirme el "activa como tal" de cada plataforma** — lo de
arriba es mi propuesta, no un hecho.

---

## 4 · Infraestructura: ¿hay que configurar algo más?

**No. Nada nuevo en Supabase, Vercel ni Hostinger para esta visión.**

| Servicio | Estado |
|---|---|
| **Supabase** | El modelo de una identidad + membresías ya funciona; no requiere configuración. Lo único por servicio es la **allowlist de Redirect URLs** para las superficies con Google (5 hoy; Herramientas no necesita ninguna porque no tiene login). Un comodín `https://*.ctcexport.com/**` cubre todas y evita que el hueco se repita. |
| **Vercel** | Los 12 dominios ya están. Una superficie nueva paga el mismo peaje de siempre. |
| **Hostinger** | DNS completo. Nada pendiente. |

---

## 5 · Limitaciones reales (dígalas en voz alta antes de crecer)

1. **Un correo = una cuenta.** No hay forma de tener dos cuentas separadas con el
   mismo correo. El modelo de membresías da lo que usted quiere; la
   "independencia" es visual y de datos, no de credencial.

2. **Sesión compartida ⇒ cierre de sesión compartido.** Salir en una superficie
   saca de todas las públicas. Es el precio de la navegación fluida. (Las
   consolas internas ya están aisladas en su propia cookie desde el V2.26.)

3. **`profiles.role` es de un solo valor** (`producer | buyer | bcp_admin |
   partner`). El Directorio y Terratalento son **sin rol** a propósito y por eso
   componen libremente. **Los socios SÍ usan rol**, así que hoy *un mismo correo
   no puede ser socio y productor a la vez*. No hay conflicto real todavía (2
   socios, ninguno productor), pero si algún día un Master Roaster también quiere
   vender su café, hay que mover a los socios al modelo sin rol.

4. **Productor + comprador en el mismo correo está sin probar.** El rol tendría
   que quedarse con uno de los dos. Hoy no ocurre (21 productores, 1 comprador,
   ninguno ambos). Si el modelo lo va a permitir, conviene probarlo a propósito.

5. **Las herramientas de `public/tools/` son archivos públicos por URL.** La
   compuerta Plus es **curaduría, no secreto**: quien tenga el enlace directo
   abre el HTML. Para calculadoras da igual — pero si Plus va a significar un
   privilegio real, esa herramienta debe servirse desde una ruta autenticada, no
   desde `public/`.

6. **El bucket de Storage** venía en ~492 MB de 1 GB (plan gratuito) y nadie poda
   el Buzón. Es el techo más cercano de todos.

---

## 6 · RESUELTO Y CONSTRUIDO (owner, 2026-08-02 · V2.39)

**La matriz quedó fijada y en código** (`src/lib/identidad/matriz.ts` — única
fuente, con la explicación lista por combinación):

| Puede ser… | productor | comprador | DC | recolector | socio |
|---|---|---|---|---|---|
| **productor** | — | ✕ | ✓ | ✕ | ✕ |
| **comprador** | ✕ | — | ✓ | ✕ | ✕ |
| **recolector** | ✕ | ✕ | ✓ | — | ✕ |
| **socio** | ✕ | ✕ | ✓ | ✕ | (multi-nodo: pendiente, exige PK nuevo) |

"Comprador" = comprador REAL (pedidos, reservas, puntos o escalón > verde) — el
default inerte de handle_new_user no cuenta y puede convertirse en cualquier
cosa. Gates montados: KR y Cherry Picked al detectar sesión (toast con el motivo
+ signOut), Terratalento al crear el perfil, y la emisión de socios ya venía
blindada (guía a la credencial-etiqueta).

**"Activa como tal" = Herramientas Plus por SOLICITUD** (`tools_plus_grants` +
`src/lib/tools/plusGrants.ts`): el productor/comprador/experto DC la pide desde
su plataforma (botón estado-consciente `SolicitarPlus`), y el ECP → Herramientas
del café la activa o rechaza en el sub-tablero compacto por audiencia
(`PlusBoard`). A futuro se ata a pago. La regla derivada (Club/pintón) quedó
retirada. La Disponibilidad ganó la columna **Directorio** y el DC su pestaña
de Herramientas.

## 6b · Orden sugerido (lo restante)

1. Confirmar la definición de "activa como tal" (§3.3).
2. Apretar la regla Plus + montar Herramientas en el Directorio (§3.2, §3.3).
3. El conmutador de red (§3.1) — generalizar `misPlataformas()` y montarlo.
4. Decidir si los socios pasan al modelo sin rol (§5.3) — solo si va a hacer falta.
