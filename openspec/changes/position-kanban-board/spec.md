# Specification: Position Kanban Board & List

## Metadata
- **Change ID**: `position-kanban-board`
- **Version**: 1.1.0
- **Status**: `implemented`
- **Related**: `proposal.md`, `design.md`, `tasks.md`, `archive.md`

---

## Functional Requirements

| ID | Name | Description | Key Scenarios |
|----|------|-------------|---------------|
| **FR-001** | Navigation to Detail | User can navigate from positions list to Kanban detail view via URL or button | GIVEN user is on `/positions`<br>WHEN user clicks "Ver proceso" on a position card<br>THEN router navigates to `/positions/:id` |
| **FR-002** | Position List with Filters | List of positions loaded from API with search, status, manager, and date filters | GIVEN positions are fetched from `GET /positions`<br>WHEN manager filter is selected<br>THEN positions are filtered case-insensitively using normalized managers list |
| **FR-003** | Kanban Header | Detail page header displays position title, ID badge, manager, deadline, and status | GIVEN `/positions/1` is loaded<br>WHEN position data resolves<br>THEN show `#1 Senior Full-Stack Engineer`, manager `Bob Miller`, formatted deadline, and status badge |
| **FR-004** | Columns per Phase | Board displays one column per interview step, sorted by `orderIndex` | GIVEN flow is fetched from `GET /position/:id/interviewflow`<br>WHEN columns render<br>THEN order them ascending by `orderIndex` with step candidate counts |
| **FR-005** | Draggable Candidate Cards | Cards display candidate names, formatted scores, and use drag handles | GIVEN candidates fetched from `GET /position/:id/candidates`<br>WHEN card renders<br>THEN verify score formatting to 1 decimal, name display, and namespace-prefixed ID (`candidate-{appId}`) |
| **FR-006** | Drag & Drop | Drag card to columns to update stage with optimistic rendering and rollback | GIVEN card `candidate-1` is dragged to column `step-3`<br>WHEN drop finishes<br>THEN API `PUT /candidates/1` called with `positionId` payload. Rollback on failure |
| **FR-007** | Graceful Async States | Loading, errors with retry, AbortController cleanup, and settled promises | GIVEN detail page mounts<br>WHEN `Promise.allSettled` runs<br>THEN partial failures show warnings. Unmount aborts in-flight request |
| **FR-008** | Hard Cross-Validation | Validate that fetched detail data matches the route's position ID | GIVEN `/positions/1` is loaded<br>WHEN fetched flow has `id !== 1`<br>THEN show "Posición no encontrada" error and block render |

---

## Non-Functional Requirements

- **NFR-001 (Performance)**: Settled promises for parallel fetches, AbortController request cancellation.
- **NFR-002 (Accessibility)**: ARIA labels on drag handles, visual drop zone indicators.
- **NFR-003 (Code Quality)**: Shared TypeScript interfaces between API, list, and detail views. Zero compiler errors.
- **NFR-004 (Reliability)**: Consistent date formatting via shared `formatDate` helper in local timezone.

---

## API Contracts

### GET /positions
Returns list of positions.
```json
[
  { "id": 1, "title": "Senior Full-Stack Engineer", "manager": "Bob Miller", "deadline": "2024-12-31", "status": "open" }
]
```

### GET /position/:id/interviewflow
Returns position details and flow.
```json
{
  "interviewFlow": {
    "id": 1,
    "title": "Senior Full-Stack Engineer",
    "manager": "Bob Miller",
    "deadline": "2024-12-31",
    "status": "open",
    "interviewFlow": {
      "id": 1,
      "description": "Standard development process",
      "interviewSteps": [
        { "id": 1, "interviewFlowId": 1, "interviewTypeId": 1, "name": "Initial Screening", "orderIndex": 1 }
      ]
    }
  }
}
```

### GET /position/:id/candidates
Returns candidates for a position.
```json
[
  { "candidateId": 1, "applicationId": 1, "positionId": 1, "fullName": "John Doe", "currentInterviewStepId": 1, "averageScore": 5 }
]
```

### PUT /candidates/:id
Updates candidate stage.
```json
{ "applicationId": 1, "currentInterviewStep": 2, "positionId": 1 }
```

---

## Data Models (TypeScript)

```typescript
export type PositionStatus = 'open' | 'filled' | 'closed' | 'draft';

export interface PositionListItem {
    id: number;
    title: string;
    manager: string;
    deadline: string;
    status: PositionStatus;
}

export interface Candidate {
    fullName: string;
    currentInterviewStepId: number;
    averageScore: number;
    candidateId: number;
    applicationId: number;
    positionId: number;
}

export interface InterviewFlowData {
    id: number;
    title: string;
    manager: string;
    deadline: string;
    status: PositionStatus;
    interviewFlow: {
        id: number;
        description: string;
        interviewSteps: InterviewStep[];
    };
}
```

---
*Generated as part of OpenSpec workflow*
