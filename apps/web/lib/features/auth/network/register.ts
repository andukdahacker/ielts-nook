import { createUserWithEmailAndPassword } from "firebase/auth";
import client from "../../../core/client";
import { firebaseAuth } from "../../../core/firebase";
import { SignUpFormSchema } from "../components/sign-up-form";

async function register(input: SignUpFormSchema) {
  const userCredentials = await createUserWithEmailAndPassword(
    firebaseAuth,
    input.email,
    input.password,
  );
  const result = await client.POST("/api/center/register", {
    body: { email: input.email, name: "" },
  });

  if (result.error) {
    throw new Error(result.error.error);
  }

  return {
    center: result.data.data,
    shouldVerifyEmail: !userCredentials.user.emailVerified,
  };
}

export default register;
