import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    organization: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import { isUserSuperAdmin, getSuperAdminEmails } from "@/lib/super-admin";
import { SAAS_PLANS, getPlanDetails, checkOrganizationPlanLimit } from "@/lib/plans";

describe("SaaS Architecture & Super Admin Master Control Unit Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. Super Admin Access Verification", () => {
    it("recognizes super admin via isSuperAdmin database flag", () => {
      expect(isUserSuperAdmin({ id: "u1", email: "user@example.com", isSuperAdmin: true })).toBe(true);
      expect(isUserSuperAdmin({ id: "u2", email: "user@example.com", isSuperAdmin: false })).toBe(false);
      expect(isUserSuperAdmin(null)).toBe(false);
    });

    it("recognizes super admin via SUPER_ADMIN_EMAILS environment variable", () => {
      process.env.SUPER_ADMIN_EMAILS = "ceo@bookora.com, owner@brand.com";

      expect(isUserSuperAdmin({ id: "u3", email: "ceo@bookora.com", isSuperAdmin: false })).toBe(true);
      expect(isUserSuperAdmin({ id: "u4", email: "OWNER@BRAND.COM", isSuperAdmin: false })).toBe(true);
      expect(isUserSuperAdmin({ id: "u5", email: "hacker@test.com", isSuperAdmin: false })).toBe(false);
    });

    it("parses empty or whitespace-rich super admin email lists safely", () => {
      process.env.SUPER_ADMIN_EMAILS = " , , admin@test.com , ";
      const list = getSuperAdminEmails();
      expect(list).toEqual(["admin@test.com"]);
    });
  });

  describe("2. SaaS Plan Definitions & Limit Checks", () => {
    it("returns Free Starter limits correctly", () => {
      const free = getPlanDetails("FREE");
      expect(free.limits.maxServices).toBe(3);
      expect(free.limits.maxStaff).toBe(1);
      expect(free.limits.maxBookingsPerMonth).toBe(50);
      expect(free.limits.googleCalendarSync).toBe(false);
    });

    it("returns Professional plan limits correctly", () => {
      const pro = getPlanDetails("PRO");
      expect(pro.limits.maxServices).toBe(15);
      expect(pro.limits.maxStaff).toBe(5);
      expect(pro.limits.maxBookingsPerMonth).toBe(1000);
      expect(pro.limits.googleCalendarSync).toBe(true);
      expect(pro.priceMonthlyCents).toBe(2900);
      expect(pro.priceYearlyCents).toBe(29000);
    });

    it("returns Enterprise plan limits with unlimited capacity", () => {
      const ent = getPlanDetails("ENTERPRISE");
      expect(ent.limits.maxServices).toBe(999);
      expect(ent.limits.maxStaff).toBe(999);
      expect(ent.limits.maxBookingsPerMonth).toBe(99999);
      expect(ent.limits.googleCalendarSync).toBe(true);
    });

    it("defaults to FREE plan if an unknown plan tier is provided", () => {
      const unknown = getPlanDetails("NON_EXISTENT_PLAN" as any);
      expect(unknown.id).toBe("FREE");
      expect(unknown.limits.maxServices).toBe(3);
    });
  });
});
