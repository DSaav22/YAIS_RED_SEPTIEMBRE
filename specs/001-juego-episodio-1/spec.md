---
id: 001
titulo: Vertical slice — Episodio 1 "Saludo que puedo elegir"
estado: borrador
depende_de: []
bloqueada_por: [prueba con niñas y niños; medición en el equipo de aula real]
# 2026-09-18: la aprobación de contenido se declaró hecha y se retiraron los 26
# marcadores `review: "VALIDAR"`. Ver el aviso en docs/ESTADO-IMPLEMENTACION.md.
---

# SPEC-001 — Vertical slice del Episodio 1

## Por qué existe

Es la pieza más chica que demuestra la experiencia completa: un niño llega a la isla, elige cómo saludar, descubre que puede aceptar, cambiar o rechazar un saludo, y el aula cierra con un debrief conducido por el docente. Si esto funciona, los otros tres episodios son repetición de la misma maquinaria.

El guion completo ya existe en el vault externo, `C:\Users\qwert\Documents\YAIS-RED\wiki\narrative\isla-de-los-acuerdos-guiones.md`, y el contenido estructurado está en [`content/episodes/ep01-saludo.json`](../../content/episodes/ep01-saludo.json). Esta spec no inventa contenido: lo ejecuta.

## Alcance

**Entra:**
- Motor de contenido que lee el JSON del episodio y ejecuta su máquina de estados (nodos `line`, `choice`, `feedback`, `end`).
- Runtime visual del diálogo: globo de texto, opciones táctiles, feedback, reintento.
- Escena 3D con la mascota y los NPC del episodio, en modo proyector (un dispositivo).
- Variantes por edad (6–8 / 9–12) leídas del contenido.
- Pantalla de cierre con el acuerdo del episodio y el pie para el debrief del docente.
- Persistencia de `ep01.completed` en el navegador.

**No entra (explícito):**
- Episodios 2, 3, 4 y cierre.
- Minijuegos de clasificación (van en SPEC-004).
- Backend, base de datos, cuentas.
- Clips adicionales y rig facial. Ya existe una primera pasada de rig con `Idle`, `Walk`/`Roll`, `Wave`, `Listen` y `TalkGesture`; los gestos narrativos sin clip propio usan un mapa de fallback documentado.
- Audio locutado (se deja el enganche, se llena después).

## Criterios de aceptación (EARS)

- **AC-1** — Cuando la app carga un episodio, el runtime DEBE validar el JSON contra el esquema y, si falla, DEBE mostrar un error de desarrollo legible en vez de una pantalla en blanco.
- **AC-2** — Cuando el jugador elige una opción de diálogo, el runtime DEBE avanzar al nodo correspondiente y mostrar su feedback sin sonido de error, sin puntaje y sin bloquear el reintento.
- **AC-3** — Mientras el modo de edad es 6–8, el runtime DEBE ocultar todo nodo u opción marcado solo para 9–12, y viceversa.
- **AC-4** — El runtime DEBE permitir volver a intentar una escena de decisión cuantas veces el jugador quiera, sin penalización ni mensaje de fallo.
- **AC-5** — Cuando el episodio termina por cualquier camino, el runtime DEBE mostrar la pantalla de cierre con el acuerdo del día y DEBE persistir únicamente el flag `ep01.completed`.
- **AC-6** — El runtime DEBE funcionar con un solo puntero (mouse o toque) y con objetivos táctiles de al menos 44×44 px.
- **AC-7** — Mientras el usuario tenga `prefers-reduced-motion` activo, la escena DEBE omitir animaciones de cámara y transiciones no esenciales.
- **AC-8** — Donde el dispositivo no soporte WebGL, la app DEBE caer a un modo 2D con las mismas líneas y decisiones, no a un error.
- **AC-9** — El runtime NO DEBE emitir ninguna petición de red que contenga datos del jugador.
- **AC-10** — Cuando el contenido aún no está aprobado por Arianna, la app DEBE mostrar un distintivo visible de "borrador no validado" en pantalla.

## Restricciones de la constitución que aplican

- **I y II** — El episodio no pide ni guarda nada del niño. El único dato que sobrevive a la sesión es `ep01.completed`, un booleano por dispositivo/aula. `persistChoices` se queda en `false` (lo verifica `check:safety`).
- **V** — AC-2 y AC-4 son la traducción técnica de "sin castigo, sin humillación": está prohibido implementar estados de "respuesta incorrecta".
- **VI** — AC-6 y AC-8 aseguran que corre en el aula real, proyectado, sin hardware nuevo.
- **VII** — AC-6 y AC-7 son criterios de aceptación, no pendientes de pulido.
- **IV** — AC-10 evita que un borrador se demuestre como si estuviera validado.

## Cómo se verifica

| Criterio | Cómo se comprueba |
| --- | --- |
| AC-1 | Test unitario del validador con un JSON corrupto |
| AC-2, AC-4 | Test del motor: recorrer los caminos del ep01 y afirmar que no existe estado de error ni puntaje |
| AC-3 | Test del motor con ambos modos de edad sobre el mismo JSON |
| AC-5 | Test que corre el episodio de punta a punta y afirma que `localStorage` solo contiene el flag |
| AC-6, AC-7 | Revisión manual con la checklist de `a11y-perf-reviewer` |
| AC-8 | Prueba manual forzando el fallo de WebGL |
| AC-9 | Revisión de la pestaña de red: cero peticiones salientes con payload |
| AC-10 | Inspección visual |

## Preguntas abiertas

- [ ] ¿La escena de Don Beto (adulto conocido que insiste con un abrazo) entra en este slice o se deja fuera hasta que Arianna la valide? — decide Arianna.
- [ ] ¿El distintivo de "borrador" incomoda en la demo a jurados? Alternativa: visible en pantalla de inicio y no durante el juego. — decide el equipo.

## Aclaración de implementación, 2026-09-17

El JSON vigente contiene siete escenas, cuatro minijuegos y tipos de nodo adicionales a los cuatro del primer runtime. La primera prueba visible se limita al núcleo de saludo con Capi y Tomi; el resto permanece versionado y se incorpora por tareas posteriores. El modo de desarrollo puede iniciar desde una escena concreta, pero esa entrada no forma parte de la experiencia publicada.

Aunque el JSON declara varios flags candidatos, este vertical slice solo puede persistir `ep01.completed`, tal como exige AC-5. Las decisiones y el resto de estados se mantienen en memoria. Cambiar esta política exige actualizar la spec y pasar revisión del modelo de datos.
