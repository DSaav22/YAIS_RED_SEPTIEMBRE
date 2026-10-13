---
id: NNN
titulo: <nombre corto>
estado: borrador | aprobada | implementada
depende_de: [<ids de specs>]
bloqueada_por: [<assets, aprobación de Arianna, etc.>]
---

# SPEC-NNN — <título>

## Por qué existe

<2–4 frases. Qué problema del usuario resuelve. Enlaza a la página de wiki que lo respalda.>

## Alcance

**Entra:**
- <lista corta y concreta>

**No entra (explícito):**
- <lo que alguien podría asumir que entra y no entra>

## Criterios de aceptación (EARS)

Sintaxis obligatoria. Usa **DEBE**, nunca "debería" ni "puede".

- **Ubicuo:** El <sistema> DEBE <respuesta>.
- **Por estado:** Mientras <estado>, el <sistema> DEBE <respuesta>.
- **Por evento:** Cuando <disparador>, el <sistema> DEBE <respuesta>.
- **Condicional:** Si <condición no deseada>, entonces el <sistema> DEBE <respuesta>.
- **Opcional:** Donde <existe la función>, el <sistema> DEBE <respuesta>.

Ejemplo:
- AC-1 — Cuando el jugador elige una opción de diálogo, el runtime DEBE mostrar el feedback correspondiente sin sonido de error ni penalización.
- AC-2 — Mientras el modo de edad es 6–8, el runtime DEBE ocultar las líneas marcadas solo para 9–12.

## Restricciones de la constitución que aplican

<Cita los artículos concretos de specs/constitution.md que esta spec toca y cómo se respetan.>

## Cómo se verifica

| Criterio | Cómo se comprueba |
| --- | --- |
| AC-1 | <test unitario / e2e / revisión manual con pasos> |

## Preguntas abiertas

- [ ] <lo que falta decidir, y quién decide>
