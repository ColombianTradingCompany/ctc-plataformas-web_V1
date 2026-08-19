# Herramientas del Café · el Taller y los trabajos guardados

Escrito el 2026-08-19 (V5.4), saliendo de la revisión V5.0 del owner (bloque A,
puntos A8–A11). Léelo antes de tocar cualquier cosa bajo `/herramientas` o de
subir una herramienta nueva que deba guardar trabajo.

## Qué es

Herramientas del Café dejó de ser un visor anónimo y es una **aplicación
semi-independiente** dentro de la red:

- **La landing** (`/herramientas`) ENSEÑA: un carrusel de capturas reales de
  las herramientas (`CarruselHerramientas`, mecánica de cinta rAF como el
  Sneak Peek), nombre y descripción. Ya no abre ninguna herramienta.
- **La puerta** (`/herramientas/acceso`): la identidad única de la red. Entra
  la misma cuenta de **Kaffetal Regal, Cherry Picked o el Directorio del Café**
  (palabra del owner, A8) — la cookie viaja entre subdominios, así que quien ya
  tiene sesión en cualquiera ni la ve.
- **El taller** (`/herramientas/taller`): la rejilla de trabajo. TODO el
  catálogo compartible, con el estado a la vista — una Plus bloqueada **se
  lista** con su candado y su «Solicitar» (A9); esconderla mataba el deseo.
  El taller NO filtra por la columna `web`: es la casa de las herramientas.
  El reparto por superficie sigue gobernando lo que KR/CP/DC embeben en SUS
  paneles.
- **La concha con memoria** (`/herramientas/taller/<slug>`): si la herramienta
  `soporta_memoria`, antes del iframe aparece el **Home Menu de trabajos** —
  crear con nombre, lista con fechas, retomar, borrar (A11). El estado vive en
  `tool_sessions` y se autoguarda mientras se trabaja.

## La membresía (regla pura: `src/lib/tools/accesoHerramienta.ts`)

Productor de KR ∨ comprador de CP ∨ experto del DC. Sin cuarta identidad.
La vigila `scripts/qa-herramientas-acceso-check.mjs`.

## Los trabajos (`tool_sessions` + `src/lib/tools/trabajos.ts`)

- Tabla service-role-only (RLS encendida, cero políticas). Única escritora: la
  server action, que comprueba **sesión + veredicto de acceso + propiedad**
  (`user_id`) en cada verbo. Techos: 200 KB por estado, 40 trabajos por
  herramienta y usuario.
- El estado es **la foto completa**, no deltas: un guardado perdido nunca deja
  un trabajo a medias.
- `emitirDesdeHerramienta()` es el canal hacia el ecosistema: convierte
  `CTC.emitir(evento, payload)` en una fila de `integration_events`
  (`dominio: it_plataforma`, `tipo: herramienta.<id>.<evento>`) — el mismo
  camino que ya recorren las cotizaciones hacia Make/Notion.

## El puente (`public/tools/ctc-bridge.js`) — cómo se vuelve «con memoria» una herramienta

1. Añade **una línea** antes de `</body>` del HTML de la herramienta:
   `<script src="/tools/ctc-bridge.js"></script>`
2. Marca **«Con memoria (puente)»** en ECP → Herramientas → su ficha.

Nada más para herramientas de formulario: el puente serializa todos los
`input/select/textarea` (por name/id, o por posición) y los restaura
disparando `input`/`change` para que la herramienta recalcule. Para estado que
no vive en campos:

```js
CTC.usarEstado(() => miEstado, (e) => { miEstado = e; });  // guardar/restaurar propio
CTC.tocado();                    // «hay cambios» sin evento de campo
CTC.emitir("reporte.enviado", { lote: "X" });  // empujar al ecosistema
```

Protocolo (postMessage, mismo origen; la concha valida `source` y `origin`,
nunca habla con `*`): `ready` → `init{nombre,estado}` → `estado{...}` (debounce
900 ms) · `emitir{evento,payload}`. Fuera de la concha el puente queda
**inerte**: la herramienta sigue siendo autocontenida y offline.

⚠️ La serialización por posición depende de que los campos no cambien de orden:
**una versión nueva de la herramienta puede dejar viejos los trabajos
guardados**. No es fatal (el puente ignora claves que no encajan), pero si la
herramienta va a evolucionar, que use `CTC.usarEstado` con su propio esquema.

Referencia viva: `costo-empaque` (el puente al pie de su HTML).

## Las capturas del carrusel

`scripts/build-tool-shots.mjs` (playwright, devDependency): con `npm run dev`
andando, `node scripts/build-tool-shots.mjs` captura cada herramienta a
1200×800 en `public/images/herramientas/shots/<id>.jpg` y **se comitea** — el
modelo de las tarjetas OG. Una herramienta sin captura cae a tarjeta de texto
con logo; gana la suya la próxima corrida. ⚠️ El mapa id→ruta del script se
mantiene a mano; una herramienta nueva se añade ahí.

## Lo que quedó pendiente a propósito

- **Google OAuth en la puerta**: el correo/contraseña cubre la identidad única;
  el camino Google exige `auth/callback` propio + entrada en la allowlist de
  Supabase (patrón de KR/CP/Directorio). Se añade cuando el owner lo pida.
- **Trabajos compartidos** (entre dos cuentas) y **capturas por versión**: no
  pedidos; el esquema lo admite sin migrar nada roto.
