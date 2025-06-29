import { FastifyReply } from "fastify/types/reply";
import { FastifyRequest } from "fastify/types/request";
import { UserRole } from "../routes/user/schema/user.schema";

function roleMiddleware(roles: UserRole[]) {
  return (request: FastifyRequest, reply: FastifyReply, done: Function) => {
    const jwtPayload = request.jwtPayload;

    if (jwtPayload.isCenter) {
      done();
      return;
    }

    if (roles.includes(jwtPayload.role)) {
      done();
      return;
    }

    reply.status(400).send({
      error: "Unauthorized request",
      message: "User does not have the permission to perform this action",
    });

    done();
  };
}

export default roleMiddleware;
