import { Static, Type } from "@sinclair/typebox";

export const SignInUserInputSchema = Type.Object(
  {
    email: Type.String(),
    password: Type.String(),
  },
  {
    $id: "SignInUserInput",
  },
);

export type SignInUserInput = Static<typeof SignInUserInputSchema>;
