import { FastifyReply, FastifyRequest } from "fastify";
import { JwtPayload } from "jsonwebtoken";
import { UserRole } from "../routes/user/schema/user.schema";
import JwtService from "../services/jwt.service";

export type AppJwtPayload = JwtPayload & {
  id: string;
  email: string;
  isCenter: boolean;
  role: UserRole;
  centerId: string;
};

declare module "fastify" {
  interface FastifyRequest {
    jwtPayload: AppJwtPayload;
  }
}
declare module "fastify" {
  interface FastifyRequest {
    jwtService: JwtService;
  }
}
async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (!request.headers.authorization) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Unauthorized",
    });
  }

  const token = request.headers.authorization.split(" ")[1];
  if (!token) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Unauthorized",
    });
  }

  try {
    const decoded = await request.jwtService.verify<AppJwtPayload>(token);
    if (!decoded) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Unauthorized",
      });
    }

    request.jwtPayload = decoded;
  } catch (error) {
    reply.log.error(error);
    return reply.status(401).send({
      error: error,
      message: "Unauthorized",
    });
  }
}

export default authMiddleware;
