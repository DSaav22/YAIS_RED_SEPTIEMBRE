# Despliegue en Vercel

Estado: **desplegado**. El proyecto `isla-de-los-acuerdos` (`prj_HKVHPg1VIfAB43wbatmrm9hiJfWj`,
equipo `sm-nunez404s-projects`) está enlazado a este repositorio en GitHub por
la integración de Git de Vercel, no por `vercel deploy` desde la CLI. La rama
de producción es `main`; cada push a `main` dispara un build nuevo. El resto de
este documento sigue describiendo la configuración y los riesgos reales.

Nota sobre el enlace: la herramienta de creación del proyecto rechazó el ID de
equipo (`team_...`) con un 403 de alcance OAuth y sólo aceptó el **slug**
(`smnunez404`) como `teamId`. Si hay que recrear o repetir esto por MCP, usar
el slug.

Fuentes consultadas (septiembre de 2026):

- <https://vercel.com/docs/agent-resources/vercel-mcp>
- <https://vercel.com/docs/limits>
- <https://code.claude.com/docs/en/mcp>

## 1. MCP de Vercel

El servidor MCP oficial es remoto, con transporte HTTP y OAuth: `https://mcp.vercel.com`.
La configuración vive en `.mcp.json` en la raíz (alcance de proyecto, se versiona):

```json
{
  "mcpServers": {
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com"
    }
  }
}
```

No lleva token. La autenticación es OAuth y la hace cada persona en su máquina:
abrir Claude Code en la raíz del repo, aprobar el servidor del proyecto cuando lo
pregunte, escribir `/mcp`, elegir `vercel` y autenticarse en el navegador. Las
credenciales quedan fuera del repositorio.

`.gitignore` añade `.vercel/`, que es lo que crea `vercel link` y contiene IDs de
proyecto y estado local de la CLI.

## 2. Configuración del proyecto en Vercel

Es un workspace npm con la app en `app/` y un paso de sincronización de assets
en la raíz. La configuración correcta es:

| Ajuste | Valor |
| --- | --- |
| Root Directory | la raíz del repositorio (**no** `app/`) |
| Framework Preset | Vite |
| Install Command | `npm ci` (o el predeterminado `npm install`) |
| Build Command | `npm run build` |
| Output Directory | `app/dist` |
| Node.js Version | 22.x (`engines` pide `>=20.19.0`; CI usa 22.14.0) |

### El fallo más probable: un juego sin modelos

`app/public/assets/` está en `.gitignore` y la genera `npm run sync:assets`, que
copia el subconjunto servible desde `assets/` (fuente versionada, ~242 MB en el
repo; el subconjunto servido son ~25 MiB con tope explícito de 25 MiB en el
script). El build local de la raíz ya encadena `sync:assets && build --workspace app`.

Por eso **el Root Directory debe ser la raíz y el Build Command debe ser
`npm run build` de la raíz**. Si alguien pone Root Directory = `app` (que es lo
que Vercel tiende a autodetectar al ver el `vite.config.ts`), el build correrá
`vite build` sin `sync:assets`, `app/public/assets/` estará vacía porque está
ignorada por Git, y se desplegará el juego **sin ningún `.glb`**: la app carga,
la escena 3D no.

Comprobación obligatoria tras el primer despliegue, antes de enseñárselo a nadie:
abrir `https://<dominio>/assets/characters/capi/mascot.glb` y confirmar que
devuelve 200 y ~8,5 MB, no el `index.html`. Y revisar en el log de build que
aparecen las líneas de `sync-runtime-assets.mjs`. El script falla con código 1
si falta un archivo o no cuadra un sha256, así que un build verde con esa
configuración es señal fiable.

## 3. `vercel.json`

**Existe uno en la raíz del repositorio, y es deliberado.** Declara el
comando de build y el directorio de salida para que la configuración
correcta sea la que viaja con el código y no algo que alguien tenga que
acordarse de poner a mano en el panel de Vercel:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "app/dist",
  "installCommand": "npm ci",
  "framework": null
}
```

`framework: null` es la parte importante. Sin eso, Vercel autodetecta Vite,
ignora que esto es un workspace npm y corre `vite build` sin
`npm run sync:assets`; como `app/public/assets/` está en `.gitignore`, se
desplegaría el juego **sin un solo modelo 3D**. Es el fallo más probable de
este proyecto y este archivo existe para evitarlo.

Ojo: un `vercel.json` en la raíz solo se lee si el **Root Directory** del
proyecto en Vercel es la raíz del repositorio. Si alguien lo cambia a
`app/`, este archivo deja de aplicarse y vuelve el problema.



**No hace falta hoy.** La app es una sola página: no hay `react-router` ni ninguna
ruta de cliente en `app/src`, así que no se necesita la reescritura SPA. Vite ya
produce hashes de contenido para JS/CSS y Vercel cachea `/assets/*` por defecto.

Si en el futuro se añade enrutado de cliente, el archivo mínimo sería:

```json
{
  "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }]
}
```

Nota: esa reescritura debe excluir `/assets/` para no devolver `index.html`
cuando falte un `.glb` — es exactamente cómo un modelo ausente pasa desapercibido.

## 4. Tamaño: ~24 MiB de modelos

- No choca con ningún límite de plan **si se despliega desde Git**. Los archivos
  de salida del build no tienen tope documentado por tamaño total ni por archivo.
- El límite de 100 MB (Hobby) / 1 GB (Pro) para «Static File uploads» aplica a los
  **archivos fuente que sube la CLI**. Este repositorio versiona ~242 MB de arte,
  así que **`vercel deploy` desde la CLI fallaría en Hobby y estaría al borde en
  Pro**. Hay que usar la integración de Git, no la CLI.
- Otros límites relevantes, todos con margen: 45 min de build, 15.000 archivos
  fuente (aquí ~400 en `assets/` más el código), 32 GB de disco de build.
- Hobby **no permite conectar proyectos a repositorios de organizaciones de Git**.
  Si el repo vive en una organización de GitHub, hace falta un equipo (Pro).

Lo que sí duele no es el plan sino el aula: ~24 MiB de `.glb` por visita en frío,
con el ancho de banda escolar del que habla la Constitución VI. Vercel sirve con
`gzip`/`brotli`, pero los GLB ya vienen comprimidos y no encogen. Un despliegue
web no sustituye la ejecución local para la demo en aula; sirve para revisión
remota. Si se usa en aula, hay que contar con la primera carga y con que el
navegador cachee.

## 5. Advertencias antes de publicar

- El contenido lleva el distintivo `Borrador no validado`. Publicar en una URL
  pública de Vercel expone material infantil no validado. Si se despliega,
  hacerlo con **Deployment Protection** (protección por contraseña o solo
  accesible al equipo), no en abierto.
- El repositorio no tiene backend ni variables de entorno: no hay secretos que
  configurar en Vercel.
- Hobby es para uso no comercial. Un despliegue vinculado a la presentación de un
  producto debería ir en un equipo Pro.
