---
description: Corre todas las compuertas de calidad y reporta honestamente
allowed-tools: Bash, Read, Grep, Glob
---

Corre la verificación completa y reporta el estado real, sin maquillar.

1. `npm run verify` (typecheck, lint, test, check:safety, build).
2. Si algo falla, **no lo arregles todavía**: primero reporta qué falló y por qué, con el error textual.
3. Si el cambio tocó contenido dirigido a niños, el protocolo de derivación o el modelo de datos, lanza el agente `content-guardian` sobre el diff.
4. Si el cambio tocó UI o la escena 3D, lanza el agente `a11y-perf-reviewer`.

Reporta así:

```
VERIFY: verde | rojo
- typecheck: ok | <error>
- lint: ok | <error>
- test: ok (<n> tests) | <fallos>
- check:safety: ok | <violaciones>
- build: ok | <error>

REVISORES
- content-guardian: <veredicto o "no aplica">
- a11y-perf-reviewer: <veredicto o "no aplica">

LO QUE NO ESTÁ CUBIERTO
- <lo que ningún gate comprueba y habría que probar a mano>
```

Esa última sección es obligatoria. Siempre hay algo que las compuertas no ven: dilo en vez de dar una falsa sensación de terminado.
