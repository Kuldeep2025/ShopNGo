export type FulfillmentStatus = "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED";

const NEXT_FULFILLMENT_STATUS: Record<FulfillmentStatus, FulfillmentStatus | null> = {
  PAID: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
  DELIVERED: null,
};

export function getNextFulfillmentStatus(status: string): FulfillmentStatus | null {
  return status in NEXT_FULFILLMENT_STATUS
    ? NEXT_FULFILLMENT_STATUS[status as FulfillmentStatus]
    : null;
}

export function getAggregateFulfillmentStatus(statuses: string[]): FulfillmentStatus | null {
  if (statuses.length === 0 || statuses.some((status) => !(status in NEXT_FULFILLMENT_STATUS))) {
    return null;
  }
  const rank: Record<FulfillmentStatus, number> = {
    PAID: 0,
    PROCESSING: 1,
    SHIPPED: 2,
    DELIVERED: 3,
  };
  if (statuses.every((status) => rank[status as FulfillmentStatus] >= rank.DELIVERED)) return "DELIVERED";
  if (statuses.every((status) => rank[status as FulfillmentStatus] >= rank.SHIPPED)) return "SHIPPED";
  if (statuses.every((status) => rank[status as FulfillmentStatus] >= rank.PROCESSING)) return "PROCESSING";
  return null;
}
