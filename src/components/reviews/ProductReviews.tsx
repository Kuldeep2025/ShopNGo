"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Button, FormField, Input, Textarea } from "@/components/ui";
import { apiCall } from "@/lib/client/api";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  author: string;
  verified?: boolean;
  mine?: boolean;
};

const starWord = (n: number) => `${n} ${n === 1 ? "star" : "stars"}`;

export function ProductReviews({ listingId }: { listingId: string }) {
  const { firebaseUser, loading: authLoading, getIdToken } = useAuth();
  const signedIn = Boolean(firebaseUser);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const loadReviews = useCallback(async () => {
    const res = await apiCall<{ reviews?: Review[] }>(getIdToken, `/api/reviews?listingId=${encodeURIComponent(listingId)}`);
    if (res.ok) {
      setReviews(res.data.reviews ?? []);
      setLoadError(false);
    } else {
      setLoadError(true);
    }
    setLoaded(true);
  }, [getIdToken, listingId]);

  useEffect(() => {
    if (authLoading) return;
    loadReviews();
  }, [loadReviews, authLoading]);

  const mine = reviews.find((r) => r.mine);
  useEffect(() => {
    // Fill the form with the member's earlier review once, so editing is easy.
    if (mine && !prefilled) {
      setRating(mine.rating);
      setTitle(mine.title ?? "");
      setBody(mine.body ?? "");
      setPrefilled(true);
    }
  }, [mine, prefilled]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess("");
    setError("");
    if (rating < 1) {
      setError("Please choose a star rating from 1 to 5 before posting.");
      return;
    }
    setBusy(true);
    const res = await apiCall<{ updated?: boolean; verified?: boolean }>(getIdToken, "/api/reviews", {
      method: "POST",
      body: { listingId, rating, title: title.trim() || null, body: body.trim() || null },
    });
    setBusy(false);
    if (res.ok) {
      setSuccess(res.data.updated ? "Your review was updated. Thank you." : "Thank you. Your review was posted.");
      setPrefilled(false);
      loadReviews();
    } else if (res.status === 401) {
      setError("Your sign-in has expired. Please sign in again and then post your review.");
    } else {
      setError(res.data.error ?? "Could not post your review. Please try again.");
    }
  }

  const average = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <section className="mt-14" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-xl font-bold text-gray-900">
        Customer reviews
      </h2>
      {average && (
        <p className="mt-1 text-sm text-gray-600">
          Average rating {average} out of 5, from {reviews.length} {reviews.length === 1 ? "review" : "reviews"}.
        </p>
      )}
      {loaded && !loadError && reviews.length === 0 && <p className="mt-3 text-sm text-gray-500">No reviews yet. Be the first to rate this product.</p>}
      {loadError && <p className="mt-3 text-sm text-amber-800">Reviews could not be loaded right now. Please refresh in a moment.</p>}
      {reviews.length > 0 && (
        <ul className="mt-4 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium text-gray-900">
                <span aria-hidden="true" className="mr-1 text-amber-500">
                  {"★".repeat(r.rating)}
                  <span className="text-gray-300">{"★".repeat(5 - r.rating)}</span>
                </span>
                <span className="sr-only">Rating: </span>
                {r.rating} out of 5{r.title ? `: ${r.title}` : ""}
              </p>
              {r.body && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{r.body}</p>}
              <p className="mt-2 text-xs text-gray-500">
                {r.author} on {new Date(r.createdAt).toLocaleDateString("en-IN")}
                {r.verified ? <span className="ml-2 font-semibold text-emerald-800">Verified purchase</span> : null}
                {r.mine ? <span className="ml-2 font-semibold text-teal-800">Your review</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 max-w-lg">
        {authLoading ? null : !signedIn ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="font-semibold text-gray-900">Write a review</h3>
            <p className="mt-1 text-sm text-gray-600">Sign in to rate this product and write a review.</p>
            <Link href="/auth/sign-in" className="mt-3 inline-block">
              <Button>Sign in to review</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5" noValidate>
            <h3 className="font-semibold text-gray-900">{mine ? "Edit your review" : "Write a review"}</h3>
            <p className="text-sm text-gray-600">
              Anyone who is signed in can rate and review. You can change your review later. People who bought this product get a Verified purchase mark.
            </p>
            <fieldset>
              <legend className="text-sm font-medium text-gray-900">
                Your rating, 1 to 5 stars <span aria-hidden="true">*</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className="relative">
                    <input
                      type="radio"
                      name={`rating-${listingId}`}
                      id={`rating-${listingId}-${n}`}
                      value={n}
                      checked={rating === n}
                      onChange={() => setRating(n)}
                      className="peer sr-only"
                      required
                    />
                    <label
                      htmlFor={`rating-${listingId}-${n}`}
                      className="flex h-11 min-w-[3.5rem] cursor-pointer items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600 peer-focus-visible:ring-offset-2"
                    >
                      <span aria-hidden="true" className={rating >= n ? "text-amber-500" : "text-gray-300"}>
                        ★
                      </span>
                      <span>
                        {n}
                        <span className="sr-only"> {n === 1 ? "star" : "stars"}</span>
                      </span>
                    </label>
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500" aria-live="polite">
                {rating ? `Selected: ${starWord(rating)}.` : "Nothing selected yet."}
              </p>
            </fieldset>
            <FormField label="Title (optional)">
              {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />}
            </FormField>
            <FormField label="Your review (optional)">
              {({ id, describedBy }) => (
                <Textarea id={id} aria-describedby={describedBy} maxLength={2000} rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
              )}
            </FormField>
            <Button type="submit" loading={busy}>
              {mine ? "Update review" : "Post review"}
            </Button>
          </form>
        )}
        <div aria-live="polite" role="status" className="mt-4">
          {success && <Alert variant="success">{success}</Alert>}
        </div>
        <div aria-live="assertive">{error && <Alert variant="error">{error}</Alert>}</div>
      </div>
    </section>
  );
}
