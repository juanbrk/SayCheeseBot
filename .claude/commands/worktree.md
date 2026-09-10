# /worktree — Crear nuevo worktree para desarrollo paralelo

Automatiza la creación de un worktree de git listo para trabajar:
crea la rama, instala dependencias de `functions/`, copia los archivos `.env`
(incluido `.env.local`, sin el cual `npm run go` aborta) y abre VSCode.

## Input

El ticket completo del trabajo a realizar está en `$ARGUMENTS`.

Si `$ARGUMENTS` está vacío, pedile al usuario que pegue el contenido completo del ticket.

## Pasos a ejecutar

### 1. Extraer slug del ticket

Buscá el campo `**Nombre:**` en el contenido del ticket y usá su valor como slug.

Ejemplo:
```
**Nombre:** fix-decimal-parsing-bug
```
→ slug = `fix-decimal-parsing-bug`

Si no existe ese campo, generá el slug desde el primer heading (`## Título`) o la primera línea
significativa del ticket. Normalizá a kebab-case si es necesario.

### 2. Preguntar tipo de rama

Preguntale al usuario qué tipo de rama corresponde al ticket:
- `feature` — nueva funcionalidad
- `fix` — corrección de bug
- `improv` — mejora incremental
- `techDebt` — deuda técnica

### 3. Ejecutar el script de automatización

Usá la herramienta Bash para correr:

```bash
bash scripts/new-worktree.sh "<slug>" <tipo>
```

El worktree queda en `../SayCheeseBot-<slug>`, hermano del repo principal.

### 4. Guardar el ticket como TICKET.md

Una vez que el script termine con éxito, escribí el ticket en:

```
[WORKTREE_PATH]/TICKET.md
```

Donde `[WORKTREE_PATH]` es la ruta que imprimió el script (línea que dice `Ruta:`).

**No volcar el ticket verbatim.** Mapearlo al esquema canónico de 6 secciones:

- cuerpo del ticket (historia de usuario, situación actual/deseada) → `## Contexto`
- criterios de aceptación del ticket → `## Criterios de aceptación`
- items de trabajo accionables → `## Pendientes`, como `- [ ]`
- `## Hecho` y `## Diferido` → vacías
- `## Checkpoints` → las dos cajas sin tildar, sin fecha

Esqueleto a escribir (este repo es español — `lang=es`):

    <!-- ticket-schema: v1 lang=es -->
    # [TIPO] Título del ticket

    **Rama:** `<tipo>/<slug>`

    ## Contexto

    [Qué problema resuelve, por qué ahora, la restricción que condiciona la solución]

    ## Pendientes

    - [ ] [primer item accionable]

    ## Criterios de aceptación

    - [ ] [primer criterio]

    ## Hecho

    ## Diferido

    ## Checkpoints

    - [ ] technician-check
    - [ ] pr-audit

`TICKET.md` está en `.gitignore` — es local al worktree y nunca se commitea.

Convención completa y casos borde: `~/.claude/shared/ticket-md.md`.

### 5. Reportar al usuario

Confirmá: worktree path, rama creada, ubicación del TICKET.md, próximos pasos
(`nvm use 22` → `npm run go`).

### 6. Modo B — worktree desde una rama remota existente

Cuando el worktree se crea a partir de una rama que ya existe y **no hay texto de
ticket**, igual hay que crear TICKET.md con las 6 secciones. `## Contexto` lleva una
sola línea:

    Rama `<rama>` → `<base>`. Worktree creado desde una rama remota existente —
    contexto reconstruido a demanda.

`## Pendientes`, `## Criterios de aceptación`, `## Hecho` y `## Diferido` quedan
vacías; `## Checkpoints` con las dos cajas sin tildar.

Nunca dejar el worktree sin TICKET.md: los skills que lo consumen (`/commit`,
`/audit-pr`) saltean en silencio si falta, y el seguimiento del ticket se pierde.
