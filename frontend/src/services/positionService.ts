import axios from 'axios';

const API_BASE_URL = 'http://localhost:3010';

export const getInterviewFlowByPosition = async (positionId: number) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/position/${positionId}/interviewflow`);
        return response.data.interviewFlow;
    } catch (error: any) {
        throw new Error('Error al obtener el flujo de entrevistas: ' + error.response?.data?.message || error.message);
    }
};

export const getCandidatesByPosition = async (positionId: number) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/position/${positionId}/candidates`);
        return response.data;
    } catch (error: any) {
        throw new Error('Error al obtener candidatos: ' + error.response?.data?.message || error.message);
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
        throw new Error('Error al actualizar etapa: ' + error.response?.data?.message || error.message);
    }
};