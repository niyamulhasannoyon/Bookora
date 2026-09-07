import { describe, it, expect, beforeEach, vi } from "vitest";
import { organizationSchema } from "@/lib/validators";
import {
  createOrganizationAction,
  updateOrganizationAction,
  getOrganizationAction,
} from "@/actions/organization";
import { db } from "@/lib/db";
import * as authModule from "@/lib/auth";

// Mock next/cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth module
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
  getCurrentUser: vi.fn(),
  auth: vi.fn(),
}));

// Mock database
vi.mock("@/lib/db", () => {
  const mockOrgs: any[] = [
    {
      id: "org-1",
      name: "Alpha Studio",
      slug: "alpha-studio",
      bio: "Premier studio",
      timezone: "America/New_York",
      logo: null,
      members: [],
    },
  ];

  const mockMembers: any[] = [
    {
      id: "mem-1",
      userId: "user-1",
      organizationId: "org-1",
      role: "OWNER",
      organization: mockOrgs[0],
    },
  ];

  const mockAvailabilities: any[] = [];

  return {
    db: {
      organization: {
        findUnique: vi.fn(({ where }) => {
          return mockOrgs.find((o) => o.id === where.id || o.slug === where.slug) || null;
        }),
        findFirst: vi.fn(({ where }) => {
          if (!where) return mockOrgs[0] || null;
          return mockOrgs.find((o) => {
            if (where.slug) return o.slug === where.slug;
            if (where.OR) {
              return where.OR.some((cond: any) => o.id === cond.id || o.slug === cond.slug);
            }
            return false;
          }) || null;
        }),
        create: vi.fn(({ data }) => {
          const newOrg = {
            id: `org-${Date.now()}`,
            name: data.name,
            slug: data.slug,
            bio: data.bio || null,
            timezone: data.timezone || "America/New_York",
            logo: null,
            members: [],
          };
          mockOrgs.push(newOrg);
          if (data.members?.create) {
            mockMembers.push({
              id: `mem-${Date.now()}`,
              userId: data.members.create.userId,
              organizationId: newOrg.id,
              role: data.members.create.role,
              organization: newOrg,
            });
          }
          return newOrg;
        }),
        update: vi.fn(({ where, data }) => {
          const org = mockOrgs.find((o) => o.id === where.id);
          if (!org) throw new Error("Organization not found");
          Object.assign(org, data);
          return org;
        }),
      },
      organizationMember: {
        findFirst: vi.fn(({ where }) => {
          return mockMembers.find((m) => {
            const matchUser = m.userId === where.userId;
            const target = where.organization?.OR?.[0]?.id || where.organization?.OR?.[1]?.slug;
            const matchOrg = target
              ? m.organization.id === target || m.organization.slug === target
              : true;
            return matchUser && matchOrg;
          }) || null;
        }),
      },
      availability: {
        create: vi.fn(({ data }) => {
          const item = { id: `avail-${Date.now()}-${Math.random()}`, ...data };
          mockAvailabilities.push(item);
          return item;
        }),
      },
      _mockOrgs: mockOrgs,
      _mockMembers: mockMembers,
      _mockAvailabilities: mockAvailabilities,
    },
  };
});

describe("Organization Actions & Validation Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Organization Schema Validation", () => {
    it("validates a standard valid organization payload", () => {
      const valid = {
        name: "Prime Barber Co.",
        slug: "prime-barber",
        bio: "Top tier haircuts and styling",
        timezone: "America/Chicago",
      };
      const result = organizationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects names shorter than 2 characters", () => {
      const invalid = {
        name: "A",
        slug: "valid-slug",
      };
      const result = organizationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects slugs containing invalid characters or spaces", () => {
      const invalid = {
        name: "Valid Name",
        slug: "invalid slug with spaces!",
      };
      const result = organizationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("createOrganizationAction", () => {
    it("creates a new organization, assigns OWNER membership, and seeds weekly availability", async () => {
      vi.spyOn(authModule, "requireAuth").mockResolvedValue({
        id: "user-new",
        email: "founder@startup.com",
        name: "Founder",
      } as any);

      const result = await createOrganizationAction({
        name: "Apex Wellness Lounge",
        slug: "apex-wellness",
        bio: "Luxury wellness and recovery",
        timezone: "America/Los_Angeles",
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Apex Wellness Lounge");
      expect(result.data?.slug).toBe("apex-wellness");
      expect(db.organization.create).toHaveBeenCalled();
      expect(db.availability.create).toHaveBeenCalled();
    });

    it("handles existing slug collision by generating a unique suffix", async () => {
      vi.spyOn(authModule, "requireAuth").mockResolvedValue({
        id: "user-2",
        email: "user2@example.com",
      } as any);

      const result = await createOrganizationAction({
        name: "Alpha Studio Duplicate",
        slug: "alpha-studio", // Already exists in mock DB
      });

      expect(result.success).toBe(true);
      expect(result.data?.slug).not.toBe("alpha-studio");
      expect(result.data?.slug).toContain("alpha-studio-");
    });
  });

  describe("updateOrganizationAction", () => {
    it("updates organization profile successfully when authorized as OWNER", async () => {
      // User 1 is OWNER of org-1
      vi.spyOn(authModule, "auth").mockResolvedValue({
        user: { id: "user-1", email: "owner@alpha.com" },
      } as any);

      const result = await updateOrganizationAction({
        id: "org-1",
        name: "Alpha Studio Updated",
        bio: "Updated description for salon",
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Alpha Studio Updated");
      expect(result.data?.bio).toBe("Updated description for salon");
    });

    it("rejects unauthorized update attempts from non-members", async () => {
      // User 999 is NOT a member of org-1
      vi.spyOn(authModule, "auth").mockResolvedValue({
        user: { id: "user-999", email: "stranger@other.com" },
      } as any);

      const result = await updateOrganizationAction({
        id: "org-1",
        name: "Hacked Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("does not have access to organization");
    });
  });

  describe("getOrganizationAction", () => {
    it("returns organization details for current tenant", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValue({
        user: { id: "user-1", email: "owner@alpha.com" },
      } as any);

      const result = await getOrganizationAction("org-1");
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("org-1");
    });
  });
});
