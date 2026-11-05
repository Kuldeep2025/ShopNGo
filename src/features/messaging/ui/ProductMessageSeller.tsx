"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Button } from "@/components/ui";
import { MessageComposer } from "./MessageComposer";

/** "Message the seller" on a product page: a question before buying. Signed-out visitors are asked to sign in. */
export function ProductMessageSeller({ listingId, storeName }: { listingId: string; storeName: string }) {
  const { appUser, loading } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!appUser) setOpen(false); }, [appUser]);
  if (loading) return null;

  return (
    <section aria-labelledby="pms-h" className="mt-8">
      <h2 id="pms-h" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Questions about this product</h2>
      {!appUser ? (
        <p className="mt-2 text-sm text-gray-700 dark:text-zinc-300">
          <Link className="text-teal-700 underline dark:text-teal-400" href="/auth/sign-in">Sign in</Link> to message {storeName}.
        </p>
      ) : (
        <>
          <Button className="mt-2" variant="outline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            Message the seller
          </Button>
          {open && <MessageComposer listingId={listingId} heading={`Ask ${storeName} a question`} />}
        </>
      )}
    </section>
  );
}
