---
id: 002
titulo: Panel del facilitador — MVP sin backend
estado: borrador
depende_de: [001]
bloqueada_por: [aprobación del texto del protocolo por Arianna]
---

# SPEC-002 — Panel del facilitador (MVP visual, sin backend)

## Por qué existe

El docente puede ser la única persona adulta a la que un niño le cuente algo, porque el agresor suele ser del entorno familiar (evidencia §9 en `C:\Users\qwert\Documents\YAIS-RED\wiki\research\evidencia-psicologica-proteccion.md`). El panel existe para que ese docente llegue preparado y tenga el protocolo a un toque. El plan completo de 8 módulos está en `C:\Users\qwert\Documents\YAIS-RED\wiki\project\panel-facilitador.md`; esta spec cubre solo lo que se construye ahora, sin backend.

## Alcance

**Entra** (módulos 1, 2, 4 y 8 del plan, en versión local):
- Shell del panel con navegación y un selector de rol simulado (facilitador / coordinador), sin autenticación real.
- Lista de aulas y su progreso por episodio, leída de datos semilla locales.
- Botón fijo "¿Qué hago si un niño me cuenta algo?" con el protocolo de derivación, visible desde cualquier pantalla.
- Materiales descargables (guía docente, protocolo imprimible).
- Vista agregada del coordinador, solo lectura.

**No entra (explícito):**
- Supabase, autenticación real, cuentas, invitaciones.
- Checklist de preparación, recordatorios de refuerzo y registro de seguimiento (módulos 3, 5 y 6: van después).
- Cualquier dato que no sea semilla local.

## Criterios de aceptación (EARS)

- **AC-1** — El panel DEBE mostrar el progreso agrupado por aula, y NO DEBE ofrecer ninguna vista, filtro ni búsqueda por niño individual.
- **AC-2** — El botón del protocolo DEBE estar accesible desde cualquier pantalla del panel en un solo toque, incluido el ancho de teléfono.
- **AC-3** — Cuando el facilitador abre el protocolo, el panel DEBE mostrar los pasos de actuación y los contactos de derivación sin requerir conexión a internet.
- **AC-4** — El panel NO DEBE contener ningún campo de texto libre asociado a un menor.
- **AC-5** — Mientras el rol activo sea coordinador, el panel DEBE mostrar únicamente agregados por aula y NO DEBE exponer detalle de una sesión concreta.
- **AC-6** — Cuando el usuario navega el panel, este DEBE ser operable completamente con teclado y con lectores de pantalla en los controles principales.
- **AC-7** — El panel DEBE persistir su estado solo en el navegador y NO DEBE emitir peticiones de red con datos de uso.
- **AC-8** — Donde el texto del protocolo no esté aprobado por Arianna, el panel DEBE marcarlo visiblemente como borrador.

## Restricciones de la constitución que aplican

- **I y III** — AC-1 y AC-5 son la barrera: sin vista por niño, sin marcado de riesgo. `check:safety` bloquea los identificadores que lo harían posible.
- **II** — AC-4: ningún campo donde alguien pueda escribir lo que un niño contó.
- **IV** — AC-8 mantiene el protocolo marcado como borrador hasta la revisión profesional.
- **VII** — AC-6 hace de la accesibilidad criterio de aceptación.

## Cómo se verifica

| Criterio | Cómo se comprueba |
| --- | --- |
| AC-1, AC-5 | Test de componentes: ninguna ruta acepta un identificador de niño; revisión de `check:safety` |
| AC-2 | Test e2e: el botón es alcanzable desde cada ruta, a 375 px de ancho |
| AC-3 | Prueba manual en modo offline del navegador |
| AC-4 | `check:safety` + revisión del agente `content-guardian` |
| AC-6 | Checklist de `a11y-perf-reviewer` + navegación solo con teclado |
| AC-7 | Pestaña de red vacía durante una sesión completa |
| AC-8 | Inspección visual |

## Preguntas abiertas

- [ ] ¿El contador de seguimiento (módulo 6) se muestra como número exacto o como estado binario? Riesgo de leerse como proxy de riesgo. — decide Arianna.
- [ ] ¿Los datos semilla imitan un colegio real o uno ficticio? Deben ser ficticios para la demo. — decide el equipo.
