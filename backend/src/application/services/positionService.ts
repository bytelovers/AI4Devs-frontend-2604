import { PrismaClient } from '@prisma/client';
import { Position } from '../../domain/models/Position';

const prisma = new PrismaClient();

const calculateAverageScore = (interviews: any[]) => {
    if (interviews.length === 0) return 0;
    const totalScore = interviews.reduce((acc, interview) => acc + (interview.score || 0), 0);
    return totalScore / interviews.length;
};

/** Derive manager name from company employees: first with role containing 'manager', else first employee, else 'Sin asignar'. */
const deriveManagerName = (employees: { role: string; name: string }[]): string => {
    const manager = employees.find(e => e.role.toLowerCase().includes('manager'))
        || employees[0];
    return manager ? manager.name : 'Sin asignar';
};

export const getCandidatesByPositionService = async (positionId: number) => {
    try {
        const applications = await prisma.application.findMany({
            where: { positionId },
            include: {
                candidate: true,
                interviews: true,
                interviewStep: true
            }
        });

        return applications.map(app => ({
            fullName: `${app.candidate.firstName} ${app.candidate.lastName}`,
            currentInterviewStep: app.interviewStep.name,
            averageScore: calculateAverageScore(app.interviews),
            id: app.candidate.id,
            applicationId: app.id
        }));
    } catch (error) {
        console.error('Error retrieving candidates by position:', error);
        throw new Error('Error retrieving candidates by position');
    }
};

export const getAllPositionsService = async () => {
    const positions = await prisma.position.findMany({
        include: {
            company: {
                include: {
                    employees: true
                }
            }
        }
    });

    return positions.map(pos => {
        return {
            id: pos.id,
            title: pos.title,
            manager: deriveManagerName(pos.company.employees),
            deadline: pos.applicationDeadline ? pos.applicationDeadline.toISOString().split('T')[0] : '',
            status: pos.status.toLowerCase() // Normalize to lowercase for frontend consistency
        };
    });
};

export const getInterviewFlowByPositionService = async (positionId: number) => {
    const positionWithInterviewFlow = await prisma.position.findUnique({
        where: { id: positionId },
        include: {
            company: {
                include: {
                    employees: true
                }
            },
            interviewFlow: {
                include: {
                    interviewSteps: true
                }
            }
        }
    });

    if (!positionWithInterviewFlow) {
        throw new Error('Position not found');
    }

    // Return format matching frontend's InterviewFlowData interface
    return {
        id: positionWithInterviewFlow.id,
        title: positionWithInterviewFlow.title,
        manager: deriveManagerName(positionWithInterviewFlow.company.employees),
        deadline: positionWithInterviewFlow.applicationDeadline ? positionWithInterviewFlow.applicationDeadline.toISOString().split('T')[0] : '',
        status: positionWithInterviewFlow.status.toLowerCase(),
        interviewFlow: {
            id: positionWithInterviewFlow.interviewFlow.id,
            description: positionWithInterviewFlow.interviewFlow.description,
            interviewSteps: positionWithInterviewFlow.interviewFlow.interviewSteps.map(step => ({
                id: step.id,
                interviewFlowId: step.interviewFlowId,
                interviewTypeId: step.interviewTypeId,
                name: step.name,
                orderIndex: step.orderIndex
            }))
        }
    };
};
