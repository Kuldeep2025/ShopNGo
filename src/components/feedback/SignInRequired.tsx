import Link from "next/link";
import { Button } from "@/components/ui";

type Props = {
  title?: string;
  message?: string;
  className?: string;
};

export function SignInRequired({
  title = "Sign in required",
  message = "Sign in to continue. Your cart, orders, and saved addresses stay with your account.",
  className = "",
}: Props) {
  return (
    <div
      className={`mx-auto max-w-md px-4 py-16 text-center sm:px-6 ${className}`}
      role="status"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
      <h1 className="mt-5 text-xl font-bold text-gray-900 sm:text-2xl">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
        {message}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/auth/sign-in">
          <Button
            size="lg"
            className="min-w-[140px] bg-teal-600 text-base font-semibold shadow-md shadow-teal-700/20 hover:bg-teal-500"
          >
            Sign in
          </Button>
        </Link>
        <Link href="/search">
          <Button size="lg" variant="outline">
            Continue shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
