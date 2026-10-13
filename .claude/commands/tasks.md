---
description: Descompone un plan en tareas implementables por un agente
argument-hint: <carpeta de la spec, ej. 001-juego-episodio-1>
---

Vas a escribir `specs/$ARGUMENTS/tasks.md` a partir de la spec y el plan de esa carpeta.

Pasos:

1. Lee `spec.md` y `plan.md` de `specs/$ARGUMENTS/`, y [specs/templates/tasks.template.md](../../specs/templates/tasks.template.md).
2. Parte el plan en tareas donde cada una:
   - se pueda terminar en una sesión de agente,
   - toque pocos archivos y tenga fronteras claras con las demás,
   - cierre al menos un criterio de aceptación de la spec,
   - deje el repo con `npm run verify` en verde.
3. Escribe cada tarea autocontenida: quien la tome no leyó la conversación donde nació. Incluye rutas exactas y el criterio que cierra.
4. Ordénalas por dependencia real. Marca cuáles se pueden hacer en paralelo sin pisarse.

Reglas:
- Nada de tareas tipo "implementar el panel". Si no puedes nombrar los archivos, la tarea es un plan, no una tarea.
- Cada tarea lleva su "No hagas": la desviación más probable.
- Las tareas que tocan contenido para niños, protocolo de derivación o modelo de datos se marcan con `requiere content-guardian`.

Al terminar, muestra la lista de tareas con su orden y cuáles son paralelizables.
