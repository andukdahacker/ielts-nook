import type { paths } from "@/schema/schema";
import createClient, { type Middleware } from "openapi-fetch";
import { firebaseAuth } from "./firebase";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    // 1. Try to get token from Firebase (most reliable/fresh)
    let token = null;

    if (firebaseAuth.currentUser) {
      token = await firebaseAuth.currentUser.getIdToken();
    } else {
      // 2. Fallback to localStorage if needed (e.g. for initial load before Firebase initializes)
      token = localStorage.getItem("token");
    }

    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },

  async onResponse({ response }) {
    const { status, statusText } = response;

    if (status === 401) {
      throw new UnauthorizedError(statusText);
    }

    if (status === 403) {
      const body = await response.clone().json().catch(() => ({ message: statusText }));
      throw new ForbiddenError(body.message || "Forbidden");
    }

    return response;
  },
};

export const client = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:4000",
  credentials: "include",
});

client.use(authMiddleware);

export default client;
