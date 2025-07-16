import createClient, { Middleware } from "openapi-fetch";
import { paths } from "../schema/schema";

function getCookie(cname: string) {
  let name = cname + "=";
  let ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    if (!c) continue;
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getCookie("token");

    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }

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

export const client = createClient<paths>({
  baseUrl: "http://localhost:4000",
  credentials: "include",
});

client.use(authMiddleware);

export default client;
