import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { Resend } from "resend";

declare module "fastify" {
  interface FastifyInstance {
    resend: Resend | null;
  }
}

const resendPlugin: FastifyPluginAsync<{ apiKey: string }> = async (
  fastify,
  options,
) => {
  if (!options.apiKey) {
    fastify.log.warn(
      "RESEND_API_KEY not provided. Email functionality will be disabled.",
    );
    fastify.decorate("resend", null);
    return;
  }

  const resend = new Resend(options.apiKey);

  fastify.decorate("resend", resend);
};

export default fp(resendPlugin);
