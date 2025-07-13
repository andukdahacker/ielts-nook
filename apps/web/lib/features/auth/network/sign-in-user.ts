import client from "../../../core/client";
import { LoginFormSchema } from "../components/login-form";

async function signInUser(input: LoginFormSchema) {
  const result = await client.POST("/api/user/signIn", {
    body: { email: input.email, password: input.password },
  });

  if (result.error) {
    throw new Error(result.error.error);
  }

  return result.data.data;
}

export default signInUser;
