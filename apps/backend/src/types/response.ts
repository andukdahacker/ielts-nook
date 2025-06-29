import { Static, TSchema, Type } from "@sinclair/typebox";

export interface BaseResponseSchemaOpts {
  $id?: string;
}

export const BaseResponseSchema = <T extends TSchema>(
  schema: T,
  opts?: BaseResponseSchemaOpts,
) =>
  Type.Object(
    {
      data: schema,
      message: Type.String(),
    },
    { $id: opts?.$id },
  );

export const NoDataResponseSchema = Type.Object({
  message: Type.String(),
});

export type NoDataResponse = Static<typeof NoDataResponseSchema>;

export const BaseResponseErrorSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
});

export const PageInfoSchema = Type.Object({
  hasNextPage: Type.Boolean(),
  cursor: Type.Optional(Type.String()),
});

export const PaginatedBaseReponseSchema = <T extends TSchema>(schema: T) =>
  Type.Object({
    data: Type.Optional(
      Type.Object({
        nodes: Type.Array(schema),
        pageInfo: PageInfoSchema,
      }),
    ),
    message: Type.String(),
  });
