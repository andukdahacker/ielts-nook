import client from "../../../core/client";

async function getUserList(cursor: string, searchString: string) {
  const result = await client.GET("/api/user/list", {
    params: {
      query: {
        take: 20,
        cursor: cursor == "" ? undefined : cursor,
        searchString: searchString == "" ? undefined : searchString,
      },
    },
  });

  if (result.error) {
    throw new Error(result.error.error);
  }

  return result.data.data;
}

export default getUserList;
