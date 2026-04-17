import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { SessionsService } from "../modules/logistics/sessions.service.js";

/**
 * Singleton DI for cross-module services.
 *
 * Several feature routes need access to the same service instance — most
 * notably `SessionsService`, which is consumed by both
 * `apps/.../logistics/sessions.routes.ts` (the sessions endpoint) and
 * `apps/.../logistics/schedules.routes.ts` (which calls
 * `generateSessionsFromSchedule` after creating a schedule). Without a shared
 * decorator each route would `new SessionsService(...)` independently, giving
 * us multiple in-flight instances; if/when the service grows internal state
 * (caches, in-flight request maps), those would silently desync between
 * routes.
 *
 * Register this plugin AFTER `prismaPlugin` so `fastify.prisma` is available
 * when constructing the service.
 */

declare module "fastify" {
  interface FastifyInstance {
    sessionsService: SessionsService;
  }
}

const servicesPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorate("sessionsService", new SessionsService(fastify.prisma));
};

// Must be registered AFTER prismaPlugin so `fastify.prisma` is decorated.
export default fp(servicesPlugin);
