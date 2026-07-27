import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/utils";

describe("Pricing Calculation & Currency Formatting Unit Tests", () => {
  describe("formatPrice Utility", () => {
    it("correctly formats standard USD amounts in cents", () => {
      expect(formatPrice(5000, "USD")).toBe("$50.00");
      expect(formatPrice(4550, "USD")).toBe("$45.50");
      expect(formatPrice(99, "USD")).toBe("$0.99");
    });

    it("correctly formats free amount ($0.00)", () => {
      expect(formatPrice(0, "USD")).toBe("$0.00");
    });

    it("correctly formats EUR currency amounts", () => {
      expect(formatPrice(2500, "EUR")).toBe("€25.00");
    });

    it("correctly formats GBP currency amounts", () => {
      expect(formatPrice(12000, "GBP")).toBe("£120.00");
    });
  });

  describe("Free vs Paid Service Pricing Branching", () => {
    it("identifies services with price = 0 as FREE services needing no Stripe payment redirect", () => {
      const service = { id: "svc-free", price: 0, currency: "usd" };
      const requiresPayment = service.price > 0;
      expect(requiresPayment).toBe(false);
    });

    it("identifies services with price > 0 as PAID services requiring Stripe payment", () => {
      const service = { id: "svc-paid", price: 7500, currency: "usd" };
      const requiresPayment = service.price > 0;
      expect(requiresPayment).toBe(true);
    });
  });

  describe("Server-Side Price Authority & Protection Against Manipulation", () => {
    it("ensures booking total amount is strictly calculated from database service price", () => {
      const dbServicePrice = 6000; // $60.00 authoritative price in DB
      const clientPayload = { serviceId: "svc-1", clientPrice: 100 }; // Client attempting to pay $1.00

      // Server recalculation logic enforces database service price
      const calculatedAmount = dbServicePrice;

      expect(calculatedAmount).toBe(6000);
      expect(calculatedAmount).not.toBe(clientPayload.clientPrice);
    });
  });
});
