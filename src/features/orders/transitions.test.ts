import { describe, expect, it } from "vitest";
import { getAggregateFulfillmentStatus, getNextFulfillmentStatus } from "./transitions";

describe("seller fulfillment transitions", () => {
  it.each([
    ["PAID", "PROCESSING"],
    ["PROCESSING", "SHIPPED"],
    ["SHIPPED", "DELIVERED"],
  ])("allows only %s → %s", (from, to) => {
    expect(getNextFulfillmentStatus(from)).toBe(to);
  });

  it.each(["PENDING_PAYMENT", "CANCELLED", "REFUNDED", "DELIVERED", "UNKNOWN"])(
    "does not allow a transition from %s",
    (status) => expect(getNextFulfillmentStatus(status)).toBeNull()
  );

  it("advances a parent only when every seller order has reached that stage", () => {
    expect(getAggregateFulfillmentStatus(["PROCESSING", "PAID"])).toBeNull();
    expect(getAggregateFulfillmentStatus(["PROCESSING", "PROCESSING"])).toBe("PROCESSING");
    expect(getAggregateFulfillmentStatus(["SHIPPED", "DELIVERED"])).toBe("SHIPPED");
    expect(getAggregateFulfillmentStatus(["DELIVERED", "DELIVERED"])).toBe("DELIVERED");
  });

  it("does not aggregate empty or terminal non-fulfillment states", () => {
    expect(getAggregateFulfillmentStatus([])).toBeNull();
    expect(getAggregateFulfillmentStatus(["PAID", "CANCELLED"])).toBeNull();
  });
});
