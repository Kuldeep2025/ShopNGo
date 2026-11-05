/**
 * Who may message whom, and when, mapped to the real order and delivery states.
 *
 * Order and seller-order statuses: PENDING_PAYMENT, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED.
 * Delivery statuses: ASSIGNED (partner accepted), PICKED_UP (out for delivery), DELIVERED, CANCELLED.
 *
 * Phases of an ordered item:
 *  BEFORE_DELIVERY  placed, paid, being prepared: messaging is open.
 *  IN_DELIVERY      a partner has accepted or picked up the order, or it is marked shipped: messaging is paused.
 *  DELIVERED        delivered: messaging is open again for issues, warranty, returns.
 *  CLOSED           cancelled or refunded: messaging stays open for refund questions.
 */

export type Phase = "BEFORE_DELIVERY" | "IN_DELIVERY" | "DELIVERED" | "CLOSED";
export type Sender = "CUSTOMER" | "SELLER";

export const TOPICS = ["PRESALE", "ORDER", "ISSUE", "WARRANTY", "RETURN", "OTHER"] as const;
export type Topic = (typeof TOPICS)[number];

/** Topics a customer may choose after delivery. */
export const AFTER_DELIVERY_TOPICS: { value: Topic; label: string }[] = [
  { value: "ISSUE", label: "Issue with product" },
  { value: "WARRANTY", label: "Warranty or guarantee" },
  { value: "RETURN", label: "Return or refund" },
  { value: "OTHER", label: "Other" },
];

export const TOPIC_LABEL: Record<string, string> = {
  PRESALE: "Question before buying",
  ORDER: "About my order",
  ISSUE: "Issue with product",
  WARRANTY: "Warranty or guarantee",
  RETURN: "Return or refund",
  OTHER: "Other",
};

export const PAUSED_TEXT =
  "Messaging is paused while your order is being delivered. You can contact the delivery partner instead.";
export const PAUSED_TEXT_SELLER =
  "Messaging is paused while this order is being delivered. You can reply again after it is delivered.";
export const REVIEW_GATE_TEXT = "You can review this product after it is delivered to you.";

export const MAX_MESSAGE_LENGTH = 1000;
export const MESSAGES_PER_MINUTE = 10;

export type PhaseInput = {
  orderStatus: string;
  sellerOrderStatus?: string | null;
  deliveryStatus?: string | null;
};

export function phaseOf(i: PhaseInput): Phase {
  if (i.orderStatus === "CANCELLED" || i.orderStatus === "REFUNDED") return "CLOSED";
  if (i.sellerOrderStatus === "CANCELLED") return "CLOSED";
  if (i.deliveryStatus === "DELIVERED" || i.sellerOrderStatus === "DELIVERED" || i.orderStatus === "DELIVERED") {
    return "DELIVERED";
  }
  if (
    i.deliveryStatus === "ASSIGNED" ||
    i.deliveryStatus === "PICKED_UP" ||
    i.sellerOrderStatus === "SHIPPED" ||
    i.orderStatus === "SHIPPED"
  ) {
    return "IN_DELIVERY";
  }
  return "BEFORE_DELIVERY";
}

/** A delivered purchase: the only thing that allows a review. */
export function isDeliveredPurchase(i: PhaseInput): boolean {
  return phaseOf(i) === "DELIVERED";
}

/** True when the delivery partner's name and number may be shown to the customer. */
export function partnerContactVisible(deliveryStatus: string | null | undefined): boolean {
  return deliveryStatus === "ASSIGNED" || deliveryStatus === "PICKED_UP";
}

export type SendCheck = { ok: true } | { ok: false; code: "PAUSED" | "BAD_TOPIC" | "EMPTY" | "TOO_LONG"; reason: string };

export type SendInput = {
  sender: Sender;
  /** Phase of the ordered item the thread is about, or null for a question before buying. */
  phase: Phase | null;
  /** For a thread with no order: does the customer have an order for this product that is out for delivery? */
  customerHasInDeliveryOrder?: boolean;
  topic: string;
  body: string;
  /** Replies in an existing thread do not choose a topic again. */
  skipTopic?: boolean;
};

export function checkSend(i: SendInput): SendCheck {
  const text = i.body.trim();
  if (!text) return { ok: false, code: "EMPTY", reason: "Write a message first." };
  if (text.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, code: "TOO_LONG", reason: `Messages can be at most ${MAX_MESSAGE_LENGTH} characters.` };
  }
  const paused = i.phase === "IN_DELIVERY" || (i.phase === null && Boolean(i.customerHasInDeliveryOrder));
  if (paused) {
    return { ok: false, code: "PAUSED", reason: i.sender === "CUSTOMER" ? PAUSED_TEXT : PAUSED_TEXT_SELLER };
  }
  if (i.sender === "CUSTOMER" && !i.skipTopic) {
    if (i.phase === null && i.topic !== "PRESALE") {
      return { ok: false, code: "BAD_TOPIC", reason: "Choose a valid topic." };
    }
    if (i.phase === "BEFORE_DELIVERY" && i.topic !== "ORDER") {
      return { ok: false, code: "BAD_TOPIC", reason: "Choose a valid topic." };
    }
    if (i.phase === "DELIVERED" && !AFTER_DELIVERY_TOPICS.some((t) => t.value === i.topic)) {
      return { ok: false, code: "BAD_TOPIC", reason: "Choose what your message is about." };
    }
    if (i.phase === "CLOSED" && !["OTHER", "RETURN"].includes(i.topic)) {
      return { ok: false, code: "BAD_TOPIC", reason: "Choose a valid topic." };
    }
  }
  return { ok: true };
}

/** Topic the server uses when the customer sends no topic for the given phase. */
export function defaultTopic(phase: Phase | null): Topic {
  if (phase === null) return "PRESALE";
  if (phase === "BEFORE_DELIVERY") return "ORDER";
  return "OTHER";
}

/** What the customer's order page should offer for one item. */
export type ItemMessaging = {
  phase: Phase;
  canMessage: boolean;
  paused: boolean;
  /** "issue" button label applies after delivery */
  afterDelivery: boolean;
};

export function itemMessaging(phase: Phase): ItemMessaging {
  return {
    phase,
    canMessage: phase !== "IN_DELIVERY",
    paused: phase === "IN_DELIVERY",
    afterDelivery: phase === "DELIVERED",
  };
}

/** Never show a phone number or email as a person's name. */
export function safeDisplayName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n || n.includes("@") || /^[+\d\s\-()]{6,}$/.test(n)) return "Customer";
  return n.split(/\s+/)[0]!.slice(0, 40);
}

export function threadKeyOf(p: { customerId: string; storeId: string; listingId: string | null; orderItemId: string | null; topic: string }): string {
  return [p.customerId, p.storeId, p.listingId ?? "-", p.orderItemId ?? "-", p.orderItemId ? p.topic : "PRESALE"].join("|");
}
