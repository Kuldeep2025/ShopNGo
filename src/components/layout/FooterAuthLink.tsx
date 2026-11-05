"use client";

import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";

/** Footer "Sign in" link that turns into "Sign out" once someone is signed in. */
export function FooterAuthLink() {
  const { firebaseUser, appUser, loading, signOut } = useAuth();
  const signedIn = Boolean(firebaseUser || appUser);
  if (signedIn) {
    return (
      <button
        type="button"
        onClick={() => signOut()}
        className="text-left hover:text-teal-700 dark:hover:text-teal-400"
      >
        Sign out
      </button>
    );
  }
  if (loading) return <span aria-hidden="true">&nbsp;</span>;
  return (
    <Link href="/auth/sign-in" className="hover:text-teal-700 dark:hover:text-teal-400">
      Sign in
    </Link>
  );
}
