import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  requireOrganizationAccess,
  requireOrganizationRole,
  requirePermission,
  ForbiddenError,
} from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { db } from "@/lib/db";

// Mock auth singleton to avoid next-auth ESM/CJS resolution issues in Vitest
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock database singleton for unit isolation testing
vi.mock("@/lib/db", () => {
  const mockOrgA = { id: "org-a-id", name: "Org Alpha", slug: "org-alpha" };
  const mockOrgB = { id: "org-b-id", name: "Org Beta", slug: "org-beta" };

  const mockMembers = [
    // User 1 is OWNER of Org Alpha
    { id: "m1", userId: "user-1", organizationId: "org-a-id", role: "OWNER", organization: mockOrgA },
    // User 2 is STAFF of Org Alpha
    { id: "m2", userId: "user-2", organizationId: "org-a-id", role: "STAFF", organization: mockOrgA },
    // User 3 is OWNER of Org Beta
    { id: "m3", userId: "user-3", organizationId: "org-b-id", role: "OWNER", organization: mockOrgB },
  ];

  const mockServices = [
    { id: "service-a1", organizationId: "org-a-id", name: "Alpha Service", slug: "alpha-svc", price: 5000, duration: 30, isActive: true },
    { id: "service-b1", organizationId: "org-b-id", name: "Beta Service", slug: "beta-svc", price: 10000, duration: 60, isActive: true },
  ];

  const mockBookings = [
    { id: "booking-a1", organizationId: "org-a-id", serviceId: "service-a1", customerName: "Customer A", status: "CONFIRMED" },
    { id: "booking-b1", organizationId: "org-b-id", serviceId: "service-b1", customerName: "Customer B", status: "PENDING" },
  ];

  return {
    db: {
      organizationMember: {
        findFirst: vi.fn(({ where }) => {
          return mockMembers.find((m) => {
            const matchesUser = m.userId === where.userId;
            const target = where.organization?.OR?.[0]?.id || where.organization?.OR?.[1]?.slug;
            const matchesOrg = target
              ? m.organization.id === target || m.organization.slug === target
              : true;
            return matchesUser && matchesOrg;
          });
        }),
      },
      service: {
        findMany: vi.fn(({ where }) => {
          return mockServices.filter((s) => s.organizationId === where.organizationId);
        }),
        findFirst: vi.fn(({ where }) => {
          return mockServices.find((s) => {
            const matchesOrg = s.organizationId === where.organizationId;
            const matchesId = where.id ? s.id === where.id : true;
            const matchesSlug = where.slug ? s.slug === where.slug : true;
            return matchesOrg && matchesId && matchesSlug;
          });
        }),
        update: vi.fn(({ where, data }) => {
          const service = mockServices.find((s) => s.id === where.id);
          if (!service) throw new Error("Service not found");
          Object.assign(service, data);
          return service;
        }),
      },
      booking: {
        findMany: vi.fn(({ where }) => {
          return mockBookings.filter((b) => b.organizationId === where.organizationId);
        }),
        findFirst: vi.fn(({ where }) => {
          return mockBookings.find((b) => b.id === where.id && b.organizationId === where.organizationId);
        }),
      },
    },
  };
});

describe("Multi-Tenant Isolation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tenant Access Isolation", () => {
    it("allows User 1 (Member of Org Alpha) to access Org Alpha", async () => {
      const tenant = await requireOrganizationAccess("org-alpha", undefined, "user-1");
      expect(tenant.organizationId).toBe("org-a-id");
      expect(tenant.slug).toBe("org-alpha");
      expect(tenant.role).toBe("OWNER");
    });

    it("DENIES User 1 (Org Alpha Owner) access to Org Beta", async () => {
      await expect(
        requireOrganizationAccess("org-beta", undefined, "user-1")
      ).rejects.toThrow(ForbiddenError);
    });

    it("DENIES User 3 (Org Beta Owner) access to Org Alpha", async () => {
      await expect(
        requireOrganizationAccess("org-alpha", undefined, "user-3")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Database Query Isolation (getTenantDb)", () => {
    it("guarantees Org Alpha tenant database queries ONLY return Org Alpha services", async () => {
      const tenantDb = getTenantDb("org-a-id");
      const services = await tenantDb.services.findMany();

      expect(services).toHaveLength(1);
      expect(services[0].id).toBe("service-a1");
      expect(services[0].name).toBe("Alpha Service");
    });

    it("guarantees Org Beta tenant database queries ONLY return Org Beta services", async () => {
      const tenantDb = getTenantDb("org-b-id");
      const services = await tenantDb.services.findMany();

      expect(services).toHaveLength(1);
      expect(services[0].id).toBe("service-b1");
      expect(services[0].name).toBe("Beta Service");
    });

    it("PREVENTS Org Alpha tenant client from accessing Org Beta service by ID", async () => {
      const tenantDb = getTenantDb("org-a-id");
      const service = await tenantDb.services.findById("service-b1"); // Belongs to Org B

      expect(service).toBeUndefined();
    });

    it("PREVENTS Org Alpha tenant client from updating Org Beta service", async () => {
      const tenantDb = getTenantDb("org-a-id");
      await expect(
        tenantDb.services.update("service-b1", { name: "Hacked Service" })
      ).rejects.toThrow("Service not found in this organization.");
    });

    it("PREVENTS Org Alpha tenant client from accessing Org Beta bookings", async () => {
      const tenantDb = getTenantDb("org-a-id");
      const booking = await tenantDb.bookings.findById("booking-b1"); // Belongs to Org B
      expect(booking).toBeUndefined();
    });

    it("PREVENTS Org Alpha tenant client from modifying Org Beta booking staff", async () => {
      const tenantDb = getTenantDb("org-a-id");
      await expect(
        tenantDb.bookings.assignStaff("booking-b1", "m1")
      ).rejects.toThrow("Booking not found in this organization.");
    });
  });

  describe("Role-Based Permission Enforcement", () => {
    it("allows OWNER of Org Alpha to execute owner-level actions", async () => {
      const tenant = await requirePermission("org-alpha", "delete_organization", "user-1");
      expect(tenant.role).toBe("OWNER");
    });

    it("REJECTS STAFF member of Org Alpha from executing owner-level actions", async () => {
      await expect(
        requirePermission("org-alpha", "delete_organization", "user-2") // User 2 is STAFF
      ).rejects.toThrow(ForbiddenError);
    });

    it("REJECTS STAFF member of Org Alpha from managing services (Requires OWNER or ADMIN)", async () => {
      await expect(
        requireOrganizationRole("org-alpha", ["OWNER", "ADMIN"], "user-2")
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
