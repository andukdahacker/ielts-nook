import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { escapeHtml } from "../logistics/emails/format-utils.js";

export async function unsubscribeRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/unsubscribe/:token — Show confirmation page
  api.get("/:token", {
    schema: {
      params: z.object({ token: z.string() }),
    },
    handler: async (
      request: FastifyRequest<{ Params: { token: string } }>,
      reply,
    ) => {
      const { token } = request.params;

      const record = await fastify.prisma.parentEmail.findUnique({
        where: { unsubscribeToken: token },
        include: {
          user: {
            select: {
              name: true,
              memberships: {
                select: { center: { select: { name: true } } },
                take: 1,
              },
            },
          },
        },
      });

      if (!record) {
        return reply.type("text/html").send(renderPage({
          title: "Unsubscribe",
          heading: "Link Invalid",
          body: "This unsubscribe link is invalid or has expired.",
        }));
      }

      if (record.unsubscribed) {
        return reply.type("text/html").send(renderPage({
          title: "Already Unsubscribed",
          heading: "Already Unsubscribed",
          body: "You have already unsubscribed from these notifications.",
        }));
      }

      const studentName = record.user.name ?? "a student";
      const centerName =
        record.user.memberships[0]?.center.name ?? "ClassLite";

      return reply.type("text/html").send(renderPage({
        title: "Unsubscribe",
        heading: "Unsubscribe from Notifications",
        body: `You will stop receiving email notifications for <strong>${escapeHtml(studentName)}</strong> from <strong>${escapeHtml(centerName)}</strong>.`,
        showForm: true,
      }));
    },
  });

  // POST /api/v1/unsubscribe/:token — Perform unsubscribe
  api.post("/:token", {
    schema: {
      params: z.object({ token: z.string() }),
    },
    handler: async (
      request: FastifyRequest<{ Params: { token: string } }>,
      reply,
    ) => {
      const { token } = request.params;

      const record = await fastify.prisma.parentEmail.findUnique({
        where: { unsubscribeToken: token },
      });

      if (!record) {
        return reply.type("text/html").send(renderPage({
          title: "Unsubscribe",
          heading: "Link Invalid",
          body: "This unsubscribe link is invalid or has expired.",
        }));
      }

      if (!record.unsubscribed) {
        await fastify.prisma.parentEmail.update({
          where: { id: record.id },
          data: { unsubscribed: true },
        });
      }

      return reply.type("text/html").send(renderPage({
        title: "Unsubscribed",
        heading: "Successfully Unsubscribed",
        body: "You will no longer receive email notifications. You can close this page.",
      }));
    },
  });
}

function renderPage(opts: {
  title: string;
  heading: string;
  body: string;
  showForm?: boolean;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:40px auto;padding:0 20px;text-align:center;color:#18181b}
h1{font-size:24px;margin-bottom:16px}
p{font-size:16px;color:#52525b;line-height:1.5}
.btn{display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer}
.btn:hover{background:#1d4ed8}</style></head>
<body>
<h1>${escapeHtml(opts.heading)}</h1>
<p>${opts.body}</p>
${opts.showForm ? '<form method="POST" style="margin-top:24px"><button type="submit" class="btn">Confirm Unsubscribe</button></form>' : ""}
</body></html>`;
}
