import { FastifyInstance } from "fastify";
import assignmentRoutes from "./assignment/assignment.routes";
import centerRoutes from "./center/center.route";
import classRoutes from "./class/class.route";
import exerciseRoutes from "./exercise/exercise.route";
import meRoutes from "./me/me_routes";
import submissionRoutes from "./submission/submission.routes";
import userRoutes from "./user/user.route";

async function routes(fastify: FastifyInstance, opts: any) {
  fastify.register(meRoutes, { prefix: "/me" });
  fastify.register(centerRoutes, { prefix: "/center" });
  fastify.register(userRoutes, { prefix: "/user" });
  fastify.register(classRoutes, { prefix: "/class" });
  fastify.register(exerciseRoutes, { prefix: "/exercise" });
  fastify.register(assignmentRoutes, { prefix: "/assignment" });
  fastify.register(submissionRoutes, { prefix: "/submission" });
}

export default routes;
