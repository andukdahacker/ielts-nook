import client, { UnauthorizedError } from "../../../core/client";

async function me() {
  const result = await client.GET("/api/me/");

  if (result.error) {
    if (result.response.status == 401) {
      throw new UnauthorizedError();
    } else {
      throw new Error(result.error.error);
    }
  }

  return result.data.data;
}

export default me;
