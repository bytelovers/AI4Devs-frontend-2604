import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, CardBody, CardTitle, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ArrowLeft, GripVertical } from 'react-bootstrap-icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useParams, useNavigate } from 'react-router-dom';
import { getInterviewFlowByPosition, getCandidatesByPosition, updateCandidateStage } from '../services/positionService';
import './PositionDetail.css';

interface InterviewStep {
    id: number;
    interviewFlowId: number;
    interviewTypeId: number;
    name: string;
    orderIndex: number;
}

interface Candidate {
    fullName: string;
    currentInterviewStep: string;
    averageScore: number;
    id: number;
    applicationId: number;
}

interface InterviewFlowData {
    positionName: string;
    interviewFlow: {
        id: number;
        description: string;
        interviewSteps: InterviewStep[];
    };
}

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
                    id={String(step.id)}
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
        id={String(candidate.applicationId)}
        className="kanban-candidate-card mb-2"
        style={{ 
            cursor: 'grab',
            transition: 'opacity 0.2s, box-shadow 0.2s'
        }}
    >
        <Card className="shadow-sm h-100" style={{ borderRadius: '8px' }}>
            <CardBody className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <GripVertical className="text-muted drag-handle" style={{ cursor: 'grab' }} />
                </div>
                <h6 className="mb-1 candidate-name">{candidate.fullName}</h6>
                <div className="d-flex align-items-center gap-2">
                    <Badge bg="primary" className="score-badge">
                        Score: {candidate.averageScore.toFixed(1)}
                    </Badge>
                </div>
            </CardBody>
        </Card>
    </div>
);

const PositionDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const positionId = parseInt(id || '0', 10);

    const [interviewFlow, setInterviewFlow] = useState<InterviewFlowData | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeStepId, setActiveStepId] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
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
        if (positionId) {
            fetchData();
        }
    }, [positionId, fetchData]);

    const handleDragStart = (event: DragStartEvent) => {
        // Drag start handler - could be used for visual feedback
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveStepId(null);

        if (over && active.id !== over.id) {
            const candidateId = Number(active.id);
            const newStepId = Number(over.id);

            const candidate = candidates.find(c => c.applicationId === candidateId);
            if (!candidate) return;

            try {
                await updateCandidateStage(candidate.id, candidate.applicationId, newStepId);
                
                const newStepName = interviewFlow?.interviewFlow.interviewSteps.find(s => s.id === newStepId)?.name;
                
                setCandidates(prev => prev.map(c => 
                    c.applicationId === candidateId 
                        ? { ...c, currentInterviewStep: newStepName || c.currentInterviewStep }
                        : c
                ));
            } catch (err: any) {
                setError(err.message || 'Error al mover el candidato');
                setTimeout(() => setError(null), 5000);
            }
        }
    };

    const handleDragOver = (event: DragEndEvent) => {
        const { over } = event;
        if (over) {
            setActiveStepId(Number(over.id));
        }
    };

    const getCandidatesForStep = (stepId: number) => {
        if (!interviewFlow) return [];
        const stepName = interviewFlow.interviewFlow.interviewSteps.find(s => s.id === stepId)?.name;
        return candidates.filter(c => c.currentInterviewStep === stepName);
    };

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

    if (error && !interviewFlow) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">{error}</Alert>
                <Button variant="secondary" onClick={() => navigate('/positions')}>
                    <ArrowLeft /> Volver a posiciones
                </Button>
            </Container>
        );
    }

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
                    <h1 className="h3 mb-0 fw-bold">{interviewFlow.positionName}</h1>
                    <p className="text-muted small mb-0">{interviewFlow.interviewFlow.interviewSteps.length} fases en el proceso</p>
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
                <SortableContext items={sortedSteps.map(s => String(s.id))} strategy={verticalListSortingStrategy}>
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
                </SortableContext>
            </DndContext>
        </Container>
    );
};

export default PositionDetail;