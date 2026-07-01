# Specification: Position Kanban Board

## Metadata
- **Change ID**: `position-kanban-board`
- **Version**: 1.0.0
- **Status**: `implemented`
- **Related**: `proposal.md`, `design.md`, `tasks.md`

---

## Functional Requirements

### FR-001: Navigation from Positions List
**Description**: User can navigate from positions list to Kanban detail view.
- **Trigger**: Click "Ver proceso" button on position card
- **Action**: Navigate to `/positions/:id`
- **Precondition**: Position exists in mock data with valid `id`
- **Postcondition**: Kanban board loads for that position

### FR-002: Kanban Board Header
**Description**: Display context header with position title and back navigation.
- **Elements**:
  - Back arrow (←) + "Volver a posiciones" link → `/positions`
  - Position title (from `interviewFlow.positionName`)
  - Phase counter: "X fases en el proceso"
- **Layout**: Left-aligned back link, right-aligned title (mobile: stacked)

### FR-003: Interview Flow Columns
**Description**: Render one column per interview step, ordered by `orderIndex`.
- **Data Source**: `GET /position/:id/interviewflow` → `interviewFlow.interviewSteps`
- **Sorting**: Ascending by `orderIndex`
- **Column Header**: Step name + candidate count badge
- **Column Body**: Drop zone for candidate cards
- **Empty State**: "Arrastra candidatos aquí" text

### FR-004: Candidate Cards
**Description**: Display candidate cards in their current phase column.
- **Data Source**: `GET /position/:id/candidates`
- **Matching Logic**: `candidate.currentInterviewStep === step.name` (string match)
- **Card Content**:
  - Drag handle (grip icon)
  - Full name (`fullName`)
  - Average score badge (`averageScore` formatted to 1 decimal)
- **Card ID**: `applicationId` (used for drag identification)

### FR-005: Drag & Drop - Move Candidate
**Description**: User can move candidate between phases by dragging.
- **Interaction**: Drag card → drop on target column drop zone
- **Visual Feedback**:
  - Dragging card: opacity 50%, slight rotation
  - Target column: highlighted border + background tint
- **API Call**: `PUT /candidates/:candidateId` with `{ applicationId, currentInterviewStep: newStepId }`
- **Optimistic Update**: Immediate UI move, rollback on API error
- **Error Handling**: Toast/alert with dismiss, refetch on retry

### FR-006: Responsive Layout
**Description**: Kanban adapts to viewport size.
- **Breakpoints** (Bootstrap 5):
  - `xs` (<576px): 1 column, stacked vertically (100% width)
  - `sm` (576-767px): 2 columns (50% each)
  - `md` (768-991px): 3 columns (33% each)
  - `lg` (992-1199px): 4 columns (25% each)
  - `xl` (≥1200px): 4 columns (max-width constrained)
- **Column Min Height**: 300px desktop, 200px mobile
- **Internal Scroll**: Y-scroll within drop zone if content overflows

### FR-007: Loading & Error States
**Description**: Graceful handling of async states.
- **Loading**: Full-screen centered spinner + "Cargando posición..."
- **Error**: Dismissible alert with error message + retry button
- **Empty Flow**: Warning alert "No se encontró el flujo de entrevistas"

---

## Non-Functional Requirements

### NFR-001: Performance
- Initial load < 2s (parallel fetch)
- Drag response < 100ms (optimistic UI)
- Bundle size impact < 50KB gzipped

### NFR-002: Accessibility (WCAG 2.1 AA)
- Keyboard navigation: Tab to enter column, arrows to move between cards, Space/Enter to pick up, arrows to move, Space/Enter to drop
- ARIA roles: `role="list"` on column, `role="listitem"` on cards
- Focus indicators: Visible outline on interactive elements
- Screen readers: Announce drag start, drop target, drop result

### NFR-003: Browser Compatibility
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- No IE11 support required

### NFR-004: Code Quality
- TypeScript strict mode
- ESLint + Prettier compliant
- Component separation: presentational vs container
- Service layer for API calls

---

## API Contracts

### GET /position/:id/interviewflow
**Request**: `GET /position/1/interviewflow`
**Response 200**:
```json
{
  "positionName": "Senior Full-Stack Engineer",
  "interviewFlow": {
    "id": 1,
    "description": "Standard development interview process",
    "interviewSteps": [
      { "id": 1, "interviewFlowId": 1, "interviewTypeId": 1, "name": "Initial Screening", "orderIndex": 1 },
      { "id": 2, "interviewFlowId": 1, "interviewTypeId": 2, "name": "Technical Interview", "orderIndex": 2 },
      { "id": 3, "interviewFlowId": 1, "interviewTypeId": 3, "name": "Manager Interview", "orderIndex": 2 }
    ]
  }
}
```

### GET /position/:id/candidates
**Request**: `GET /position/1/candidates`
**Response 200**:
```json
[
  { "fullName": "John Doe", "currentInterviewStep": "Technical Interview", "averageScore": 5, "id": 1, "applicationId": 1 },
  { "fullName": "Jane Smith", "currentInterviewStep": "Technical Interview", "averageScore": 4, "id": 2, "applicationId": 3 },
  { "fullName": "Carlos García", "currentInterviewStep": "Initial Screening", "averageScore": 0, "id": 3, "applicationId": 4 }
]
```

### PUT /candidates/:id
**Request**: `PUT /candidates/1`
```json
{ "applicationId": 1, "currentInterviewStep": 3 }
```
**Response 200**:
```json
{
  "message": "Candidate stage updated successfully",
  "data": { "id": 1, "positionId": 1, "candidateId": 1, "applicationDate": "...", "currentInterviewStep": 3, "notes": null, "interviews": [] }
}
```

---

## Data Models (TypeScript)

```typescript
// From API response
interface InterviewStep {
  id: number;
  interviewFlowId: number;
  interviewTypeId: number;
  name: string;
  orderIndex: number;
}

interface InterviewFlow {
  id: number;
  description: string;
  interviewSteps: InterviewStep[];
}

interface InterviewFlowData {
  positionName: string;
  interviewFlow: InterviewFlow;
}

interface Candidate {
  id: number;              // candidateId
  fullName: string;
  currentInterviewStep: string;  // Step name (not ID!)
  averageScore: number;
  applicationId: number;   // For PUT requests
}

// Internal state
interface CandidatesByStep {
  [stepId: number]: Candidate[];
}
```

---

## UI Components Specification

### PositionDetail (Container)
- **Props**: None (uses `useParams`)
- **State**: `interviewFlow`, `candidates`, `loading`, `error`
- **Effects**: Fetch on mount + positionId change
- **Renders**: Header + KanbanBoard (or loading/error)

### KanbanBoard (Presentational)
- **Props**: `steps`, `candidatesByStep`, `onMoveCandidate`
- **Renders**: `DndContext` → `SortableContext` → Grid of `KanbanColumn`

### KanbanColumn (Presentational)
- **Props**: `step`, `candidates`, `isDropTarget`
- **Renders**: Card header (name + badge) + DropZone with `CandidateCard` list

### CandidateCard (Presentational + Draggable)
- **Props**: `candidate`
- **Behavior**: `useSortable` hook, drag handle
- **Renders**: Card with handle, name, score badge

---

## Routing

| Path | Component | Description |
|------|-----------|-------------|
| `/positions` | `Positions` | List of positions (mock) |
| `/positions/:id` | `PositionDetail` | Kanban board for position |

---

## Configuration

### Environment Variables
```env
REACT_APP_API_BASE_URL=http://localhost:3010
```

### Package Dependencies Added
```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

---

## Acceptance Test Scenarios

### AT-001: Happy Path - View and Move Candidate
1. Navigate to `/positions`
2. Click "Ver proceso" on first position
3. Verify: Page loads with title "Senior Full-Stack Engineer"
4. Verify: 3 columns visible (Initial Screening, Technical Interview, Manager Interview)
5. Verify: Carlos García in "Initial Screening", John Doe + Jane Smith in "Technical Interview"
6. Drag "Carlos García" to "Technical Interview" column
7. Verify: Card moves visually, API called, card now in Technical Interview
8. Refresh page → Carlos still in Technical Interview

### AT-002: Responsive Layout
1. Open `/positions/1` on desktop (>1200px)
2. Verify: 3 columns side by side
3. Resize to tablet (768px)
3. Verify: 2 columns (or 3 if space)
4. Resize to mobile (375px)
5. Verify: 1 column stacked vertically

### AT-003: Error Handling
1. Stop backend server
2. Navigate to `/positions/1`
3. Verify: Error alert displayed with retry button
4. Click retry → still error
5. Restart backend → click retry → loads correctly

### AT-004: Keyboard Navigation
1. Tab to first column drop zone
2. Tab to first candidate card
3. Press Space → card lifts (dragging state)
4. Arrow Right → move to next column
5. Press Space → drop
6. Verify: API called, candidate moved

---

*Generated as part of OpenSpec workflow*