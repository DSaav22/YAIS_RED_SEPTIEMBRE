---
description: Implementa una tarea concreta de specs/, con verificación y revisión
argument-hint: <id de tarea, ej. T-001-03>
---

Vas a implementar la tarea **$ARGUMENTS**.

Antes de tocar código:

1. Busca la tarea en `specs/*/tasks.md` y léela completa.
2. Lee la spec y el plan de esa misma carpeta.
3. Lee [specs/constitution.md](../../specs/constitution.md).
4. Si la tarea es ambigua o contradice la spec, **para y pregunta**. No la interpretes a tu criterio.

Implementación:

- Delega en el agente `game-engineer` si la tarea vive en `app/src/engine/` o `app/src/game/`.
- Delega en el agente `panel-engineer` si vive en `app/src/panel/`.
- Cambia solo lo que la tarea pide. Si ves otra cosa que arreglar, anótala, no la arregles de paso.

Cierre:

1. Corre `/verify`.
2. Si la tarea está marcada `requiere content-guardian`, lanza ese agente sobre el diff y no cierres hasta que dé veredicto.
3. Marca la casilla de la tarea en `tasks.md`.
4. Reporta en 5 líneas: qué cambió, qué verificaste, qué quedó pendiente, y qué criterio de aceptación quedó cerrado.

No hagas commit salvo que te lo pidan explícitamente.
