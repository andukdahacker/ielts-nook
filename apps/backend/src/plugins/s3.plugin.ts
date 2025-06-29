import { S3Client } from "@aws-sdk/client-s3";
import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import Env from "../env";

declare module "fastify" {
  interface FastifyInstance {
    s3: S3Client;
  }
}

async function s3Plugin(fastify: FastifyInstance, opts: any) {
  if (!fastify.hasDecorator("s3")) {
    const env = fastify.getEnvs<Env>();
    const client = new S3Client({
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
    });

    fastify.decorate("s3", client);
  } else {
    throw new Error("S3 plugin is already registered");
  }
}

export default fp(s3Plugin);
