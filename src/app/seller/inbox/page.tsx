import { Suspense } from "react";
import { MessagesCenter } from "@/features/messaging/ui/MessagesCenter";

export const metadata = { title: "Seller inbox | ShopNGo" };

export default function SellerInboxPage() {
  return (
    <Suspense fallback={null}>
      <MessagesCenter as="seller" />
    </Suspense>
  );
}
