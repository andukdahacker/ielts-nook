import { PrismaClient } from "@prisma/client";
import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient;
  }
}

async function prismaPlugin(fastify: FastifyInstance, options: any) {
  if (!fastify.hasDecorator("db")) {
    const client = new PrismaClient({
      log: ["error", "warn"],
    });

    fastify.log.info("Prisma connection established");

    fastify.decorate("db", client);
    fastify.addHook("onClose", async (server) => {
      try {
        await server.db.$disconnect();
        fastify.log.info("Prisma connection closed");
      } catch (e) {
        fastify.log.error(e);
        await server.db.$disconnect();
        process.exit(1);
      }
    });
  } else {
    throw new Error("Prisma already registered");
  }
}

export default fp(prismaPlugin);
