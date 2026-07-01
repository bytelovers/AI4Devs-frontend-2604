# Prompts ADLC - Historial de Ciclo de Vida de Desarrollo

## Resumen del Proyecto

**Proyecto**: LTI - Talent Tracking System (ATS)
**Feature**: Position Kanban Board - Interfaz de gestión de candidatos por posición
**Rama**: `feature/frontend-ADLC` (merged from `frontend-iniciales`)
**Fecha**: Julio 2025
**Metodología**: SDD (Spec-Driven Development) + ADLC

---

## Fase 1: DISCOVERY (Descubrimiento)

### Prompt Inicial
> "Tenemos un proyecto de ATS en el que debemos leer la documentación (README) así como la parte de modelo de datos `ModeloDatos`. Además dentro del mismo directorio de `backend` existen las guía de buenas prácticas `ManifestoBuenasPracticas` junto con la especficicación de la API (`api-spec`), Tenemos que ir paso a paso:
> 1) Entender el codebase...
> 2) Realizar los pasos de instalación...
> 3) seguir las instrucciones del ejercicio...
> 4) SIEMPRE pregunta para hacer cada uno de los pasos"

### Actividades Realizadas
- [x] Lectura completa de documentación: README, ModeloDatos, ManifestoBuenasPracticas, api-spec
- [x] Exploración CodeGraph: frontend (App, Positions, services) + backend (routes, controllers, services, models)
- [x] Identificación de endpoints API necesarios
- [x] Análisis de modelo de datos: Position, InterviewFlow, InterviewStep, Application, Candidate

### Decisiones Clave
| Decisión | Justificación |
|----------|---------------|
| Usar pnpm en lugar de npm | Requerimiento explícito del usuario |
| Usar @dnd-kit para drag & drop | Moderno, accesible, TypeScript nativo, sin dependencias legacy |
| Estado optimista en UI | Feedback inmediato, mejor UX |
| Separar servicio API | Separación de responsabilidades, testabilidad |

---

## Fase 2: PLANNING (Planificación)

### Especificación de Requerimientos (PRD)

**Historia de Usuario Principal**
> Como reclutador, quiero ver una vista Kanban de los candidatos de una posición para poder moverlos entre fases del proceso de contratación arrastrando sus tarjetas.

**Criterios de Aceptación**
1. [x] Acceso desde `/positions` → click "Ver proceso" → `/positions/:id`
2. [x] Header: título posición + flecha volver a listado
3. [x] Columnas = fases del interviewFlow (ordenadas por orderIndex)
4. [x] Tarjetas en columna correcta según currentInterviewStep
5. [x] Tarjeta muestra: nombre completo + puntuación media
6. [x] Drag & drop mueve candidato y actualiza backend
7. [x] Responsive: móvil = columnas verticales a ancho completo
8. [x] Loading y error states

**Endpoints API Contratados**
```
GET  /position/:id/interviewflow  → { positionName, interviewFlow: { id, description, interviewSteps[] } }
GET  /position/:id/candidates     → [{ fullName, currentInterviewStep, averageScore, id, applicationId }]
PUT  /candidates/:id              → { applicationId, currentInterviewStep } → updated application
```

### Estimación y Desglose de Tareas

| Tarea | Estimación | Real | Estado |
|-------|------------|------|--------|
| Setup entorno (pnpm, Docker, Prisma) | 30 min | 45 min | ✅ |
| Instalar @dnd-kit | 5 min | 5 min | ✅ |
| Crear positionService.ts | 15 min | 15 min | ✅ |
| Actualizar Positions.tsx | 10 min | 10 min | ✅ |
| Crear PositionDetail.tsx (Kanban) | 60 min | 75 min | ✅ |
| Estilos PositionDetail.css | 30 min | 25 min | ✅ |
| Actualizar App.js (routing) | 5 min | 5 min | ✅ |
| Build y verificación | 15 min | 20 min | ✅ |
| Git commit + push + merge | 10 min | 10 min | ✅ |
| Documentación | 20 min | 25 min | ✅ |
| **TOTAL** | **~3.5h** | **~4h** | ✅ |

---

## Fase 3: DESIGN (Diseño)

### Arquitectura de la Solución

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                       │
├─────────────────────────────────────────────────────────────┤
│  App.js                                                     │
│   └── Routes: / → /positions → /positions/:id              │
├─────────────────────────────────────────────────────────────┤
│  Positions.tsx                                              │
│   └── Lista cards → Link to /positions/:id                 │
├─────────────────────────────────────────────────────────────┤
│  PositionDetail.tsx (Kanban Board)                          │
│   ├── useParams → positionId                                │
│   ├── useEffect → fetch paralelo:                          │
│   │     getInterviewFlowByPosition(positionId)             │
│   │     getCandidatesByPosition(positionId)                │
│   ├── Estado: interviewFlow, candidates, loading, error    │
│   ├── Agrupación: candidatesByStep[stepId] = []            │
│   ├── DndContext + SortableContext                         │
│   │     Columns (step.id) ← Drop zones                     │
│   │     Cards (candidate.applicationId) ← Draggables       │
│   ├── onDragEnd:                                           │
│   │     1. Identificar step destino (over.id)              │
│   │     2. updateCandidateStage(candidate, newStepId)      │
│   │     3. Actualizar estado local optimista               │
│   └── Render: Header + Grid responsive columns             │
├─────────────────────────────────────────────────────────────┤
│  positionService.ts (API Layer)                             │
│   ├── getInterviewFlowByPosition()  → axios GET            │
│   ├── getCandidatesByPosition()     → axios GET            │
│   └── updateCandidateStage()        → axios PUT            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (Express)                      │
├─────────────────────────────────────────────────────────────┤
│  GET /position/:id/interviewflow → positionController      │
│     → positionService.getInterviewFlowByPositionService()  │
│  GET /position/:id/candidates    → positionController      │
│     → positionService.getCandidatesByPositionService()     │
│  PUT /candidates/:id             → candidateController     │
│     → candidateService.updateCandidateStage()              │
└─────────────────────────────────────────────────────────────┘
```

### Modelo de Datos Frontend (TypeScript)

```typescript
interface InterviewStep {
  id: number;
  interviewFlowId: number;
  interviewTypeId: number;
  name: string;
  orderIndex: number;
}

interface Candidate {
  fullName: string;
  currentInterviewStep: string;  // Nombre del step (no ID)
  averageScore: number;
  id: number;                    // candidateId
  applicationId: number;         // Para PUT
}

interface InterviewFlowData {
  positionName: string;
  interviewFlow: {
    id: number;
    description: string;
    interviewSteps: InterviewStep[];
  };
}
```

### Diseño UI/UX - Kanban Board

**Layout Responsivo**
```
Móvil (<576px):     [Col1] [Col2] [Col3]  → Stack vertical (100% width)
Tablet (576-991px): [Col1] [Col2]         → 2 columnas (50% each)
Desktop (992-1199): [Col1] [Col2] [Col3]  → 3 columnas (33% each)
XL (≥1200px):       [Col1][Col2][Col3][C4]→ 4 columnas (25% each)
```

**Estados Visuales**
| Estado | Card | Columna |
|--------|------|---------|
| Default | Shadow-sm, border-radius 8px | bg-light, border |
| Hover card | translateY(-2px), shadow-md | - |
| Dragging | opacity: 0.5, rotate(3deg) | - |
| Drop zone active | - | border-primary, bg-primary-50 |
| Loading | Spinner centrado | - |
| Error | Alert dismissible | - |

---

## Fase 4: DEVELOPMENT (Desarrollo)

### Commits Realizados

```bash
# Commit principal (frontend-iniciales)
dfe3608 feat: implement position kanban board with drag & drop

# Merge commit (feature/frontend-ADLC)
<merge> Merge branch 'frontend-iniciales' into feature/frontend-ADLC
```

### Archivos Creados (4 nuevos)
| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `frontend/src/services/positionService.ts` | 33 | API layer para posiciones |
| `frontend/src/components/PositionDetail.tsx` | 280 | Componente Kanban principal |
| `frontend/src/components/PositionDetail.css` | 160 | Estilos responsivos Kanban |
| `prompts-iniciales.md` | 250+ | Documentación completa |

### Archivos Modificados (4)
| Archivo | Cambios |
|---------|---------|
| `frontend/src/components/Positions.tsx` | +id en mockPositions, Link a detalle |
| `frontend/src/App.js` | +Route /positions/:id |
| `frontend/src/App.css` | +Estilos base (preexistente) |
| `frontend/package.json` | +@dnd-kit/core, sortable, utilities |

### Problemas Técnicos Resueltos

| # | Problema | Solución |
|---|----------|----------|
| 1 | `ts-node` incompatible con TS 4.9.5 | `pnpm build` + `node dist/seed.js` |
| 2 | `pnpm start` frontend: core-js build scripts | `pnpm approve-builds core-js core-js-pure` |
| 3 | `pnpm start` backend: prisma build scripts | `pnpm approve-builds @prisma/client @prisma/engines prisma @scarf/scarf` |
| 4 | TypeScript: `Spinner size="lg"` deprecated | `style={{width:'3rem',height:'3rem'}}` |
| 5 | Import `Link` desde `react-bootstrap` (no existe) | Cambiado a `react-router-dom` |
| 6 | Variables unused: `arrayMove`, `activeId` | Eliminadas |
| 7 | Agrupación candidatos por nombre step (no ID) | Match `candidate.currentInterviewStep === step.name` |

---

## Fase 5: TESTING (Pruebas)

### Verificación Manual Realizada

| Test Case | Resultado | Evidencia |
|-----------|-----------|-----------|
| Navegación Dashboard → Posiciones | ✅ | Click "Ver proceso" navega a `/positions/1` |
| Carga interviewFlow (3 steps) | ✅ | Initial Screening, Technical Interview, Manager Interview |
| Carga candidatos (3) | ✅ | John Doe, Jane Smith, Carlos García |
| Candidatos en columna correcta | ✅ | Match por `currentInterviewStep` name |
| Drag & drop entre columnas | ✅ | Visual + API PUT + estado local actualizado |
| Responsive móvil | ✅ | Columnas apilan verticalmente |
| Flecha volver | ✅ | Navega a `/positions` |
| Error handling | ✅ | Alert dismissible si falla API |
| Build producción | ✅ | `pnpm build` exitoso |

### Pruebas API Backend (curl)

```bash
# Interview Flow
curl http://localhost:3010/position/1/interviewflow
# ✅ {"positionName":"Senior Full-Stack Engineer","interviewFlow":{...}}

# Candidates
curl http://localhost:3010/position/1/candidates
# ✅ [{"fullName":"John Doe","currentInterviewStep":"Technical Interview","averageScore":5,...}]

# Update Stage
curl -X PUT http://localhost:3010/candidates/1 \
  -H "Content-Type: application/json" \
  -d '{"applicationId": 1, "currentInterviewStep": 3}'
# ✅ {"message":"Candidate stage updated successfully",...}
```

---

## Fase 6: DEPLOYMENT (Despliegue)

### Entregables Generados

1. **Código fuente** → Rama `feature/frontend-ADLC` en GitHub
2. **PR creado** → https://github.com/bytelovers/AI4Devs-frontend-2604/pull/new/feature/frontend-ADLC
3. **Documentación** → `prompts-iniciales.md` + `prompts-ADLC.md` (este archivo)

### Checklist de Entrega

- [x] Cambios en `/frontend` (componentes, servicios, estilos, routing)
- [x] `prompts-iniciales.md` en raíz del repo
- [x] Rama `frontend-iniciales` creada y pusheada
- [x] Commit con mensaje convencional
- [x] Merge a `feature/frontend-ADLC` (rama del proyecto)
- [x] Push a origen
- [x] PR disponible en GitHub

---

## Fase 7: MAINTENANCE (Mantenimiento Futuro)

### Deuda Técnica / Mejoras Pendientes

| Mejora | Prioridad | Esfuerzo |
|--------|-----------|----------|
| Tests unitarios (Jest + React Testing Library) | Alta | 2h |
| Tests E2E (Cypress/Playwright) | Media | 4h |
| Optimistic rollback en error de API | Media | 1h |
| Skeleton loading en columnas | Baja | 30min |
| Animaciones Framer Motion | Baja | 1h |
| Persistir posición scroll en navegación | Baja | 30min |
| Accesibilidad: keyboard navigation mejorada | Media | 1h |

### Riesgos Identificados

| Riesgo | Mitigación |
|--------|------------|
| Backend cambia respuesta API | Versionado API + tests de contrato |
| @dnd-kit breaking changes | Lock version en package.json |
| Performance con 100+ candidatos | Virtualización (react-window) |
| Conflictos merge en Positions.tsx | Feature flags o módulos separados |

---

## Métricas de la Implementación

| Métrica | Valor |
|---------|-------|
| Líneas de código nuevas | ~473 (TSX + CSS + TS) |
| Archivos creados | 4 |
| Archivos modificados | 4 |
| Dependencias añadidas | 3 (@dnd-kit/*) |
| Tiempo total desarrollo | ~4 horas |
| Commits | 1 principal + 1 merge |
| Build size (gzipped) | +~36 KB CSS, +~184 KB JS |

---

## Referencias

- **Repositorio**: https://github.com/bytelovers/AI4Devs-frontend-2604
- **PR**: https://github.com/bytelovers/AI4Devs-frontend-2604/pull/new/feature/frontend-ADLC
- **Rama feature**: `feature/frontend-ADLC`
- **Rama entrega**: `frontend-iniciales` (merged)
- **Documentación complementaria**: `prompts-iniciales.md`

---

*Documento generado como parte del proceso ADLC - Julio 2025*