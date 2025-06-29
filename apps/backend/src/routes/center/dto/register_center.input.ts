import { Static, Type } from "@sinclair/typebox";

export const RegisterCenterInputSchema = Type.Object(
  {
    email: Type.String(),
    name: Type.String(),
  },
  { $id: "RegisterCenterInput" },
);

export type RegisterCenterInput = Static<typeof RegisterCenterInputSchema>;
