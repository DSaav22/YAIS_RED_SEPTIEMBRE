# YAIS — La Isla de los Acuerdos

Repositorio de código del juego web 3D de decisiones de YAIS-RED.

## Estado

**Prototipo en construcción, no validado.** El vertical slice del Episodio 1
(«Saludo que puedo elegir») está a medio implementar: existe el scaffold, la
compuerta de calidad y el registro de assets. Todo el contenido dirigido a niños
sigue en borrador y la aplicación lo señala en pantalla con el distintivo
`Borrador no validado`.

Nada de esto está validado con niños, ni pedagógicamente, ni en móvil. El avance
real por tarea está en [`docs/ESTADO-IMPLEMENTACION.md`](docs/ESTADO-IMPLEMENTACION.md).

## Empezar

Requiere Node 20.19+ o 22.12+ (desarrollado con 22.14.0).

```bash
npm install
npm run dev
```

La compuerta de calidad, que debe quedar verde antes de dar una tarea por
terminada, es una sola:

```bash
npm run verify
```

Ejecuta, en orden: typecheck, lint, tests, `check:safety` y build.

## Estructura

- `app/`: aplicación Vite + React + TypeScript estricto.
  - `app/src/engine/`: motor de contenido en TypeScript puro, sin React, DOM ni Three.
  - `app/src/shared/`: registro de assets, mapa de animaciones y estilos.
  - `app/src/game/`: experiencia del niño (diálogo 2D accesible y escena 3D).
- `assets/`: fuentes visuales, modelos, rigs, renders y manifiestos. **No se
  sobrescriben ni se «mejoran»: una variante nueva lleva versión nueva.**
- `content/`: narrativa estructurada y versionable. El código la lee, no la copia.
- `specs/`: constitución, especificación, plan y tareas.
- `scripts/`: seguridad, sincronización de assets del runtime y pipeline 3D.
- `docs/`: handoff, estado de implementación y snapshot de recursos.
- `PRODUCCION-3D.md`: estado técnico, comandos y pendientes del arte 3D.

## Reglas que el repositorio hace cumplir solo

`npm run check:safety` falla la compuerta si aparece identidad infantil, chat,
texto libre sobre un menor, marcado de riesgo, puntaje competitivo, o si el
motor deja de ser TypeScript puro. Lo que no se puede verificar con un script se
revisa con los agentes `content-guardian` y `a11y-perf-reviewer`, y el contenido
infantil lo aprueba Arianna. Las reglas completas están en
[`specs/constitution.md`](specs/constitution.md).

## Inicio para quien programa

Lee, en orden: `AGENTS.md`, `CLAUDE.md`, `specs/constitution.md`,
`specs/001-juego-episodio-1/` (spec, plan y tareas) y
`docs/HANDOFF-DESARROLLO.md`.

La documentación viva y la investigación permanecen en
`C:\Users\qwert\Documents\YAIS-RED`.
