import { signInWithEmailAndPassword } from "firebase/auth";
import client from "../../../core/client";
import { firebaseAuth } from "../../../core/firebase";
import { LoginFormSchema } from "../components/login-form";

async function signInCenter(input: LoginFormSchema) {
  const { email, password } = input;
  await signInWithEmailAndPassword(firebaseAuth, email, password);

  const idToken = await firebaseAuth.currentUser?.getIdToken();

  if (!idToken) {
    throw new Error("Failed to sign in");
  }

  const result = await client.POST("/api/center/signIn", {
    body: { idToken },
  });

  if (result.error) {
    throw new Error(result.error.error);
  }

  return result.data.data;
}

export default signInCenter;
