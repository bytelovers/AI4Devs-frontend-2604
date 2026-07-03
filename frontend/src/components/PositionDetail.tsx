import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, CardBody, CardTitle, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ArrowLeft, GripVertical } from 'react-bootstrap-icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useParams, useNavigate } from 'react-router-dom';
import { getInterviewFlowByPosition, getCandidatesByPosition, updateCandidateStage, InterviewFlowData, Candidate, InterviewStep, statusLabel, statusBadgeClass, formatDate } from '../services/positionService';
import './PositionDetail.css';

interface KanbanColumnProps {
    step: InterviewStep;
    candidates: Candidate[];
    isDraggingOver: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ step, candidates, isDraggingOver }) => (
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
                    id={`step-${step.id}`}
                    className="kanban-drop-zone min-vh-50"
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

interface CandidateCardProps {
    candidate: Candidate;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => (
    <div
        id={`candidate-${candidate.applicationId}`}
        className="kanban-candidate-card mb-2"
        style={{ 
            cursor: 'grab',
            transition: 'opacity 0.2s, box-shadow 0.2s'
        }}
    >
        <Card className="shadow-sm h-100" style={{ borderRadius: '8px' }}>
            <CardBody className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <GripVertical className="text-muted drag-handle" style={{ cursor: 'grab' }} aria-label="Arrastrar candidato" />
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

const PositionDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    // Validate id format with regex before parsing - reject "123abc" style strings
    const isValidId = id && /^\d+$/.test(id);
    const positionId = isValidId ? parseInt(id, 10) : 0;

    const [interviewFlow, setInterviewFlow] = useState<InterviewFlowData | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeStepId, setActiveStepId] = useState<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

const fetchData = useCallback(async () => {
        if (positionId <= 0) {
            setError('ID de posición inválido');
            setLoading(false);
            return;
        }

        // Cancel any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        const { signal } = abortController;

        try {
            setLoading(true);
            setError(null);
            const results = await Promise.allSettled([
                getInterviewFlowByPosition(positionId),
                getCandidatesByPosition(positionId)
            ]);

            // Check if request was aborted before setting state
            if (signal.aborted) return;

            const [flowResult, candidatesResult] = results;

            if (flowResult.status === 'fulfilled') {
                // Cross-validate that fetched data matches requested positionId - HARD ERROR
                if (flowResult.value.id !== positionId) {
                    setError('Posición no encontrada');
                    setInterviewFlow(null);
                    setCandidates([]);
                    return;
                }
                setInterviewFlow(flowResult.value);
            } else {
                console.error('Failed to load interview flow:', flowResult.reason);
            }

            if (candidatesResult.status === 'fulfilled') {
                setCandidates(candidatesResult.value);
            } else {
                console.error('Failed to load candidates:', candidatesResult.reason);
            }

            if (signal.aborted) return;

            if (flowResult.status === 'rejected' && candidatesResult.status === 'rejected') {
                const message = flowResult.reason?.message || candidatesResult.reason?.message || 'Error al cargar los datos de la posición';
                setError(message);
            } else if (flowResult.status === 'rejected' || candidatesResult.status === 'rejected') {
                // Partial data loaded
                const failed = flowResult.status === 'rejected' ? 'flujo de entrevistas' : 'candidatos';
                const message = `Advertencia: No se pudo cargar ${failed}. Mostrando datos parciales.`;
                setError(message);
            }
        } catch (err: any) {
            if (signal.aborted) return;
            const message = err.message || 'Error al cargar los datos de la posición';
            setError(message);
            console.error(err);
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }
    }, [positionId]);

    useEffect(() => {
        if (positionId > 0) {
            fetchData();
        } else {
            setError('ID de posición inválido');
            setLoading(false);
        }
        // Cleanup: abort in-flight request on unmount
        return () => {
            abortControllerRef.current?.abort();
        };
    }, [positionId, fetchData]);

    const handleRetry = () => {
        if (positionId > 0) {
            fetchData();
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        // Drag start handler - could be used for visual feedback
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveStepId(null);

        if (over && active.id !== over.id) {
            // Parse namespaced IDs: "candidate-{applicationId}" and "step-{stepId}"
            const activeParts = String(active.id).split('-');
            const overParts = String(over.id).split('-');
            
            if (activeParts[0] !== 'candidate' || overParts[0] !== 'step') {
                return; // Invalid drag combination
            }

            const candidateApplicationId = Number(activeParts[1]);
            const newStepId = Number(overParts[1]);

            const candidate = candidates.find(c => c.applicationId === candidateApplicationId);
            if (!candidate) return;

            const previousStepId = candidate.currentInterviewStepId;

            try {
                await updateCandidateStage(candidate.candidateId, candidate.applicationId, newStepId, positionId);
                
                // Update optimistically using stepId for reliability
                setCandidates(prev => prev.map(c => 
                    c.applicationId === candidateApplicationId 
                        ? { ...c, currentInterviewStepId: newStepId }
                        : c
                ));
            } catch (err: any) {
                // Rollback optimistic update on failure
                setCandidates(prev => prev.map(c => 
                    c.applicationId === candidateApplicationId 
                        ? { ...c, currentInterviewStepId: previousStepId }
                        : c
                ));
                setError(err.message || 'Error al mover el candidato');
                setTimeout(() => setError(null), 5000);
            }
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (over) {
            const overParts = String(over.id).split('-');
            if (overParts[0] === 'step') {
                setActiveStepId(Number(overParts[1]));
            }
        }
    };

    const getCandidatesForStep = (stepId: number) => {
        if (!interviewFlow) return [];
        return candidates.filter(c => c.currentInterviewStepId === stepId);
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
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
                <Button variant="primary" onClick={handleRetry} className="me-2">
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
                    <h1 className="h3 mb-0 fw-bold">#{interviewFlow.id} {interviewFlow.title}</h1>
                    <div className="d-flex flex-wrap justify-content-center justify-content-md-end gap-2 mt-2">
                        <span className="text-muted small">
                            {interviewFlow.interviewFlow.interviewSteps.length} fases en el proceso
                        </span>
                        <Badge bg={statusBadgeClass[interviewFlow.status]} className="text-white">
                            {statusLabel[interviewFlow.status]}
                        </Badge>
                    </div>
                    <div className="d-flex flex-wrap justify-content-center justify-content-md-end gap-3 mt-2 text-muted small">
                        <span><strong>Manager:</strong> {interviewFlow.manager}</span>
                        <span><strong>Fecha límite:</strong> {formatDate(interviewFlow.deadline)}</span>
                    </div>
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