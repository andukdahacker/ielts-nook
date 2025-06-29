import { FastifyInstance } from 'fastify';
import { FastifyReply } from 'fastify/types/reply';
import { FastifyRequest } from 'fastify/types/request';
import authMiddleware from '../../middlewares/auth.middleware';
import roleMiddleware from '../../middlewares/role.middleware';
import { BaseResponseErrorSchema } from '../../types/response';
import AssignmentService from '../assignment/assignment.service';
import ClassService from '../class/class.service';
import { CreateSubmissionInput, CreateSubmissionInputSchema } from './dto/create_submission.input';
import { CreateSubmissionResponseSchema } from './dto/create_submission.response';
import { GetSubmissionInput, GetSubmissionInputSchema } from './dto/get_submission.input';
import { GetSubmissionResponseSchema } from './dto/get_submission.response';
import { GetSubmissionListInput, GetSubmissionListInputSchema } from './dto/get_submission_list.input';
import { GetSubmissionListResponseSchema } from './dto/get_submission_list.response';
import { UpdateSubmissionInput, UpdateSubmissionInputSchema } from './dto/update_submission.input';
import { UpdateSubmissionResponseSchema } from './dto/update_submission.response';
import { SubmissionSchema } from './schema/submission.schema';
import { SubmissionContentSchema } from './schema/submission_content.schema';
import { SubmissionFeedbackSchema } from './schema/submission_feedback.schema';
import { SubmissionGradeSchema } from './schema/submission_grade.schema';
import SubmissionController from './submission.controller';
import SubmissionService from './submission.service';

function submissionRoutes(fastify: FastifyInstance, opts: any) {
    fastify.addSchema(SubmissionSchema);
    fastify.addSchema(CreateSubmissionInputSchema);
    fastify.addSchema(SubmissionContentSchema);
    fastify.addSchema(SubmissionGradeSchema);
    fastify.addSchema(SubmissionFeedbackSchema);
    fastify.addSchema(UpdateSubmissionInputSchema);

    const submissionService = new SubmissionService(fastify.db);
    const assignmentService = new AssignmentService(fastify.db);
    const classMemberService = new ClassService(fastify.db);
    const submissionController = new SubmissionController(submissionService, assignmentService, classMemberService);

    fastify.post('/', {
        schema: {
            description: 'Create submission',
            tags: ['submission'],
            body: CreateSubmissionInputSchema,
            response: {
                200: CreateSubmissionResponseSchema,
                500: BaseResponseErrorSchema,
            },
        },
        preHandler: [authMiddleware, roleMiddleware(['STUDENT'])],
        handler: async (request: FastifyRequest<{ Body: CreateSubmissionInput }>, _reply: FastifyReply) =>
            await submissionController.createSubmission(request.body),
    });

    fastify.get('/list', {
        schema: {
            description: 'Get list of submissions',
            tags: ['submission'],
            querystring: GetSubmissionListInputSchema,
            response: {
                200: GetSubmissionListResponseSchema,
                500: BaseResponseErrorSchema,
            },
        },
        preHandler: [authMiddleware, roleMiddleware(['ADMIN', 'TEACHER'])],
        handler: async (request: FastifyRequest<{ Querystring: GetSubmissionListInput }>, _reply: FastifyReply) =>
            await submissionController.getSubmissions(request.query, request.jwtPayload.id),
    });

    fastify.get('/:id', {
        schema: {
            description: 'Get submission',
            tags: ['submission'],
            params: GetSubmissionInputSchema,
            response: {
                200: GetSubmissionResponseSchema,
                500: BaseResponseErrorSchema,
            },
        },
        preHandler: [authMiddleware],
        handler: async (request: FastifyRequest<{ Params: GetSubmissionInput }>, _reply: FastifyReply) =>
            await submissionController.getSubmission(request.params),
    });

    fastify.put('/', {
        schema: {
            description: 'Update submission',
            tags: ['submisison'],
            body: UpdateSubmissionInputSchema,
            response: {
                200: UpdateSubmissionResponseSchema,
                500: BaseResponseErrorSchema,
            },
        },
        preHandler: [authMiddleware, roleMiddleware(['ADMIN', 'TEACHER'])],
        handler: async (request: FastifyRequest<{ Body: UpdateSubmissionInput }>, _reply: FastifyReply) =>
            await submissionController.updateSubmission(request.body),
    });
}

export default submissionRoutes;
