import { describe, it, expect } from "vitest";
import { checkSend, phaseOf, partnerContactVisible, isDeliveredPurchase, PAUSED_TEXT, safeDisplayName } from "./rules";
import { normaliseIndianPhone } from "@/features/delivery/phone";

const send = (o: Partial<Parameters<typeof checkSend>[0]>) =>
  checkSend({ sender: "CUSTOMER", phase: null, customerHasInDeliveryOrder: false, topic: "PRESALE", body: "hello", ...o });

describe("phase of an order item", () => {
  it("maps order and delivery states", () => {
    expect(phaseOf({ orderStatus: "PAID", sellerOrderStatus: "PROCESSING", deliveryStatus: null })).toBe("BEFORE_DELIVERY");
    expect(phaseOf({ orderStatus: "PAID", sellerOrderStatus: "PROCESSING", deliveryStatus: "ASSIGNED" })).toBe("IN_DELIVERY");
    expect(phaseOf({ orderStatus: "PAID", sellerOrderStatus: "SHIPPED", deliveryStatus: "PICKED_UP" })).toBe("IN_DELIVERY");
    expect(phaseOf({ orderStatus: "DELIVERED", sellerOrderStatus: "DELIVERED", deliveryStatus: "DELIVERED" })).toBe("DELIVERED");
    expect(phaseOf({ orderStatus: "CANCELLED", sellerOrderStatus: null, deliveryStatus: null })).toBe("CLOSED");
  });
  it("only a delivered item counts as a purchase for reviews", () => {
    expect(isDeliveredPurchase({ orderStatus: "DELIVERED", sellerOrderStatus: "DELIVERED", deliveryStatus: "DELIVERED" })).toBe(true);
    expect(isDeliveredPurchase({ orderStatus: "PAID", sellerOrderStatus: "SHIPPED", deliveryStatus: "PICKED_UP" })).toBe(false);
    expect(isDeliveredPurchase({ orderStatus: "PAID", sellerOrderStatus: "PROCESSING", deliveryStatus: null })).toBe(false);
  });
  it("partner contact is only visible while delivery is active", () => {
    expect(partnerContactVisible("ASSIGNED")).toBe(true);
    expect(partnerContactVisible("PICKED_UP")).toBe(true);
    expect(partnerContactVisible("DELIVERED")).toBe(false);
    expect(partnerContactVisible(null)).toBe(false);
  });
});

describe("messaging permissions by order state", () => {
  it("allows a question before buying, and after ordering before delivery", () => {
    expect(send({}).ok).toBe(true);
    expect(send({ phase: "BEFORE_DELIVERY", topic: "ORDER" }).ok).toBe(true);
  });
  it("is paused during delivery for customer and seller, with the stated text", () => {
    const c = send({ phase: "IN_DELIVERY", topic: "ORDER" });
    expect(c.ok).toBe(false);
    expect(!c.ok && c.reason).toBe(PAUSED_TEXT);
    expect(send({ sender: "SELLER", phase: "IN_DELIVERY", topic: "ORDER", skipTopic: true }).ok).toBe(false);
    expect(send({ phase: null, customerHasInDeliveryOrder: true }).ok).toBe(false);
  });
  it("after delivery needs one of the four topics", () => {
    expect(send({ phase: "DELIVERED", topic: "ISSUE" }).ok).toBe(true);
    expect(send({ phase: "DELIVERED", topic: "WARRANTY" }).ok).toBe(true);
    expect(send({ phase: "DELIVERED", topic: "RETURN" }).ok).toBe(true);
    expect(send({ phase: "DELIVERED", topic: "OTHER" }).ok).toBe(true);
    expect(send({ phase: "DELIVERED", topic: "ORDER" }).ok).toBe(false);
  });
  it("rejects empty and over-long messages", () => {
    expect(send({ body: "   " }).ok).toBe(false);
    expect(send({ body: "a".repeat(1001) }).ok).toBe(false);
    expect(send({ body: "a".repeat(1000) }).ok).toBe(true);
  });
});

describe("privacy and phone", () => {
  it("never shows a phone number or email as a name", () => {
    expect(safeDisplayName("9876543210")).toBe("Customer");
    expect(safeDisplayName("a@b.com")).toBe("Customer");
    expect(safeDisplayName("Asha Verma")).toBe("Asha");
  });
  it("accepts only valid Indian mobile numbers", () => {
    expect(normaliseIndianPhone("98765 43210")).toBe("+919876543210");
    expect(normaliseIndianPhone("+91-98765-43210")).toBe("+919876543210");
    expect(normaliseIndianPhone("12345")).toBeNull();
    expect(normaliseIndianPhone("5876543210")).toBeNull();
  });
});
