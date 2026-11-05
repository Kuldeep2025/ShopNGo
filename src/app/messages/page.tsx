import { Suspense } from "react";
import { MessagesCenter } from "@/features/messaging/ui/MessagesCenter";

export const metadata = { title: "Messages | ShopNGo" };

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesCenter as="customer" />
    </Suspense>
  );
}
