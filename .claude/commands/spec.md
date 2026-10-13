---
description: Escribe una spec nueva en specs/ a partir de una idea, siguiendo SDD
argument-hint: <número y nombre corto, ej. 003 minijuego-fichas>
---

Vas a escribir la spec `specs/$ARGUMENTS/spec.md`. El *qué* y el *por qué*, nunca el *cómo*.

Pasos:

1. Lee [specs/constitution.md](../../specs/constitution.md) y [specs/templates/spec.template.md](../../specs/templates/spec.template.md).
2. Busca en el vault externo `C:\Users\qwert\Documents\YAIS-RED\wiki\` lo que ya se decidió sobre este tema. El vault es referencia y no se edita desde esta tarea. Esta spec no inventa producto: traduce a criterios verificables lo que la wiki y los guiones ya establecen. Si la wiki no lo cubre, dilo y pregunta antes de inventarlo.
3. Escribe la spec con el template. Los criterios de aceptación van en EARS, con **DEBE**, uno por comportamiento observable.
4. Llena la sección de restricciones de la constitución con los artículos concretos que aplican, no genéricos.
5. Deja las preguntas abiertas con nombre y apellido de quién decide.

Reglas:
- Sin decisiones técnicas: ni framework, ni estructura de archivos, ni nombres de componentes. Eso es del `/plan`.
- Si un criterio no se puede comprobar, no es un criterio: reescríbelo.
- La sección "No entra" es obligatoria y tiene que doler un poco.

Al terminar, muestra la ruta del archivo y lista las preguntas abiertas que bloquean la implementación.
