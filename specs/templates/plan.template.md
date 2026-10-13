# PLAN-NNN — <título>

Plan técnico de `spec.md` en la carpeta de la spec. El *qué* vive en la spec; aquí va el *cómo*.

## Enfoque

<3–6 frases. La decisión técnica central y por qué esta y no la alternativa obvia.>

## Archivos que se tocan

| Archivo | Acción | Para qué |
| --- | --- | --- |
| `app/src/engine/...` | nuevo | <> |

## Contratos

```ts
// Tipos o interfaces nuevas que otros módulos van a consumir.
```

## Dependencias nuevas

| Paquete | Versión | Por qué se justifica |
| --- | --- | --- |

Si la columna "por qué" no convence, no se agrega la dependencia.

## Riesgos técnicos

| Riesgo | Señal temprana | Qué hacemos |
| --- | --- | --- |

## Orden de implementación

1. <paso verificable>
2. <paso verificable>

Cada paso debe dejar el repo con `npm run verify` en verde.
