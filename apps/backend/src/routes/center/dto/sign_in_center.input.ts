import { Static, Type } from "@sinclair/typebox";

export const SignInCenterInputSchema = Type.Object(
  {
    idToken: Type.String(),
  },
  { $id: "SignInCenterInput" },
);

export type SignInCenterInput = Static<typeof SignInCenterInputSchema>;
