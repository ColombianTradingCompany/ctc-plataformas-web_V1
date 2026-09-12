# Briefs · proyectos nuevos (Herramientas Internas · Herramientas del Café)

Un proyecto que el owner trae y que **no está en ningún charter** empieza aquí, no en el código. La
sesión (arrancada con la variante «PROYECTO NUEVO» de `docs/KICKOFF.md`) escribe UN archivo
`<clave>-<slug>.md` con esta plantilla, añade la fila «en scoping» al inventario de su charter, y
espera la aprobación del owner. Aprobado el brief, el proyecto vive en el charter como cualquier otro
y el brief queda como acta de origen.

```
# Brief · <nombre>  (componente: <clave> · slug: <slug> · fecha)

**Qué es** — en tres líneas, para alguien que no lo ha visto.
**Para quién** — productor · comprador · equipo CTC · socio · el owner.
**Dónde vivirá** — apps-internas/<slug> (app propia) · tools/<slug> (herramienta local) ·
  public/tools/<slug>.html + registro `tools` (herramienta pública) · módulo de consola (cuál).
**Datos** — tablas nuevas (patrón de la casa: RLS + cero políticas, guard triggers) o ninguna.
**IA** — llamadas pagadas, modelo (pequeño por defecto), qué es opt-in, superficie en USOS.
**Contratos que toca** — grados · subdominios · identidad · vocabulario · … (ALINEACION §1) o ninguno.
**Guardián previsto** — qué costura protegerá `qa-<slug>-check.mjs`.
**Primera tanda** — lo mínimo que se puede desplegar y verificar en vivo.
**Decisiones del owner** — lo que bloquea, con la pregunta escrita.
```
