import { Static, Type } from "@sinclair/typebox";

export const DeleteListeningFileInputSchema = Type.Object(
  {
    id: Type.String(),
    key: Type.String(),
  },
  { $id: "DeleteListeningFileInput" },
);

export type DeleteListeningFileInput = Static<
  typeof DeleteListeningFileInputSchema
>;
