import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-screen h-screen items-center justify-center">
      <Loader2Icon className="animate-spin" />
    </div>
  );
}
