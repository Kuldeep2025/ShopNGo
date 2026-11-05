import Link from "next/link";
import { Copy } from "@/features/copy/Copy";
import { Alert } from "@/components/ui";

export const metadata = {
  title: "Access denied",
};

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <Alert variant="warning" title="Access denied">
        <Copy id="forbidden.body" />
      </Alert>
      <div className="flex flex-wrap justify-center gap-3">
        <Link className="inline-flex h-10 items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-600" href="/auth/sign-in">Sign in</Link>
        <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50" href="/">Back to home</Link>
      </div>
    </div>
  );
}
