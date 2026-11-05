import Link from "next/link";
import { Copy } from "@/features/copy/Copy";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
        <p className="text-sm text-gray-600">
          <Copy id="notFound.body" />
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/">
          <Button>Go home</Button>
        </Link>
        <Link href="/search">
          <Button variant="outline">Search products</Button>
        </Link>
      </div>
    </div>
  );
}
