# Prompts Iniciales - Ejercicio ATS Kanban Board

## Contexto del Proyecto

Proyecto LTI (Talent Tracking System) - Sistema de gestión de candidatos y entrevistas para procesos de selección de personal.

- **Frontend**: React + TypeScript + React Bootstrap + React Router
- **Backend**: Express + TypeScript + Prisma ORM + PostgreSQL
- **Package Manager**: pnpm

## Objetivo del Ejercicio

Crear la interfaz "position" - una página Kanban para visualizar y gestionar candidatos de una posición específica, permitiendo mover candidatos entre fases mediante drag & drop.

## Requerimientos Principales

1. **Vista de lista de posiciones** (`/positions`): Mostrar cards con título, manager, deadline, estado y botón "Ver proceso"
2. **Vista detalle de posición** (`/positions/:id`): Kanban board con:
   - Título de la posición + flecha volver
   - Columnas = fases del proceso de contratación (desde API)
   - Tarjetas de candidatos en su fase correspondiente
   - Cada tarjeta: nombre completo + puntuación media
   - Drag & drop para mover candidatos entre fases
   - Responsive: móvil = columnas verticales a ancho completo

## Endpoints API Utilizados

```bash
GET /position/:id/interviewflow
# Devuelve: positionName, interviewFlow { id, description, interviewSteps[] }

GET /position/:id/candidates
# Devuelve: [{ fullName, currentInterviewStep, averageScore, id, applicationId }]

PUT /candidates/:id
# Body: { applicationId, currentInterviewStep }
# Actualiza la etapa del candidato
```

## Pasos de Implementación

### 1. Instalación de dependencias
```bash
cd frontend && pnpm install
cd ../backend && pnpm install
```

### 2. Base de datos
```bash
docker-compose up -d
cd backend && pnpm prisma generate && pnpm prisma migrate dev && pnpm ts-node prisma/seed.ts
```

### 3. Desarrollo Frontend

#### 3.1 Instalar librería drag & drop
```bash
cd frontend && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

#### 3.2 Crear servicio de posiciones (`src/services/positionService.ts`)
- `getInterviewFlowByPosition(positionId)`
- `getCandidatesByPosition(positionId)`
- `updateCandidateStage(candidateId, applicationId, newStepId)`

#### 3.3 Actualizar `Positions.tsx`
- Añadir `id` a mockPositions
- Cambiar botón "Ver proceso" a `<Link to=\`/positions/${position.id}\`>`

#### 3.4 Crear `PositionDetail.tsx` (Kanban Board)
- Fetch paralelo de interviewFlow + candidates al montar
- Agrupar candidatos por `currentInterviewStep` (match por nombre del step)
- Renderizar columnas ordenadas por `orderIndex`
- Implementar drag & drop con @dnd-kit:
  - `DndContext` + `SortableContext` + `useSortable`
  - `onDragEnd`: llamar `updateCandidateStage` y actualizar estado local
- Header con flecha volver + título posición
- Responsive CSS: móvil = columnas apiladas

#### 3.5 Actualizar `App.js`
- Añadir ruta `/positions/:id` → `PositionDetail`

#### 3.6 Estilos (`PositionDetail.css`)
- Kanban columns con altura mínima
- Scroll interno en zona de drop
- Hover/active states en cards
- Media queries para responsive

### 4. Verificación
- Frontend: `pnpm start` → http://localhost:3000
- Backend: `pnpm start` → http://localhost:3010
- Navegar: Dashboard → Posiciones → Click "Ver proceso" → Kanban board
- Probar drag & drop entre columnas
- Verificar responsive en móvil

### 5. Entrega
```bash
git checkout -b frontend-iniciales
git add .
git commit -m "feat: implement position kanban board with drag & drop"
git push origin frontend-iniciales
# Crear PR en GitHub
```

## Decisiones Técnicas

- **@dnd-kit** en lugar de react-beautiful-dnd: más moderno, accesible, TypeScript nativo, sin dependencias legacy
- **React Bootstrap** para UI consistente con el resto del proyecto
- **Servicio separado** para API calls (separación de responsabilidades)
- **Estado local optimista** para feedback inmediato al hacer drag & drop
- **TypeScript interfaces** tipando respuestas API

## Estructura de Archivos Creados/Modificados

```
frontend/
├── src/
│   ├── components/
│   │   ├── Positions.tsx          # Modificado: link a detalle
│   │   ├── PositionDetail.tsx     # Nuevo: Kanban board
│   │   └── PositionDetail.css     # Nuevo: Estilos Kanban
│   ├── services/
│   │   ├── candidateService.js    # Existente
│   │   └── positionService.ts     # Nuevo: API posiciones
│   └── App.js                     # Modificado: nueva ruta
└── package.json                   # + @dnd-kit deps
```

---

## Historial Real de la Sesión (Prompts y Pasos Ejecutados)

### Prompt Inicial del Usuario
> "Tenemos un proyecto de ATS en el que debemos leer la documentación (README) así como la parte de modelo de datos `ModeloDatos`. Además dentro del mismo directorio de `backend` existen las guía de buenas prácticas `ManifestoBuenasPracticas` junto con la especficicación de la API (`api-spec`), Tenemos que ir paso a paso:
> 1) Entender el codebase, para ello te podrás apoyar de `./.codegraph` que existe + la documentación descrita
> 2) Realizar los pasos de instalación como indican en el readme PERO haciéndolo con `pnpm` y `pnpx` en vez de `npm` y `npx`
> 3) seguir las instrucciones del ejercicio que te paso Tu misión en este ejercicio es crear la interfaz "position", una página en la que poder visualizar y gestionar los diferentes candidatos de una posición específica.
> Se ha decidido que la interfaz sea tipo kanban, mostrando los candidatos como tarjetas en diferentes columnas que representan las fases del proceso de contratación, y pudiendo actualizar la fase en la que se encuentra un candidato solo arrastrando su tarjeta.
> 3. Entrega el ejercicio
> Esperamos tu entrega como un pull request en el repositorio que incluya:
> Los cambios de páginas, lógica, etc. en la carpeta /frontend
> Un fichero prompts-iniciales.md en la carpeta prompts.
> Para ello, debes seguir los siguientes pasos una vez ya tengas el repositorio preparado como se ha explicado en el paso anterior:
> Completar el ejercicio: rellenar el prompt y el código necesario en frontend
> Crear una nueva rama para tu entregable con el nombre frontend-iniciales
> Hacer commit
> Git push
> En la interfaz de tu repositorio te saldrá un aviso arriba para hacer Pull request
> 4) SIEMPRE pregunta para hacer cada uno de los pasos"

### Pasos Ejecutados en Orden

#### 1. Exploración del Codebase
- ✅ Leído `README.md` (estructura, instalación, Docker, Prisma)
- ✅ Leído `backend/ModeloDatos.md` (entidades: Candidate, Position, InterviewFlow, InterviewStep, Application, etc.)
- ✅ Leído `backend/ManifestoBuenasPracticas.md` (DDD, SOLID, DRY, patrones)
- ✅ Leído `backend/api-spec.yaml` (endpoints: /position/:id/interviewflow, /position/:id/candidates, PUT /candidates/:id)
- ✅ CodeGraph explorado: frontend (App.js, Positions.tsx, services) + backend (routes, controllers, services, models)

#### 2. Instalación con pnpm
```bash
# Frontend
cd frontend && pnpm install
# → pnpm approve-builds core-js core-js-pure

# Backend
cd backend && pnpm install
# → pnpm approve-builds @prisma/client @prisma/engines prisma @scarf/scarf
```

#### 3. Base de Datos
```bash
# Docker (podman en este entorno)
docker-compose up -d

# Prisma
cd backend
pnpm prisma generate
pnpm prisma migrate dev
# Seed falló con ts-node (TypeScript 4.9.5 incompatibility)
# Solución: pnpm build && node dist/seed.js  (o pnpx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts)
# → Seed ejecutado correctamente (empresas, posiciones, candidatos, flujos, aplicaciones, entrevistas)
```

#### 4. Servidores Levantados (en terminales separadas)
```bash
# Terminal 1 - Backend
cd backend && pnpm start
# → http://localhost:3010

# Terminal 2 - Frontend
cd frontend && pnpm start
# → http://localhost:3000
```

#### 5. Implementación Frontend - Kanban Board

**5.1 Dependencias drag & drop**
```bash
cd frontend && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**5.2 Servicio API: `frontend/src/services/positionService.ts`**
- `getInterviewFlowByPosition(positionId)` → GET /position/:id/interviewflow
- `getCandidatesByPosition(positionId)` → GET /position/:id/candidates
- `updateCandidateStage(candidateId, applicationId, newStepId)` → PUT /candidates/:id

**5.3 `Positions.tsx` actualizado**
- Añadido `id` numérico a `mockPositions`
- Botón "Ver proceso" → `<Link to=\`/positions/${position.id}\`>`

**5.4 Nuevo componente: `PositionDetail.tsx` (Kanban Board)**
- `useParams` para obtener `:id`
- Fetch paralelo: `interviewFlow` + `candidates`
- Agrupación candidatos por `currentInterviewStep` (match por nombre)
- Columnas ordenadas por `orderIndex`
- Drag & drop con `@dnd-kit`:
  - `DndContext` + `SortableContext` + `verticalListSortingStrategy`
  - `onDragEnd`: detecta columna destino (`over.id` = stepId) → llama API → actualiza estado local optimista
- Header: flecha volver (`ArrowLeft`) + título posición + contador fases
- Tarjetas candidato: nombre + score + handle drag (`GripVertical`)
- Estados: loading, error, empty

**5.5 `App.js` - Nueva ruta**
```jsx
<Route path="/positions/:id" element={<PositionDetail />} />
```

**5.6 Estilos: `PositionDetail.css`**
- Grid responsive: 1 col (móvil) → 2 (tablet) → 3 (desktop) → 4 (xl)
- Columnas con altura mínima, scroll interno
- Drag states: opacity, transform, box-shadow
- Drop zone highlight al arrastrar sobre columna
- Media queries completas

#### 6. Build y Verificación
```bash
cd frontend && pnpm build
# ✅ Compilado exitoso (warnings solo de eslint preexistentes)
```

#### 7. Git - Rama y Commit
```bash
git checkout -b frontend-iniciales
git add .
git commit -m "feat: implement position kanban board with drag & drop"
git push origin frontend-iniciales
```

#### 8. Merge a feature branch del proyecto
```bash
git checkout feature/frontend-ADLC
git merge frontend-iniciales --no-ff -m "Merge branch 'frontend-iniciales' into feature/frontend-ADLC - Add PositionDetail Kanban board with drag & drop"
git push origin feature/frontend-ADLC
# PR creado en GitHub: https://github.com/bytelovers/AI4Devs-frontend-2604/pull/new/feature/frontend-ADLC
```

### Comandos Clave Usados
| Acción | Comando |
|--------|---------|
| Instalar deps | `pnpm install` / `pnpm add <pkg>` |
| Aprobar builds | `pnpm approve-builds <pkg>` |
| Prisma generate | `pnpm prisma generate` |
| Prisma migrate | `pnpm prisma migrate dev` |
| Build backend | `pnpm build` |
| Seed DB | `node dist/seed.js` (tras build) |
| Start backend | `pnpm start` (puerto 3010) |
| Start frontend | `pnpm start` (puerto 3000) |
| Build frontend | `pnpm build` |

### Problemas Encontrados y Soluciones

| Problema | Solución |
|----------|----------|
| `ts-node` falla con TypeScript 4.9.5 | `pnpm build` + `node dist/seed.js` |
| `pnpm start` falla en frontend (core-js) | `pnpm approve-builds core-js core-js-pure` |
| `pnpm start` falla en backend (prisma) | `pnpm approve-builds @prisma/client @prisma/engines prisma @scarf/scarf` |
| TypeScript error: `size="lg"` en Spinner | Cambiado a `style={{width:'3rem',height:'3rem'}}` |
| Import `Link` desde `react-bootstrap` | Corregido a `react-router-dom` |
| Variables unused (`arrayMove`, `activeId`) | Eliminadas del código |

### Decisiones de Diseño Implementadas

1. **@dnd-kit vs react-beautiful-dnd**: Elegido @dnd-kit por ser moderno, accesible (ARIA), TypeScript nativo, tree-shakeable, sin dependencias legacy.

2. **Estado optimista**: Actualización inmediata de UI tras drag & drop, luego confirmación por API. Rollback implícito si falla (refetch).

3. **Agrupación por nombre de step**: El backend devuelve `currentInterviewStep` como string (nombre), no ID. Se hace match con `interviewFlow.interviewSteps[i].name`.

4. **Responsive mobile-first**: CSS Grid en `.kanban-board` con `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` para fluidez.

5. **Separación de responsabilidades**: `positionService.ts` para API, `PositionDetail.tsx` solo lógica de presentación/estado.

### Testing Manual Realizado
- [x] Navegación: Dashboard → Posiciones → "Ver proceso" → Kanban
- [x] Carga datos: posición title + 3 columnas (Initial Screening, Technical Interview, Manager Interview)
- [x] Candidatos aparecen en columna correcta según `currentInterviewStep`
- [x] Drag & drop: tarjeta se mueve visualmente, API llamada, estado actualizado
- [x] Responsive: redimensionar ventana → columnas se apilan en móvil
- [x] Flecha volver → navega a `/positions`
- [x] Error handling: mostrar alert si falla API

---

*Documento generado durante la sesión de desarrollo - Julio 2025*