import { Static, Type } from "@sinclair/typebox";

export const UploadListeningFileInputSchema = Type.Object(
  {
    id: Type.String(),
    fileName: Type.String(),
    file: Type.Any(),
  },
  {
    $id: "UploadListeningFileInput",
  },
);

export type UploadListeningFileInput = Static<
  typeof UploadListeningFileInputSchema
>;
