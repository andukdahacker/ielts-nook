import { FastifyInstance, FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request";
import authMiddleware from "../../middlewares/auth.middleware";
import { BaseResponseErrorSchema } from "../../types/response";
import CenterService from "../center/center.service";
import UserService from "../user/user.service";
import { GetMeResponseSchema } from "./dto/get_me.response";
import MeController from "./me_controller";

async function meRoutes(fastify: FastifyInstance, opts: any) {
  const userService = new UserService(fastify.db);
  const centerService = new CenterService(fastify.db);
  const meController = new MeController(centerService, userService);

  fastify.get("/", {
    schema: {
      description: "Get me",
      tags: ["me"],
      response: {
        200: GetMeResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    preHandler: [authMiddleware],
    handler: async (request: FastifyRequest, _reply: FastifyReply) =>
      await meController.getMe(request.jwtPayload),
    errorHandler: (error, req, rep) => {
      rep.log.error(error);

      return rep.status(401).send({
        error: error,
        message: "Unauthorized",
      });
    },
  });
}

export default meRoutes;
