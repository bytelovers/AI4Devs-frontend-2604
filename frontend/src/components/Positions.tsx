import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Form, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getPositions, PositionListItem, statusLabel, statusBadgeClass, formatDate } from '../services/positionService';

const Positions: React.FC = () => {
    const [positions, setPositions] = useState<PositionListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [managerFilter, setManagerFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const fetchPositions = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getPositions();
            setPositions(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar las posiciones');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPositions();
    }, []);

    const filteredPositions = positions.filter((position) => {
        const matchesSearch = position.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || position.status === statusFilter;
        const matchesManager = !managerFilter || position.manager.toLowerCase() === managerFilter.toLowerCase();
        const positionDateOnly = formatDate(position.deadline);
        const matchesDate = !dateFilter || positionDateOnly === dateFilter;
        return matchesSearch && matchesStatus && matchesManager && matchesDate;
    });

    // Derive unique managers from all positions, normalized to title case for display
    const managersMap = new Map<string, string>();
    positions.forEach((p) => {
        const normalized = p.manager.toLowerCase();
        if (!managersMap.has(normalized)) {
            managersMap.set(normalized, p.manager);
        }
    });
    const managers = Array.from(managersMap.values());
    const hasActiveFilters = searchTerm || statusFilter || managerFilter || dateFilter;

    if (loading) {
        return (
            <Container className="mt-5">
                <Row className="justify-content-center">
                    <Col xs={6} className="text-center py-5">
                        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} role="status">
                            <span className="visually-hidden">Cargando...</span>
                        </Spinner>
                        <p className="mt-3 text-muted">Cargando posiciones...</p>
                    </Col>
                </Row>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-5">
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
                <Button variant="primary" onClick={fetchPositions}>
                    Reintentar
                </Button>
            </Container>
        );
    }

    return (
        <Container className="mt-5">
            <h2 className="text-center mb-4">Posiciones</h2>
            <Row className="mb-4">
                <Col md={3}>
                    <Form.Control
                        type="text"
                        placeholder="Buscar por título"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Col>
                <Col md={3}>
                    <Form.Control
                        type="date"
                        placeholder="Buscar por fecha"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                </Col>
                <Col md={3}>
                    <Form.Control
                        as="select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Estado</option>
                        <option value="open">Abierto</option>
                        <option value="filled">Contratado</option>
                        <option value="closed">Cerrado</option>
                        <option value="draft">Borrador</option>
                    </Form.Control>
                </Col>
                <Col md={3}>
                    <Form.Control
                        as="select"
                        value={managerFilter}
                        onChange={(e) => setManagerFilter(e.target.value)}
                    >
                        <option value="">Manager</option>
                        {managers.map((manager) => (
                            <option key={manager} value={manager}>
                                {manager}
                            </option>
                        ))}
                    </Form.Control>
                </Col>
            </Row>
<Row>
                {filteredPositions.length === 0 ? (
                    <Col xs={12} className="text-center py-4">
                        <p className="text-muted">
                            {hasActiveFilters ? 'No hay posiciones que coincidan con los filtros' : 'No se encontraron posiciones'}
                        </p>
                    </Col>
                ) : (
                    filteredPositions.map((position) => (
                        <Col md={4} key={position.id} className="mb-4">
                            <Card className="shadow-sm h-100">
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <Card.Title>{position.title}</Card.Title>
                                        <Badge bg="secondary">#{position.id}</Badge>
                                    </div>
                                    <Card.Text>
                                        <strong>Manager:</strong> {position.manager}<br />
                                        <strong>Fecha límite:</strong> {formatDate(position.deadline)}
                                    </Card.Text>
                                    <span className={`badge ${statusBadgeClass[position.status]} text-white`}>
                                        {statusLabel[position.status]}
                                    </span>
                                    <div className="d-grid gap-2 mt-3">
                                        <Link to={`/positions/${position.id}`} className="text-decoration-none">
                                            <Button variant="primary">Ver proceso</Button>
                                        </Link>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))
                )}
            </Row>
        </Container>
    );
};

export default Positions;