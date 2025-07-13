import createClient, { Middleware } from "openapi-fetch";
import { paths } from "../schema/schema";

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = localStorage.getItem("token");

    request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },

  async onResponse({ response }) {
    const { status, statusText } = response;

    if (status == 401) {
      throw new UnauthorizedError(statusText);
    }

    return response;
  },
};

export class UnauthorizedError extends Error {}

const client = createClient<paths>({
  baseUrl: "http://localhost:4000",
  credentials: "include",
});

client.use(authMiddleware);

export default client;
