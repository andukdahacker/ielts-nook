import { Static, Type } from "@sinclair/typebox";

export const DeleteWritingImageInputSchema = Type.Object(
  {
    id: Type.String(),
    key: Type.String(),
  },
  { $id: "DeleteWritingImageInput" },
);

export type DeleteWritingImageInput = Static<
  typeof DeleteWritingImageInputSchema
>;
