import { Spinner } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner size="lg" label="Loading page" />
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  );
}
