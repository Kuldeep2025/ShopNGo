"use client";

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
};

type OrderLite = {
  status: string;
  items: { id: string; listingId: string }[];
};

const REVIEWABLE = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

export function ProductReviews({ listingId }: { listingId: string }) {
  const { appUser, getIdToken } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [orderItemId, setOrderItemId] = useState<string | null>(null);
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?listingId=${encodeURIComponent(listingId)}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews ?? []);
      }
    } catch {
      /* reviews are optional content */
    }
    setLoaded(true);
  }, [listingId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (!appUser) {
      setOrderItemId(null);
      return;
    }
    (async () => {
      const res = await apiCall<{ orders?: OrderLite[] }>(getIdToken, "/api/orders");
      const match = res.data.orders
        ?.filter((o) => REVIEWABLE.includes(o.status))
        .flatMap((o) => o.items)
        .find((i) => i.listingId === listingId);
      setOrderItemId(match?.id ?? null);
    })();
  }, [appUser, getIdToken, listingId]);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderItemId) return;
    setBusy(true);
    setFeedback(null);
    const res = await apiCall(getIdToken, "/api/reviews", {
      method: "POST",
      body: {
        listingId,
        orderItemId,
        rating: Number(rating),
        title: title.trim() || null,
        body: body.trim() || null,
      },
    });
    setBusy(false);
    if (res.ok) {
      setFeedback({ kind: "success", text: "Thank you. Your review was posted." });
      setTitle("");
      setBody("");
      setOrderItemId(null);
      loadReviews();
    } else {
      setFeedback({ kind: "error", text: res.data.error ?? "Could not post your review." });
    }
  }

  const average = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

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
      {loaded && reviews.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">No reviews yet.</p>
      )}
      {reviews.length > 0 && (
        <ul className="mt-4 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium text-gray-900">
                <span className="sr-only">Rating: </span>
                {r.rating} out of 5{r.title ? `: ${r.title}` : ""}
              </p>
              {r.body && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{r.body}</p>}
              <p className="mt-2 text-xs text-gray-500">
                {r.author} on {new Date(r.createdAt).toLocaleDateString("en-IN")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {orderItemId && (
        <form onSubmit={submit} className="mt-6 max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">Write a review</h3>
          <FormField label="Rating (1 to 5)" required>
            {({ id, describedBy }) => (
              <select
                id={id}
                aria-describedby={describedBy}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} out of 5
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField label="Title">
            {({ id, describedBy }) => (
              <Input id={id} aria-describedby={describedBy} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
            )}
          </FormField>
          <FormField label="Your review">
            {({ id, describedBy }) => (
              <Textarea id={id} aria-describedby={describedBy} maxLength={2000} rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            )}
          </FormField>
          <Button type="submit" loading={busy}>
            Post review
          </Button>
        </form>
      )}
      {feedback && (
        <Alert variant={feedback.kind} className="mt-4">
          {feedback.text}
        </Alert>
      )}
    </section>
  );
}
