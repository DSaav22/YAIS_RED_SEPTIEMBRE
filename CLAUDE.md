# CLAUDE.md — arranque controlado

@AGENTS.md

## Misión

Construir el vertical slice web 3D de **«Saludo que puedo elegir»** con Capi y Tomi. La UI 2D accesible es la ruta base; React Three Fiber es una mejora progresiva que consume el mismo motor de estado.

## Primer encargo

Empieza únicamente por `T-001-01` de `specs/001-juego-episodio-1/tasks.md`:

- crea el scaffold Vite + React + TypeScript estricto dentro de `app/`;
- crea el `package.json` raíz y `npm run verify`;
- configura Vitest, Testing Library y ESLint;
- muestra un shell mínimo con `Borrador no validado`;
- no incluyas narrativa, modelos 3D, backend ni Tailwind todavía;
- ejecuta `npm run verify` y reporta los archivos cambiados y cualquier bloqueo.

Detente para revisión cuando T-001-01 esté verde. Las tareas posteriores ya están secuenciadas en `tasks.md`.

## Estado heredado

- La app aún no existe; no asumas estructura generada.
- Los assets, el contenido y las specs ya están copiados en este repositorio.
- La dirección visual y los modelos actuales están aprobados para prototipar; no los rediseñes.
- Existen solo cinco clips por personaje. El mapa temporal de intenciones se implementa en T-001-06.
- El objetivo actual es laptop/proyector. La optimización móvil se mide y planifica después del vertical slice.

Para investigación, decisiones o negocio, consulta el vault `C:\Users\qwert\Documents\YAIS-RED`; no conviertas información pendiente en requisitos inventados.

