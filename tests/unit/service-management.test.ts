import { describe, it, expect, beforeEach, vi } from "vitest";
import { serviceSchema } from "@/lib/validators";
import { getTenantDb } from "@/lib/tenant-db";
import { requirePermission, ForbiddenError } from "@/lib/tenant";
import { createBookingWithTransaction } from "@/lib/booking-transactions";

// Mock database and auth modules
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const mockOrg = { id: "org-123", name: "Test Salon", slug: "test-salon" };

  const mockMembers = [
    { id: "m1", userId: "user-owner", organizationId: "org-123", role: "OWNER", organization: mockOrg },
    { id: "m2", userId: "user-staff", organizationId: "org-123", role: "STAFF", organization: mockOrg },
  ];

  const mockServices = [
    {
      id: "svc-active",
      organizationId: "org-123",
      name: "Haircut",
      slug: "haircut",
      description: "Standard haircut",
      durationMinutes: 30,
      price: 5000,
      currency: "usd",
      bufferBefore: 5,
      bufferAfter: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "svc-inactive",
      organizationId: "org-123",
      name: "Old Treatment",
      slug: "old-treatment",
      description: "Discontinued service",
      durationMinutes: 60,
      price: 10000,
      currency: "usd",
      bufferBefore: 0,
      bufferAfter: 0,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockDb = {
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
        return mockServices.filter((s) => {
          const matchesOrg = s.organizationId === where.organizationId;
          const matchesActive = where.isActive !== undefined ? s.isActive === where.isActive : true;
          return matchesOrg && matchesActive;
        });
      }),
      findFirst: vi.fn(({ where }) => {
        return mockServices.find((s) => {
          const matchesOrg = s.organizationId === where.organizationId;
          const matchesId = where.id ? s.id === where.id : true;
          const matchesSlug = where.slug ? s.slug === where.slug : true;
          const matchesActive = where.isActive !== undefined ? s.isActive === where.isActive : true;
          return matchesOrg && matchesId && matchesSlug && matchesActive;
        });
      }),
      create: vi.fn(({ data }) => {
        const created = { id: `svc-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        mockServices.push(created);
        return created;
      }),
      update: vi.fn(({ where, data }) => {
        const service = mockServices.find((s) => s.id === where.id);
        if (!service) throw new Error("Service not found");
        Object.assign(service, data);
        return service;
      }),
      delete: vi.fn(({ where }) => {
        const idx = mockServices.findIndex((s) => s.id === where.id);
        if (idx !== -1) mockServices.splice(idx, 1);
        return { id: where.id };
      }),
    },
    booking: {
      findMany: vi.fn(() => []),
      create: vi.fn(({ data }) => ({ id: "booking-1", ...data })),
    },
    payment: {
      create: vi.fn(({ data }) => ({ id: "pay-1", ...data })),
    },
    notification: {
      create: vi.fn(({ data }) => ({ id: "notif-1", ...data })),
    },
    $transaction: vi.fn(async (cb) => cb(mockDb)),
  };

  return {
    db: mockDb,
  };
});

describe("Service Management Module Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Zod Validation (serviceSchema)", () => {
    it("accepts a valid service payload", () => {
      const validPayload = {
        name: "Deep Tissue Massage",
        slug: "deep-tissue-massage",
        description: "Relaxing 60-minute massage",
        durationMinutes: 60,
        price: 8500,
        currency: "usd",
        bufferBefore: 10,
        bufferAfter: 15,
        isActive: true,
      };

      const result = serviceSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects service with short name (< 2 chars)", () => {
      const invalidPayload = {
        name: "A",
        slug: "valid-slug",
        durationMinutes: 30,
        price: 5000,
      };

      const result = serviceSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("at least 2 characters");
      }
    });

    it("rejects service with invalid slug format", () => {
      const invalidPayload = {
        name: "Valid Name",
        slug: "Invalid Slug With Spaces!",
        durationMinutes: 30,
        price: 5000,
      };

      const result = serviceSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("rejects duration under 5 minutes", () => {
      const invalidPayload = {
        name: "Quick Check",
        slug: "quick-check",
        durationMinutes: 2,
        price: 1000,
      };

      const result = serviceSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("rejects negative price", () => {
      const invalidPayload = {
        name: "Freebie",
        slug: "freebie",
        durationMinutes: 30,
        price: -500,
      };

      const result = serviceSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("Server-Side Permission Enforcement", () => {
    it("allows OWNER to manage services", async () => {
      const tenant = await requirePermission("org-123", "manage_services", "user-owner");
      expect(tenant.role).toBe("OWNER");
    });

    it("blocks STAFF from managing services", async () => {
      await expect(
        requirePermission("org-123", "manage_services", "user-staff")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Service CRUD Operations (getTenantDb)", () => {
    it("fetches both active and inactive services for management", async () => {
      const tenantDb = getTenantDb("org-123");
      const list = await tenantDb.services.findMany(false);
      expect(list.length).toBeGreaterThanOrEqual(2);
    });

    it("creates a service successfully", async () => {
      const tenantDb = getTenantDb("org-123");
      const created = await tenantDb.services.create({
        name: "Beard Trim",
        slug: "beard-trim",
        durationMinutes: 20,
        price: 3000,
        currency: "usd",
      });

      expect(created.name).toBe("Beard Trim");
      expect(created.durationMinutes).toBe(20);
      expect(created.price).toBe(3000);
    });

    it("updates service price, duration, and toggle active status", async () => {
      const tenantDb = getTenantDb("org-123");
      const updated = await tenantDb.services.update("svc-active", {
        price: 6500,
        durationMinutes: 45,
        isActive: false,
      });

      expect(updated.price).toBe(6500);
      expect(updated.durationMinutes).toBe(45);
      expect(updated.isActive).toBe(false);
    });

    it("deletes a service", async () => {
      const tenantDb = getTenantDb("org-123");
      await tenantDb.services.delete("svc-inactive");
      const found = await tenantDb.services.findById("svc-inactive");
      expect(found).toBeUndefined();
    });
  });

  describe("Inactive Service Booking Restriction", () => {
    it("bars booking attempts for inactive services", async () => {
      await expect(
        createBookingWithTransaction({
          organizationId: "org-123",
          serviceId: "svc-inactive", // Inactive service
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          startAt: new Date(),
          endAt: new Date(Date.now() + 3600000),
        })
      ).rejects.toThrow("Service not found or inactive for this organization.");
    });
  });
});
