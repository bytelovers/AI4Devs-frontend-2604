import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, CardBody, CardTitle, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ArrowLeft, GripVertical } from 'react-bootstrap-icons';
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { useParams, useNavigate } from 'react-router-dom';
import { getInterviewFlowByPosition, getCandidatesByPosition, updateCandidateStage, InterviewStep, Candidate, InterviewFlowData, statusLabel, statusBadgeClass, formatDate } from '../services/positionService';
import './PositionDetail.css';

interface KanbanColumnProps {
    step: InterviewStep;
    candidates: Candidate[];
    isDraggingOver: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ step, candidates, isDraggingOver }) => {
    const { setNodeRef } = useDroppable({ id: `step-${step.id}` });

    return (
        <Col key={step.id} xs={12} sm={6} lg={4} xl={3} className="kanban-column">
            <Card className={`h-100 kanban-card ${isDraggingOver ? 'dragging-over' : ''}`}>
                <CardBody className="p-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <CardTitle className="h6 mb-0 text-muted text-uppercase small">
                            {step.name}
                        </CardTitle>
                        <Badge bg="secondary">{candidates.length}</Badge>
                    </div>
                    <div
                        ref={setNodeRef}
                        className="kanban-drop-zone"
                        style={{ minHeight: '300px' }}
                    >
                        {candidates.length === 0 && (
                            <div className="text-center text-muted py-4 small">
                                Arrastra candidatos aquí
                            </div>
                        )}
                        {candidates.map((candidate) => (
                            <CandidateCard
                                key={candidate.applicationId}
                                candidate={candidate}
                            />
                        ))}
                    </div>
                </CardBody>
            </Card>
        </Col>
    );
};

interface CandidateCardProps {
    candidate: Candidate;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `candidate-${candidate.applicationId}`,
        data: { candidate }
    });

    const style: React.CSSProperties = {
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        ...(transform ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        } : {}),
        transition: 'opacity 0.2s, box-shadow 0.2s'
    };

    return (
        <div
            ref={setNodeRef}
            className={`kanban-candidate-card mb-2 ${isDragging ? 'dragging' : ''}`}
            style={style}
            {...listeners}
            {...attributes}
            aria-label={`Candidato ${candidate.fullName}. Score: ${(candidate.averageScore ?? 0).toFixed(1)}`}
        >
            <Card className="shadow-sm h-100" style={{ borderRadius: '8px' }}>
                <CardBody className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                        <GripVertical className="text-muted drag-handle" style={{ cursor: 'grab' }} aria-hidden="true" />
                    </div>
                    <h6 className="mb-1 candidate-name">{candidate.fullName}</h6>
                    <div className="d-flex align-items-center gap-2">
                        <Badge bg="primary" className="score-badge">
                            Score: {(candidate.averageScore ?? 0).toFixed(1)}
                        </Badge>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};

const PositionDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const parsedId = parseInt(id || '', 10);
    const positionId = !isNaN(parsedId) && parsedId > 0 ? parsedId : 0;

    const [interviewFlow, setInterviewFlow] = useState<InterviewFlowData | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeStepId, setActiveStepId] = useState<number | null>(null);
    const [unmatchedCount, setUnmatchedCount] = useState(0);
    const unmatchedLoggedRef = useRef(0);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Detect candidates whose currentInterviewStep doesn't match any defined step
    useEffect(() => {
        if (!interviewFlow?.interviewFlow?.interviewSteps || candidates.length === 0) {
            setUnmatchedCount(0);
            return;
        }
        const stepNames = new Set(interviewFlow.interviewFlow.interviewSteps.map(s => s.name.trim().toLowerCase()));
        const unmatched = candidates.filter(c => !stepNames.has(c.currentInterviewStep?.trim().toLowerCase() ?? ''));
        setUnmatchedCount(unmatched.length);
        if (unmatched.length > 0 && unmatched.length !== unmatchedLoggedRef.current) {
            console.warn(
                `[PositionDetail] ${unmatched.length} candidato(s) sin fase asignada:`,
                unmatched.map(c => ({ id: c.id, applicationId: c.applicationId, fullName: c.fullName, step: c.currentInterviewStep }))
            );
            unmatchedLoggedRef.current = unmatched.length;
        } else if (unmatched.length === 0) {
            unmatchedLoggedRef.current = 0;
        }
    }, [interviewFlow, candidates]);

    // Cleanup error timer on unmount
    useEffect(() => {
        return () => {
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        };
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [flowData, candidatesData] = await Promise.all([
                getInterviewFlowByPosition(positionId),
                getCandidatesByPosition(positionId)
            ]);
            setInterviewFlow(flowData);
            setCandidates(candidatesData);
        } catch (err: any) {
            setError(err.message || 'Error al cargar los datos de la posición');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [positionId]);

    useEffect(() => {
        if (!positionId) {
            setError('ID de posición inválido');
            setLoading(false);
            return;
        }
        fetchData();
    }, [positionId, fetchData]);

    const handleDragStart = () => {
        // Drag started - could add visual feedback here
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveStepId(null);

        if (!over || active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        if (!activeId.startsWith('candidate-') || !overId.startsWith('step-')) return;

        const applicationId = Number(activeId.replace('candidate-', ''));
        const newStepId = Number(overId.replace('step-', ''));

        const candidate = candidates.find(c => c.applicationId === applicationId);
        if (!candidate) return;

        // Check if the candidate is already in this step
        const currentStepId = interviewFlow?.interviewFlow.interviewSteps.find(
            s => s.name.trim().toLowerCase() === (candidate.currentInterviewStep?.trim().toLowerCase() ?? '')
        )?.id;
        if (currentStepId === newStepId) return;

        try {
            await updateCandidateStage(candidate.id, candidate.applicationId, newStepId);

            const newStepName = interviewFlow?.interviewFlow.interviewSteps.find(s => s.id === newStepId)?.name;

            setCandidates(prev => prev.map(c =>
                c.applicationId === applicationId
                    ? { ...c, currentInterviewStep: newStepName || c.currentInterviewStep }
                    : c
            ));
        } catch (err: any) {
            setError(err.message || 'Error al mover el candidato');
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
            errorTimerRef.current = setTimeout(() => { setError(null); errorTimerRef.current = null; }, 5000);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (over) {
            const overId = String(over.id);
            if (overId.startsWith('step-')) {
                setActiveStepId(Number(overId.replace('step-', '')));
            }
        }
    };

    const getCandidatesForStep = (stepId: number) => {
        if (!interviewFlow) return [];
        const stepName = interviewFlow.interviewFlow.interviewSteps.find(s => s.id === stepId)?.name;
        const normalizedStepName = stepName?.trim().toLowerCase() ?? '';
        return candidates.filter(c => (c.currentInterviewStep?.trim().toLowerCase() ?? '') === normalizedStepName);
    };

    // Loading state
    if (loading) {
        return (
            <Container className="mt-5">
                <Row className="justify-content-center">
                    <Col xs={6} className="text-center py-5">
                        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} role="status">
                            <span className="visually-hidden">Cargando...</span>
                        </Spinner>
                        <p className="mt-3 text-muted">Cargando posición...</p>
                    </Col>
                </Row>
            </Container>
        );
    }

    // Error state (with retry)
    if (error && !interviewFlow) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">{error}</Alert>
                <Button variant="primary" onClick={fetchData} className="me-2">
                    Reintentar
                </Button>
                <Button variant="secondary" onClick={() => navigate('/positions')}>
                    <ArrowLeft /> Volver a posiciones
                </Button>
            </Container>
        );
    }

    // Not found state
    if (!interviewFlow) {
        return (
            <Container className="mt-5 text-center">
                <Alert variant="warning">No se encontró el flujo de entrevistas para esta posición</Alert>
                <Button variant="secondary" onClick={() => navigate('/positions')}>
                    <ArrowLeft /> Volver a posiciones
                </Button>
            </Container>
        );
    }

    const sortedSteps = [...interviewFlow.interviewFlow.interviewSteps].sort((a, b) => a.orderIndex - b.orderIndex);

    return (
        <Container fluid className="kanban-board-container py-4">
            {/* Header with back arrow and position title */}
            <Row className="mb-4 align-items-center">
                <Col xs={12} md={2} className="text-md-start text-center mb-3 mb-md-0">
                    <Link to="/positions" className="text-decoration-none text-muted d-inline-flex align-items-center">
                        <ArrowLeft size={24} className="me-2" />
                        <span className="fw-medium">Volver a posiciones</span>
                    </Link>
                </Col>
                <Col xs={12} md={10} className="text-center text-md-end">
                    <h1 className="h3 mb-0 fw-bold">{interviewFlow.title}</h1>
                    <p className="text-muted small mb-0">
                        {interviewFlow.interviewFlow.interviewSteps.length} fases en el proceso
                    </p>
                    <p className="text-muted small mb-0 mt-1">
                        <span className="me-3"><strong>Manager:</strong> {interviewFlow.manager || 'Sin asignar'}</span>
                        {interviewFlow.deadline && <span className="me-3"><strong>Fecha límite:</strong> {formatDate(interviewFlow.deadline)}</span>}
                        {interviewFlow.status && (
                            <span className={`badge ${statusBadgeClass[interviewFlow.status] || 'bg-secondary'} ${interviewFlow.status === 'open' ? 'text-dark' : 'text-white'}`}>
                                {statusLabel[interviewFlow.status] || interviewFlow.status}
                            </span>
                        )}
                    </p>
                </Col>
            </Row>

            {error && (
                <Row className="mb-3">
                    <Col>
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    </Col>
                </Row>
            )}

            {unmatchedCount > 0 && (
                <Row className="mb-3">
                    <Col>
                        <Alert variant="warning">
                            {unmatchedCount} candidato{unmatchedCount !== 1 ? 's' : ''} sin fase asignada — no se muestra{unmatchedCount !== 1 ? 'n' : ''} en el tablero hasta que se le asigne una fase.
                        </Alert>
                    </Col>
                </Row>
            )}

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
            >
                <Row className="kanban-board g-3">
                    {sortedSteps.map((step) => (
                        <KanbanColumn
                            key={step.id}
                            step={step}
                            candidates={getCandidatesForStep(step.id)}
                            isDraggingOver={activeStepId === step.id}
                        />
                    ))}
                </Row>
            </DndContext>
        </Container>
    );
};

export default PositionDetail;
