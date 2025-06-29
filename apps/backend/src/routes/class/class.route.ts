import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import authMiddleware from '../../middlewares/auth.middleware';
import roleMiddleware from '../../middlewares/role.middleware';
import { BaseResponseErrorSchema, NoDataResponseSchema } from '../../types/response';
import ClassController from './class.controller';
import ClassService from './class.service';
import { CreateClassInput, CreateClassInputSchema } from './dto/create_class.input';
import { CreateClassResponseSchema } from './dto/create_class.response';
import { DeleteClassInput, DeleteClassInputSchema } from './dto/delete_class.input';
import { GetClassInput, GetClassInputSchema } from './dto/get_class.input';
import { GetClassResponseSchema } from './dto/get_class.response';
import { GetClassListInput, GetClassListInputSchema } from './dto/get_class_list.input';
import { GetClassListResponseSchema } from './dto/get_class_list.response';
import { GetClassListByUserInput, GetClassListByUserInputSchema } from './dto/get_class_list_by_user.input';
import { GetClassMemberInput, GetClassMemberInputSchema } from './dto/get_class_member.input';
import { GetClassMemberResponseSchema } from './dto/get_class_member.response';
import { UpdateClassInput, UpdateClassInputSchema } from './dto/update_class.input';
import { UpdateClassResponseSchema } from './dto/update_class.response';
import { ClassSchema } from './schema/class.schema';

async function classRoutes(fastify: FastifyInstance, opts: any) {
    fastify.addSchema(ClassSchema);
    fastify.addSchema(GetClassListInputSchema);
    fastify.addSchema(UpdateClassInputSchema);
    fastify.addSchema(GetClassListByUserInputSchema);
    fastify.addSchema(GetClassMemberInputSchema);
    const classService = new ClassService(fastify.db);
    const classController = new ClassController(classService);

    fastify.post('/', {
        schema: {
            description: 'Create a class',
            tags: ['class'],
            body: CreateClassInputSchema,
            response: {
                200: CreateClassResponseSchema,
                500: BaseResponseErrorSchema,
            },
        },
        preHandler: [authMiddleware, roleMiddleware(['ADMIN'])],
        handler: async (request: FastifyRequest<{ Body: CreateClassInput }>, _reply: FastifyReply) =>
            classController.createClass(request.body),
    });

    fastify.get('/:classId', {
        schema: {
            description: 'Get a class',
            tags: ['class'],
            params: GetClassInputSchema,
            response: {
                200: GetClassResponseSchema,
                500: BaseResponseErrorSchema,
            },
        },
        preHandler: [authMiddleware, roleMiddleware(['ADMIN', 'TEACHER'])],
        handler: async (request: FastifyRequest<{ Params: GetClassInput }>, _reply: FastifyReply) =>
            classController.getClass(request.params),
    });

    fastify.put('/', {
        schema: {
            description: 'Update a class',
            tags: ['class'],
            body: UpdateClassInputSchema,
            response: {
                200: UpdateClassResponseSchema,
                500: BaseResponseErrorSchema,
            },
        },
        preHandler: [authMiddleware, roleMiddleware(['ADMIN'])],
        handler: async (request: FastifyRequest<{ Body: UpdateClassInput }>, _reply: FastifyReply) =>
            classController.updateClass(request.body),
    });

    fastify.delete('/:classId', {
        schema: {
            description: 'Delete a class',
            tags: ['class'],
            params: DeleteClassInputSchema,
            response: {
                200: NoDataResponseSchema,
                500: BaseResponseErrorSchema,
            },
        },
        preHandler: [authMiddleware, roleMiddleware(['ADMIN'])],
        handler: async (request: FastifyRequest<{ Params: DeleteClassInput }>, _reply: FastifyReply) =>
            classController.deleteClass(request.params),
    });

    fastify.get('/list', {
        schema: {
            description: 'Get class list',
            tags: ['class'],
            querystring: GetClassListInputSchema,
            response: {
                200: GetClassListResponseSchema,
                500: BaseResponseErrorSchema,
            },
        },
        preHandler: [authMiddleware, roleMiddleware(['ADMIN', 'TEACHER'])],
        handler: async (request: FastifyRequest<{ Querystring: GetClassListInput }>, _reply: FastifyReply) =>
            await classController.getClassList(request.query),
    });

    fastify.get('/list/user', {
        schema: {
            description: 'Get class list by user id',
            tags: ['class'],
            querystring: GetClassListByUserInputSchema,
            response: {
                200: GetClassListResponseSchema,
                500: BaseResponseErrorSchema,
            },
        },
        preHandler: [authMiddleware, roleMiddleware(['ADMIN', 'TEACHER'])],
        handler: async (request: FastifyRequest<{ Querystring: GetClassListByUserInput }>, _reply: FastifyReply) =>
            await classController.getClassListByUser(request.query),
    });

    fastify.get('/:classId/member/:userId', {
        schema: {
            description: 'Get class member details',
            tags: ['class'],
            params: GetClassMemberInputSchema,
            response: {
                200: GetClassMemberResponseSchema,
                500: BaseResponseErrorSchema,
            },
        },
        preHandler: [authMiddleware, roleMiddleware(['ADMIN', 'TEACHER'])],
        handler: async (request: FastifyRequest<{ Params: GetClassMemberInput }>, _reply: FastifyReply) =>
            await classController.getClassMember(request.params),
    });
}

export default classRoutes;
