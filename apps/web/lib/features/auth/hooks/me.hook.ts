import { useQuery } from "@tanstack/react-query";
import me from "../network/me";

function useMe() {
  const query = useQuery({
    queryKey: ["me"],
    queryFn: me,
  });

  return query;
}

export default useMe;
