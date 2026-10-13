# YAIS Game — reglas de desarrollo

Este repositorio contiene el producto ejecutable de **La Isla de los Acuerdos**.

La memoria de producto vive en `C:\Users\qwert\Documents\YAIS-RED`. Consúltala como referencia; no escribas código de la app ni reorganices el vault desde este repositorio.

## Antes de programar

Lee en orden:

1. `CLAUDE.md`
2. `specs/constitution.md`
3. `specs/001-juego-episodio-1/spec.md`
4. `specs/001-juego-episodio-1/plan.md`
5. `specs/001-juego-episodio-1/tasks.md`
6. `docs/HANDOFF-DESARROLLO.md`

La implementación sigue las tareas `T-001-*`; no conviertas el plan completo en un único cambio.

## Reglas duras

- No existe identidad infantil: sin login, nombre, foto, voz, `studentId`, `childId` ni equivalentes.
- No hay chat, diario, confesionario ni texto libre sobre un menor.
- No se diagnostica ni se marca a una persona o aula como «en riesgo».
- `persistChoices` es siempre `false`. En SPEC-001 solo persiste `ep01.completed`.
- Sin puntajes, rankings, rachas, temporizadores agresivos, castigo o respuestas humillantes.
- Todo contenido infantil no aprobado conserva `[VALIDAR]` y un distintivo visible `Borrador no validado`.
- `app/src/engine/` es TypeScript puro, sin React, DOM ni Three.
- El contenido se lee desde `content/`; no se copia dentro de componentes.
- Las rutas de arte viven en `app/src/shared/assets.ts`; no se dispersan strings de rutas.
- No sobrescribas ni «mejores» los modelos fuente. Las variantes nuevas llevan nueva versión.

## Verificación

Cada tarea debe dejar verde:

```bash
npm run verify
```

`verify` debe ejecutar typecheck, lint, tests, `check:safety` y build. No omitas pasos ni declares terminada una tarea con una compuerta roja.

## Alcance inmediato

Primero web en laptop/proyector. No implementar backend, panel, cuatro episodios completos ni optimización móvil en T-001-01. Sí conservar accesibilidad, fallback 2D y carga diferida desde el diseño.

