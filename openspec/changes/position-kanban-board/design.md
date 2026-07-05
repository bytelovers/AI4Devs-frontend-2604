# Design: Position Kanban Board

## Metadata
- **Change ID**: `position-kanban-board`
- **Version**: 1.0.0
- **Status**: `implemented`
- **Related**: `proposal.md`, `spec.md`, `tasks.md`

---

## Architecture Overview

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          App.js                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │    /        │  │ /positions  │  │      /positions/:id         │ │
│  │ Recruiter   │  │  Positions  │  │      PositionDetail         │ │
│  │ Dashboard   │  │   (List)    │  │      (Kanban Board)         │ │
│  └─────────────┘  └──────┬──────┘  └──────────────┬──────────────┘ │
└──────────────────────────│─────────────────────────│────────────────┘
                           │                         │
                    ┌──────▼──────┐          ┌──────▼──────┐
                    │Link to      │          │ useParams   │
                    │/positions/  │          │ positionId  │
                    │:id          │          └──────┬──────┘
                    └─────────────┘                 │
                           ┌────────────────────────▼────────────────┐
                           │         PositionDetail (Container)      │
                           │  ┌──────────────────────────────────┐   │
                            │  │ useEffect → AbortController       │   │
                            │  │ fetchData(signal)                   │   │
                            │  │ Promise.allSettled([                │   │
                            │  │   getInterviewFlowByPosition(id),   │   │
                            │  │   getCandidatesByPosition(id)       │   │
                            │  │ ])                                 │   │
                           │  └────────────────┬──────────────────┘   │
                           └───────────────────│──────────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
           ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
           │ interviewFlow   │        │ candidates[]    │        │ error/loading   │
           │ (InterviewFlowData)       │ (Candidate[])   │        │ states          │
           └────────┬────────┘        └────────┬────────┘        └────────┬────────┘
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               ▼
                           ┌─────────────────────────────────────┐
                           │      KanbanBoard (Presentational)   │
                           │  ┌────────────────────────────────┐ │
                           │  │ DndContext                      │ │
                           │  │  sensors: Pointer + Keyboard    │ │
                           │  │  collisionDetection: closestCenter│ │
                           │  │  onDragEnd → handleMove         │ │
                           │  └───────────────┬─────────────────┘ │
                           └─────────────────┼────────────────────┘
                                             │
                           ┌─────────────────┼────────────────────┐
                           ▼                 ▼                    ▼
                  ┌─────────────┐   ┌─────────────┐      ┌─────────────┐
                  │ KanbanColumn│   │ KanbanColumn│ ...  │ KanbanColumn│
                  │ (step 1)    │   │ (step 2)    │      │ (step N)    │
                  └──────┬──────┘   └──────┬──────┘      └──────┬──────┘
                         │                 │                    │
                  ┌──────▼──────┐   ┌──────▼──────┐      ┌──────▼──────┐
                  │CandidateCard│   │CandidateCard│ ...  │CandidateCard│
                  │ (draggable) │   │ (draggable) │      │ (draggable) │
                  └─────────────┘   └─────────────┘      └─────────────┘
```

### Data Flow

```
User Action                    System Response
─────────────────────────────────────────────────────────────────
1. Navigate to /positions/1
   │
   ▼
2. PositionDetail mounts
   │   AbortController created (cleaned up on unmount)
   │
   ├──→ getInterviewFlowByPosition(1) ──────→ API: GET /position/1/interviewflow
   │                                              │
   └──→ getCandidatesByPosition(1) ─────────→ API: GET /position/1/candidates
          │                                           │
          └──────────────┬────────────────────────────┘
                         ▼
3. Promise.allSettled resolves:
   - fulfilled → state updated: interviewFlow + candidates
   - rejected  → partial warning + settled data used if available
   │
   ▼
4. Render: Header + KanbanBoard with columns
   │
   ▼
5. User drags CandidateCard (id=`candidate-4`) from Column A to Column B
   │
   ▼
6. onDragEnd fires:
   - active.id = `candidate-4` (namespaced applicationId)
   - over.id = `step-2` (namespaced target stepId)
   │
   ▼
7. parse: applicationId = Number(active.id.replace('candidate-', ''))
   newStepId = Number(over.id.replace('step-', ''))
   │
   ▼
8. find candidate with parsed applicationId
   │
   ▼
9. updateCandidateStage(candidate.id, candidate.applicationId, newStepId)
   │
   ├──→ API: PUT /candidates/:candidateId { applicationId, currentInterviewStep: 2 }
   │
   ▼
9. On success: setCandidates(prev => map updated candidate)
   │
   ▼
10. UI re-renders: card now in Column B
```

---

## Component Design

### PositionDetail.tsx (Container Component)

**Responsibilities**:
- Route parameter extraction (`useParams`)
- Data fetching orchestration
- State management (interviewFlow, candidates, loading, error)
- Error boundary for async operations
- Callback for drag & drop mutations

**Props**: None (uses React Router hooks)

**State**:
```typescript
interface State {
  interviewFlow: InterviewFlowData | null;
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
}
```

**Effects**:
```typescript
useEffect(() => {
  const abortController = new AbortController();
  fetchData(abortController.signal);
  return () => abortController.abort(); // Cleanup on unmount
}, [positionId, fetchData]);
```

**Event Handlers**:
- `handleDragEnd(event: DragEndEvent)` → API mutation + optimistic update
- `fetchData()` → parallel API calls, error handling

---

### KanbanBoard.tsx (Presentational - extracted from PositionDetail)

**Responsibilities**:
- DndContext provider
- SortableContext provider
- Grid layout rendering
- Column orchestration

**Props**:
```typescript
interface KanbanBoardProps {
  steps: InterviewStep[];
  candidatesByStep: Record<number, Candidate[]>;
  onMoveCandidate: (candidateId: number, newStepId: number) => Promise<void>;
  activeStepId: number | null;
}
```

---

### KanbanColumn.tsx (Presentational)

**Responsibilities**:
- Column visual structure (header + drop zone)
- Drop zone highlight when drag over
- Candidate card list rendering

**Props**:
```typescript
interface KanbanColumnProps {
  step: InterviewStep;
  candidates: Candidate[];
  isDropTarget: boolean;
}
```

---

### CandidateCard.tsx (Presentational + Draggable)

**Responsibilities**:
- Card visual (name, score, drag handle)
- `useSortable` hook integration
- Accessibility attributes

**Props**:
```typescript
interface CandidateCardProps {
  candidate: Candidate;
}
```

**Hooks**: `useSortable({ id: candidate.applicationId })`

---

## Drag & Drop Architecture (@dnd-kit)

### Why @dnd-kit?

| Factor | @dnd-kit | react-beautiful-dnd | HTML5 DnD |
|--------|----------|---------------------|-----------|
| TypeScript | ✅ Native | ❌ Definitions only | ✅ Native |
| Accessibility | ✅ Built-in | ⚠️ Partial | ❌ Manual |
| Headless | ✅ Yes | ❌ No | ✅ Yes |
| Tree-shakeable | ✅ Yes | ❌ No | ✅ Yes |
| Maintenance | ✅ Active | ❌ Archived | N/A |
| Bundle size | ~12KB | ~28KB | 0KB |

### Configuration

```typescript
// Sensors
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

// Collision Detection
collisionDetection: closestCenter

// Contexts
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
    {columns}
  </SortableContext>
</DndContext>
```

### Drag & Drop Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        DndContext                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   SortableContext                          │  │
│  │  items: ["1", "2", "3"]  // step IDs                       │  │
│  │  strategy: verticalListSortingStrategy                     │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │  │
│  │  │ KanbanColumn │ │ KanbanColumn │ │ KanbanColumn │       │  │
│  │  │ stepId="1"   │ │ stepId="2"   │ │ stepId="3"   │       │  │
│  │  │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │       │  │
│  │  │ │Card(id=4)│ │ │ │Card(id=1)│ │ │ │          │ │       │  │
│  │  │ │Card(id=3)│ │ │ │Card(id=2)│ │ │ │          │ │       │  │
│  │  │ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │       │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### onDragEnd Logic

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;

  // No drop target or same target
  if (!over || active.id === over.id) return;

  const activeId = String(active.id);
  const overId = String(over.id);

  // Validate namespaced IDs
  if (!activeId.startsWith('candidate-') || !overId.startsWith('step-')) return;

  const applicationId = Number(activeId.replace('candidate-', ''));
  const targetStepId = Number(overId.replace('step-', ''));

  // Find candidate by applicationId
  const candidate = candidates.find(c => c.applicationId === applicationId);
  if (!candidate) return;

  // Check if candidate is already in this step
  const currentStepId = interviewFlow?.interviewFlow.interviewSteps
    .find(s => s.name.trim().toLowerCase() === (candidate.currentInterviewStep?.trim().toLowerCase() ?? ''))?.id;
  if (currentStepId === targetStepId) return;

  // Optimistic update
  const newStepName = interviewFlow?.interviewFlow.interviewSteps
    .find(s => s.id === targetStepId)?.name;

  setCandidates(prev => prev.map(c =>
    c.applicationId === applicationId
      ? { ...c, currentInterviewStep: newStepName || c.currentInterviewStep }
      : c
  ));

  // API call
  try {
    await updateCandidateStage(candidate.id, candidate.applicationId, targetStepId);
  } catch (err) {
    // Rollback on error
    setCandidates(prev => prev.map(c =>
      c.applicationId === applicationId
        ? { ...c, currentInterviewStep: candidate.currentInterviewStep }
        : c
    ));
    setError(err.message);
  }
};
```

---

## State Management

### Local State (PositionDetail)

| State | Type | Updates |
|-------|------|---------|
| `interviewFlow` | `InterviewFlowData \| null` | On fetch success |
| `candidates` | `Candidate[]` | On fetch, on drag end (optimistic), on error (rollback) |
| `loading` | `boolean` | Fetch start/end |
| `error` | `string \| null` | On API error, dismiss on retry |

### Derived State

```typescript
// Computed during render
const candidatesByStep: Record<number, Candidate[]> = {};
steps.forEach(step => {
  candidatesByStep[step.id] = candidates.filter(
    c => c.currentInterviewStep === step.name
  );
});

const sortedSteps = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);
```

---

## Styling Architecture (CSS)

### Methodology
- **CSS Modules alternative**: Scoped class names with BEM-like prefixes (`.kanban-*`)
- **Responsive**: Mobile-first with Bootstrap breakpoints
- **CSS Custom Properties**: For theming (colors, spacing)

### Key Classes

```css
/* Layout */
.kanban-board-container     /* Wrapper with padding */
.kanban-board               /* Grid container */
.kanban-column              /* Grid item (flex column) */

/* Column */
.kanban-card                /* Column card (h-100, flex column) */
.kanban-card.dragging-over  /* Drop target highlight */
.kanban-drop-zone           /* Scrollable drop area */

/* Card */
.kanban-candidate-card      /* Draggable card */
.kanban-candidate-card.dragging  /* Drag state */
.candidate-name             /* Ellipsis truncation */
.score-badge                /* Score pill */
.drag-handle                /* Grip icon */

/* Responsive */
@media (max-width: 575.98px)   /* xs: 1 col */
@media (min-width: 576px)      /* sm: 2 col */
@media (min-width: 768px)      /* md: 3 col */
@media (min-width: 992px)      /* lg: 4 col */
@media (min-width: 1200px)     /* xl: 4 col constrained */
```

### CSS Custom Properties (in :root or component scope)

```css
:root {
  --kanban-column-min-height: 300px;
  --kanban-column-bg: #f8f9fa;
  --kanban-column-border: #dee2e6;
  --kanban-drop-highlight: rgba(13, 110, 253, 0.1);
  --kanban-card-shadow: 0 2px 8px rgba(0,0,0,0.08);
  --kanban-card-shadow-hover: 0 4px 16px rgba(0,0,0,0.12);
  --kanban-drag-opacity: 0.5;
  --kanban-drag-rotate: 3deg;
}
```

---

## API Service Layer

### positionService.ts

```typescript
// Base URL from env
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3010';

// Types
interface InterviewFlowData { ... }
interface Candidate { ... }

// Functions
export const getInterviewFlowByPosition = async (positionId: number): Promise<InterviewFlowData>
export const getCandidatesByPosition = async (positionId: number): Promise<Candidate[]>
export const updateCandidateStage = async (
  candidateId: number,
  applicationId: number,
  newStepId: number
): Promise<UpdateResponse>
```

### Error Handling Strategy

```typescript
try {
  const response = await axios.get(...);
  return response.data;
} catch (error: any) {
  // Normalize error message
  const message = error.response?.data?.message || error.message;
  throw new Error(message);
}
```

---

## Routing Integration

### App.js Routes

```jsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<RecruiterDashboard />} />
    <Route path="/add-candidate" element={<AddCandidate />} />
    <Route path="/positions" element={<Positions />} />
    <Route path="/positions/:id" element={<PositionDetail />} />
  </Routes>
</BrowserRouter>
```

### Navigation Flow

```
Positions.tsx
  │
  ├── Position Card
  │     └── "Ver proceso" button
  │           └── <Link to={`/positions/${position.id}`}>
  │
  ▼
PositionDetail.tsx
  │
  ├── useParams() → { id: "1" }
  │
  ├── Header
  │     └── <Link to="/positions"> ← Volver
  │
  ▼
Kanban Board
```

---

## Accessibility Implementation

### ARIA Attributes

| Element | Role | ARIA Attributes |
|---------|------|-----------------|
| KanbanColumn drop zone | `list` | `aria-label="Columna {step.name}"` |
| CandidateCard | `listitem` | `draggable="true"`, `aria-grabbed` |
| Drag handle | `button` | `aria-label="Mover {candidate.name}"` |
| Column header | `heading` | `aria-level="2"` |

### Keyboard Navigation (via @dnd-kit KeyboardSensor)

| Key | Action |
|-----|--------|
| `Tab` | Enter column, navigate between cards |
| `Space` / `Enter` | Pick up card (start drag) |
| `ArrowUp` / `ArrowDown` | Move between cards in column |
| `ArrowLeft` / `ArrowRight` | Move between columns |
| `Space` / `Enter` | Drop card |
| `Escape` | Cancel drag |

### Screen Reader Announcements

- Drag start: "Tarjeta {nombre} levantada, use flechas para mover"
- Drop target: "Sobre columna {nombre}, suelte para mover aquí"
- Drop success: "{nombre} movido a {columna}"
- Drop cancel: "Movimiento cancelado"

---

## Error Boundary Strategy

### Component-Level Error Handling

```typescript
// PositionDetail
const [error, setError] = useState<string | null>(null);

if (error) {
  return (
    <Alert variant="danger" dismissible onClose={() => setError(null)}>
      {error}
      <Button variant="outline-danger" onClick={fetchData}>Reintentar</Button>
    </Alert>
  );
}
```

### API Error Normalization

```typescript
catch (err: any) {
  const message = err.response?.data?.message 
    || err.message 
    || 'Error desconocido';
  setError(message);
}
```

---

## Performance Considerations

### Optimizations Applied

1. **Settled Fetching**: `Promise.allSettled([getFlow(), getCandidates()])` — partial failures show warnings without blocking the other response
2. **AbortController**: In-flight requests cancelled on unmount to prevent state updates after unmount
3. **Optimistic Updates**: Immediate UI feedback, no waiting for API
4. **Memoization**: `useCallback` for fetchData, `React.memo` for presentational components
5. **CSS Containment**: `contain: layout paint` on columns
6. **Virtual Scroll Ready**: Drop zone uses native scroll (can swap to react-window)

### Bundle Impact

| Dependency | Size (gzipped) |
|------------|----------------|
| @dnd-kit/core | ~4.2 KB |
| **Total added** | **~4.2 KB** |

---

## Security Considerations

- No direct user input in SQL (backend uses Prisma)
- API calls use relative paths via env variable
- No XSS vectors (React auto-escapes)
- CORS configured on backend
- Candidate IDs validated server-side

---

*Generated as part of OpenSpec workflow*