import client from "@/lib/core/client";
import { firebaseAuth } from "@/lib/core/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const googleSignInResult = await signInWithPopup(firebaseAuth, provider);
  const user = googleSignInResult.user;

  const idToken = await user.getIdToken();

  const result = await client.POST("/api/center/signIn", {
    body: { idToken },
  });

  if (result.error) {
    throw new Error(result.error.error);
  }

  return result.data.data;
}
