import { describe, it, expect } from "vitest";
import { computeEffectivePrice } from "./effectivePrice";
import { resolvePricing, istLocalToIso, isoToIstLocal } from "./resolve";

const base = { price: "800.00", mrp: "1000.00", saleEnabled: true, salePrice: "600.00" };
const start = new Date("2026-11-10T00:00:00+05:30");
const end = new Date("2026-11-12T00:00:00+05:30");

describe("effective price", () => {
  it("charges the regular price when no sale", () => {
    const e = computeEffectivePrice({ price: "800.00", mrp: "1000.00" });
    expect(e.unitPrice).toBe("800.00");
    expect(e.onSale).toBe(false);
    expect(e.percentOff).toBe(20);
    expect(e.strikePrice).toBe("1000.00");
  });
  it("uses the sale price inside the window and the regular price outside it", () => {
    const f = { ...base, saleStartsAt: start, saleEndsAt: end };
    expect(computeEffectivePrice(f, new Date("2026-11-09T12:00:00Z")).unitPrice).toBe("800.00");
    expect(computeEffectivePrice(f, new Date("2026-11-09T12:00:00Z")).saleUpcoming).toBe(true);
    const on = computeEffectivePrice(f, new Date("2026-11-10T12:00:00Z"));
    expect(on.unitPrice).toBe("600.00");
    expect(on.onSale).toBe(true);
    expect(on.percentOff).toBe(40);
    expect(on.saleEndsAt).toBe(end.toISOString());
    expect(computeEffectivePrice(f, end).unitPrice).toBe("800.00");
  });
  it("ignores a disabled sale and a sale price that is not lower", () => {
    expect(computeEffectivePrice({ ...base, saleEnabled: false }).unitPrice).toBe("800.00");
    expect(computeEffectivePrice({ ...base, salePrice: "900.00" }).unitPrice).toBe("800.00");
  });
  it("works with open-ended windows", () => {
    expect(computeEffectivePrice(base, new Date()).unitPrice).toBe("600.00");
  });
});

describe("seller pricing validation", () => {
  it("rejects sale above MRP, discount over 90 and end before start", () => {
    expect(resolvePricing({ price: 800, mrp: 1000, saleEnabled: true, salePrice: 1200 }).ok).toBe(false);
    expect(resolvePricing({ price: 800, mrp: 1000, saleEnabled: true, salePercent: 95 }).ok).toBe(false);
    expect(resolvePricing({ price: 800, mrp: 1000, saleEnabled: true, salePercent: 0 }).ok).toBe(false);
    expect(resolvePricing({ price: 800, mrp: 1000, saleEnabled: true, salePrice: 600, saleStartsAt: "2026-11-12T00:00:00Z", saleEndsAt: "2026-11-10T00:00:00Z" }).ok).toBe(false);
    expect(resolvePricing({ price: 1200, mrp: 1000 }).ok).toBe(false);
  });
  it("works out the sale price from a percent", () => {
    const r = resolvePricing({ price: 800, mrp: 1000, saleEnabled: true, salePercent: 40 });
    expect(r.ok && r.data.salePrice).toBe("600.00");
  });
  it("converts India time to an instant and back", () => {
    expect(istLocalToIso("2026-11-10T18:30")).toBe("2026-11-10T13:00:00.000Z");
    expect(isoToIstLocal("2026-11-10T13:00:00.000Z")).toBe("2026-11-10T18:30");
  });
});
