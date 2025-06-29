import { Static, Type } from "@sinclair/typebox";

export const UploadWritingImageInputSchema = Type.Object(
  {
    id: Type.String(),
    fileName: Type.String(),
    file: Type.Any(),
  },
  { $id: "UploadWritingImageInput" },
);

export type UploadWritingImageInput = Static<
  typeof UploadWritingImageInputSchema
>;
