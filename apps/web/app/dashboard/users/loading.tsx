import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Skeleton className="h-4 w-10 rounded-xl" />
      <Skeleton className="rounded-xl w-full h-80" />
    </div>
  );
}
