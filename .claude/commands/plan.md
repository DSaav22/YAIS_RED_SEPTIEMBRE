---
description: Escribe el plan técnico de una spec existente
argument-hint: <carpeta de la spec, ej. 001-juego-episodio-1>
---

Vas a escribir `specs/$ARGUMENTS/plan.md`: cómo se construye lo que la spec pide.

Pasos:

1. Lee `specs/$ARGUMENTS/spec.md` completa, [specs/constitution.md](../../specs/constitution.md) y [specs/templates/plan.template.md](../../specs/templates/plan.template.md).
2. Lee `C:\Users\qwert\Documents\YAIS-RED\wiki\project\plan-implementacion.md` para respetar el stack y los límites de módulo ya decididos. El vault es referencia externa y no se edita desde esta tarea. No propongas un stack distinto sin decir explícitamente que estás proponiendo cambiar una decisión.
3. Explora el código existente antes de proponer archivos nuevos. Si ya hay algo que hace la mitad, se extiende, no se duplica.
4. Escribe el plan con el template.

Reglas:
- Toda dependencia nueva necesita justificación de una línea que sobreviva a la pregunta "¿y sin esto?".
- Respeta la frontera: `app/src/engine/` es TypeScript puro, sin React, sin DOM, sin Three.
- El orden de implementación debe dejar `npm run verify` en verde en cada paso, no solo al final.
- Si la spec tiene preguntas abiertas que bloquean el diseño técnico, para y dilo en vez de elegir por tu cuenta.

Al terminar, resume en 5 líneas la decisión técnica central y el riesgo más grande.
