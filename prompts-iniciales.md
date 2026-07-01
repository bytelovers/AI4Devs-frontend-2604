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