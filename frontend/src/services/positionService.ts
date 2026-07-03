import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3010';

export type PositionStatus = 'open' | 'filled' | 'closed' | 'draft';

export const statusLabel: Record<PositionStatus, string> = {
    open: 'Abierto',
    filled: 'Contratado',
    closed: 'Cerrado',
    draft: 'Borrador',
};

export const statusBadgeClass: Record<PositionStatus, string> = {
    open: 'bg-warning',
    filled: 'bg-success',
    closed: 'bg-danger',
    draft: 'bg-secondary',
};

export interface PositionListItem {
    id: number;
    title: string;
    manager: string;
    deadline: string;
    status: PositionStatus;
}

export interface InterviewStep {
    id: number;
    interviewFlowId: number;
    interviewTypeId: number;
    name: string;
    orderIndex: number;
}

export interface Candidate {
    fullName: string;
    currentInterviewStep: string;
    averageScore: number;
    id: number;
    applicationId: number;
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

export const getPositions = async (): Promise<PositionListItem[]> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/positions`);
        return response.data;
    } catch (error: any) {
        throw new Error('Error al obtener posiciones: ' + (error.response?.data?.message || error.message), { cause: error });
    }
};

export const getInterviewFlowByPosition = async (positionId: number): Promise<InterviewFlowData> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/position/${positionId}/interviewflow`);
        return response.data.interviewFlow;
    } catch (error: any) {
        throw new Error('Error al obtener el flujo de entrevistas: ' + (error.response?.data?.message || error.message), { cause: error });
    }
};

export const getCandidatesByPosition = async (positionId: number): Promise<Candidate[]> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/position/${positionId}/candidates`);
        return response.data;
    } catch (error: any) {
        throw new Error('Error al obtener candidatos: ' + (error.response?.data?.message || error.message), { cause: error });
    }
};

export const updateCandidateStage = async (candidateId: number, applicationId: number, newInterviewStepId: number) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/candidates/${candidateId}`, {
            applicationId,
            currentInterviewStep: newInterviewStepId
        });
        return response.data;
    } catch (error: any) {
        throw new Error('Error al actualizar etapa: ' + (error.response?.data?.message || error.message), { cause: error });
    }
};

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    // Use local timezone (YYYY-MM-DD) to match <input type="date"> behavior
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};