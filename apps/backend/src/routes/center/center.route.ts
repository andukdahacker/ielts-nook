import { FastifyInstance } from "fastify/types/instance";
import { FastifyReply } from "fastify/types/reply";
import { FastifyRequest } from "fastify/types/request";
import Env from "../../env";
import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";
import JwtService from "../../services/jwt.service";
import { BaseResponseErrorSchema } from "../../types/response";
import CenterController from "./center.controller";
import CenterService from "./center.service";
import { GetCenterResponseSchema } from "./dto/get_center.response";
import {
  RegisterCenterInput,
  RegisterCenterInputSchema,
} from "./dto/register_center.input";
import { RegisterCenterResponseSchema } from "./dto/register_center.response";
import {
  SignInCenterInput,
  SignInCenterInputSchema,
} from "./dto/sign_in_center.input";
import { SignInCenterResponseSchema } from "./dto/sign_in_center.response";
import { CenterSchema } from "./schema/center.schema";

async function centerRoutes(fastify: FastifyInstance, opts: any) {
  fastify.addSchema(CenterSchema);
  fastify.addSchema(RegisterCenterInputSchema);
  fastify.addSchema(SignInCenterInputSchema);
  const env = fastify.getEnvs<Env>();
  const centerService = new CenterService(fastify.db);
  const jwtService = new JwtService(env.JWT_SECRET);
  const centerController = new CenterController(
    centerService,
    fastify.firebaseAuth,
    jwtService,
  );

  fastify.post("/register", {
    schema: {
      description: "Register a center",
      tags: ["center"],
      body: RegisterCenterInputSchema,
      response: {
        200: RegisterCenterResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    handler: async (
      request: FastifyRequest<{ Body: RegisterCenterInput }>,
      _reply: FastifyReply,
    ) => await centerController.register(request.body),
  });

  fastify.post("/signIn", {
    schema: {
      description: "Sign in a center",
      tags: ["center"],
      body: SignInCenterInputSchema,
      response: {
        200: SignInCenterResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    handler: async (
      request: FastifyRequest<{ Body: SignInCenterInput }>,
      _reply: FastifyReply,
    ) => await centerController.signIn(request.body),
  });

  fastify.get("/", {
    schema: {
      description: "Get current center",
      tags: ["center"],
      response: {
        200: GetCenterResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    preHandler: [authMiddleware, roleMiddleware([])],
    handler: async (request: FastifyRequest, _reply: FastifyReply) =>
      await centerController.getCurrentCenter(request.jwtPayload.id),
  });
}

export default centerRoutes;
