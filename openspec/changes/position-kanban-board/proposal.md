# Proposal: Position Kanban Board

## Metadata
- **Change ID**: `position-kanban-board`
- **Title**: Kanban Board for Candidate Management per Position
- **Author**: AI4Devs Team
- **Date**: 2025-07-02
- **Status**: `implemented`
- **Priority**: High
- **Labels**: `frontend`, `kanban`, `drag-drop`, `positions`, `candidates`

## Problem Statement

El sistema ATS actual tiene una vista de lista de posiciones (`/positions`) pero **no permite visualizar ni gestionar los candidatos de una posición específica**. Los reclutadores necesitan:

1. Ver el flujo de entrevistas (fases) de una posición
2. Ver todos los candidatos agrupados por su fase actual
3. Mover candidatos entre fases de forma intuitiva (drag & drop)
4. Ver puntuación media de cada candidato
5. Navegar desde la lista de posiciones al detalle

## Current State

- **Frontend**: React + TypeScript + React Bootstrap + React Router
- **Ruta existente**: `/positions` → `Positions.tsx` (mock data, botón "Ver proceso" no funcional)
- **Backend**: Express + Prisma + PostgreSQL
- **Endpoints disponibles**:
  - `GET /position/:id/interviewflow` → fases del proceso
  - `GET /position/:id/candidates` → candidatos con fase actual y score
  - `PUT /candidates/:id` → actualizar fase del candidato

## Proposed Solution

Crear una **vista Kanban** en `/positions/:id` que:
- Muestre el título de la posición + flecha volver
- Renderice una columna por cada fase del `interviewFlow`
- Coloque tarjetas de candidatos en su fase correspondiente
- Permita drag & drop entre columnas para cambiar fase
- Sea responsive (móvil: columnas apiladas; desktop: grid horizontal)
- Use `@dnd-kit` para accesibilidad y TypeScript nativo

## Scope

### In Scope
- Nuevo componente `PositionDetail.tsx` (Kanban board)
- Servicio `positionService.ts` para llamadas API
- Actualización `Positions.tsx` → navegación real
- Nueva ruta `/positions/:id` en `App.js`
- Estilos responsivos en `PositionDetail.css`
- Documentación OpenSpec completa

### Out of Scope
- Crear/editar/eliminar posiciones
- Gestión de interview flows
- Notificaciones en tiempo real (WebSockets)
- Filtros/búsqueda dentro del Kanban
- Permisos/roles (se asume usuario autenticado)

## Success Criteria

1. ✅ Navegación: `/positions` → click "Ver proceso" → `/positions/:id`
2. ✅ Carga: Fetch paralelo interviewFlow + candidates (< 2s)
3. ✅ Kanban: Columnas = fases ordenadas por `orderIndex`
4. ✅ Tarjetas: Nombre + score, en columna correcta
5. ✅ Drag & Drop: Mover tarjeta → PUT API + actualización optimista UI
6. ✅ Responsive: 1 col (xs), 2 col (sm), 3 col (md), 4 col (lg+)
7. ✅ Accesibilidad: Keyboard navigation, screen readers
8. ✅ Build: `pnpm build` sin errores
9. ✅ Tests API: curl verifica endpoints funcionando

## Dependencies

- `@dnd-kit/core` ^6.3.1
- `@dnd-kit/sortable` ^10.0.0
- `@dnd-kit/utilities` ^3.2.2
- `axios` ^1.18.1 (ya instalado)

## Risks & Mitigations

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| API cambia respuesta | Alto | Versionado API + tests contrato |
| @dnd-kit breaking changes | Medio | Lock version en package.json |
| Performance con 100+ candidatos | Bajo | Virtualización futura (react-window) |
| Conflictos merge en Positions.tsx | Bajo | Feature branch + PR review |

## Alternatives Considered

| Alternativa | Pros | Contras | Decisión |
|-------------|------|---------|----------|
| react-beautiful-dnd | Maduro, conocido | No mantenido, sin TS nativo, a11y limitada | ❌ |
| @dnd-kit | Moderno, TS nativo, a11y, headless | Menos ejemplos comunidad | ✅ |
| HTML5 Drag & Drop API | Sin deps | Complejo, bugs cross-browser, a11y pobre | ❌ |
| SortableJS | Maduro, muchas features | Wrapper React necesario, bundle grande | ❌ |

## Approval

- [x] Technical Lead: Approved
- [x] Product Owner: Approved
- [x] UX/UI: Approved (mockup revisado)

---

*Generated as part of OpenSpec workflow*