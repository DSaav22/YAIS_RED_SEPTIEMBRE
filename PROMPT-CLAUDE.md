# Prompt para iniciar el desarrollo con Claude

Copia desde la siguiente línea:

---

Trabaja exclusivamente en `C:\Users\qwert\Documents\yais-game-hackbiz`. El vault `C:\Users\qwert\Documents\YAIS-RED` es referencia de producto e investigación: no programes la app allí ni muevas o borres sus archivos.

Lee primero, en orden: `AGENTS.md`, `CLAUDE.md`, `specs/constitution.md`, `specs/001-juego-episodio-1/spec.md`, `specs/001-juego-episodio-1/plan.md`, `specs/001-juego-episodio-1/tasks.md` y `docs/HANDOFF-DESARROLLO.md`.

El objetivo global es construir el vertical slice web 3D de «Saludo que puedo elegir» con Capi y Tomi, usando Vite + React + TypeScript estricto y React Three Fiber como mejora progresiva sobre una experiencia 2D accesible. Los assets, contenido y specs ya están en el repositorio. No rediseñes los modelos, no generes imágenes nuevas, no optimices para móvil todavía y no agregues backend ni panel.

En esta sesión ejecuta únicamente `T-001-01 — Crea el scaffold y la compuerta de calidad`. Crea la app dentro de `app/`, el `package.json` raíz, Vitest/Testing Library/ESLint y un `npm run verify` que ejecute typecheck, lint, tests, `check:safety` y build. El shell mínimo debe mostrar `Borrador no validado`. No hardcodees narrativa ni integres aún los GLB.

Respeta sin excepción las reglas sobre menores: ninguna identidad infantil, chat, diario, texto libre, diagnóstico o perfil de riesgo; `persistChoices` siempre en `false`; en SPEC-001 solo puede persistir `ep01.completed`; y `app/src/engine/` no puede depender de React, DOM ni Three.

Al terminar, ejecuta `npm run verify`. Si pasa, detente y entrega: resumen, lista de archivos cambiados, resultado exacto de verificación y riesgos pendientes. No avances a T-001-02 hasta que revise T-001-01.

---

