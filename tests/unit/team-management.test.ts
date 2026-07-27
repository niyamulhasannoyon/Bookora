import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  inviteTeamMember,
  acceptInvitation,
  removeTeamMember,
  changeMemberRole,
  assignStaffServices,
  assignBookingStaff,
  updateStaffAvailability,
} from "@/actions/team";
import { getTenantDb } from "@/lib/tenant-db";
import { requirePermission, requireOrganizationAccess } from "@/lib/tenant";

let mockAuthUser = { id: "user-owner-1", email: "owner@alpha.com", name: "Owner One" };

// Mock next-auth singleton
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: mockAuthUser })),
  getCurrentUser: vi.fn(async () => mockAuthUser),
  requireAuth: vi.fn(async () => mockAuthUser),
}));

// In-memory data store for testing
const mockOrgAlpha = { id: "org-alpha-id", name: "Alpha Salon", slug: "alpha-salon" };
const mockOrgBeta = { id: "org-beta-id", name: "Beta Salon", slug: "beta-salon" };

let members: any[] = [];
let invitations: any[] = [];
let serviceStaff: any[] = [];
let bookings: any[] = [];
let staffAvailabilities: any[] = [];

vi.mock("@/lib/db", () => {
  return {
    db: {
      organizationMember: {
        findFirst: vi.fn(({ where }: any) => {
          return members.find((m) => {
            const matchesUser = where.userId ? m.userId === where.userId : true;
            let matchesOrg = true;
            if (where.organizationId) {
              matchesOrg = m.organizationId === where.organizationId;
            } else if (where.organization?.OR) {
              matchesOrg = where.organization.OR.some(
                (o: any) =>
                  (o.id && (o.id === m.organizationId || o.id === m.organization?.slug)) ||
                  (o.slug && (o.slug === m.organizationId || o.slug === m.organization?.slug))
              );
            }
            const matchesUserEmail = where.user?.email ? m.user?.email === where.user.email : true;
            const matchesId = where.OR
              ? where.OR.some((orItem: any) => orItem.id === m.id || orItem.userId === m.userId)
              : where.id
              ? m.id === where.id
              : true;

            return matchesUser && matchesOrg && matchesUserEmail && matchesId;
          });
        }),
        findUnique: vi.fn(({ where }: any) => {
          if (where.userId_organizationId) {
            return members.find(
              (m) =>
                m.userId === where.userId_organizationId.userId &&
                m.organizationId === where.userId_organizationId.organizationId
            );
          }
          if (where.id) {
            return members.find((m) => m.id === where.id);
          }
          return null;
        }),
        findMany: vi.fn(({ where }: any) => {
          return members.filter((m) => m.organizationId === where.organizationId);
        }),
        count: vi.fn(({ where }: any) => {
          return members.filter(
            (m) => m.organizationId === where.organizationId && m.role === where.role
          ).length;
        }),
        create: vi.fn(({ data }: any) => {
          const newMember = {
            id: `m_${Date.now()}_${Math.random()}`,
            userId: data.userId,
            organizationId: data.organizationId,
            role: data.role,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: { id: data.userId, email: "newuser@alpha.com", name: "New User" },
            organization: data.organizationId === "org-alpha-id" ? mockOrgAlpha : mockOrgBeta,
          };
          members.push(newMember);
          return newMember;
        }),
        upsert: vi.fn(({ where, create, update }: any) => {
          const existing = members.find(
            (m) =>
              m.userId === where.userId_organizationId.userId &&
              m.organizationId === where.userId_organizationId.organizationId
          );
          if (existing) {
            existing.role = update.role;
            return existing;
          }
          const newMember = {
            id: `m_${Date.now()}`,
            userId: create.userId,
            organizationId: create.organizationId,
            role: create.role,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: { id: create.userId, email: "staff@alpha.com", name: "New Staff" },
            organization: create.organizationId === "org-alpha-id" ? mockOrgAlpha : mockOrgBeta,
          };
          members.push(newMember);
          return newMember;
        }),
        update: vi.fn(({ where, data }: any) => {
          const m = members.find((mem) => mem.id === where.id);
          if (m) m.role = data.role;
          return m;
        }),
        delete: vi.fn(({ where }: any) => {
          const index = members.findIndex((m) => m.id === where.id);
          if (index !== -1) {
            const removed = members[index];
            members.splice(index, 1);
            return removed;
          }
          return null;
        }),
      },
      invitation: {
        create: vi.fn(({ data }: any) => {
          const inv = {
            id: `inv_${Date.now()}`,
            organizationId: data.organizationId,
            email: data.email,
            role: data.role,
            token: data.token,
            expiresAt: data.expiresAt,
            used: false,
            invitedById: data.invitedById,
            createdAt: new Date(),
            updatedAt: new Date(),
            organization: data.organizationId === "org-alpha-id" ? mockOrgAlpha : mockOrgBeta,
          };
          invitations.push(inv);
          return inv;
        }),
        findUnique: vi.fn(({ where }: any) => {
          return invitations.find((i) => i.token === where.token);
        }),
        findFirst: vi.fn(({ where }: any) => {
          return invitations.find((i) => i.token === where.token && i.organizationId === where.organizationId);
        }),
        findMany: vi.fn(({ where }: any) => {
          return invitations.filter((i) => i.organizationId === where.organizationId);
        }),
        update: vi.fn(({ where, data }: any) => {
          const inv = invitations.find((i) => i.id === where.id || i.token === where.token);
          if (inv) Object.assign(inv, data);
          return inv;
        }),
      },

      service: {
        findMany: vi.fn(({ where }: any) => {
          return [
            { id: "svc-1", organizationId: "org-alpha-id", name: "Haircut" },
            { id: "svc-2", organizationId: "org-alpha-id", name: "Coloring" },
          ].filter((s) => s.organizationId === where.organizationId && (where.id?.in ? where.id.in.includes(s.id) : true));
        }),
      },
      serviceStaff: {
        deleteMany: vi.fn(({ where }: any) => {
          serviceStaff = serviceStaff.filter((ss) => ss.memberId !== where.memberId);
        }),
        createMany: vi.fn(({ data }: any) => {
          data.forEach((item: any) => serviceStaff.push(item));
        }),
        findMany: vi.fn(({ where }: any) => {
          return serviceStaff.filter((ss) => ss.memberId === where.memberId);
        }),
      },
      booking: {
        findFirst: vi.fn(({ where }: any) => {
          return bookings.find((b) => b.id === where.id && b.organizationId === where.organizationId);
        }),
        findMany: vi.fn(({ where }: any) => {
          return bookings.filter((b) => b.organizationId === where.organizationId);
        }),
        update: vi.fn(({ where, data }: any) => {
          const b = bookings.find((bk) => bk.id === where.id);
          if (b) Object.assign(b, data);
          return b;
        }),
      },
      staffAvailability: {
        findMany: vi.fn(({ where }: any) => {
          return staffAvailabilities.filter(
            (sa) => sa.memberId === where.memberId && sa.organizationId === where.organizationId
          );
        }),
        upsert: vi.fn(({ where, create, update }: any) => {
          const existing = staffAvailabilities.find(
            (sa) => sa.memberId === where.memberId_dayOfWeek.memberId && sa.dayOfWeek === where.memberId_dayOfWeek.dayOfWeek
          );
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          const newItem = {
            id: `sa_${Date.now()}`,
            organizationId: create.organizationId,
            memberId: create.memberId,
            dayOfWeek: create.dayOfWeek,
            startTime: create.startTime,
            endTime: create.endTime,
            isClosed: create.isClosed,
          };
          staffAvailabilities.push(newItem);
          return newItem;
        }),
      },
      staffAvailabilityOverride: {
        findMany: vi.fn(() => []),
        create: vi.fn(({ data }: any) => data),
      },
    },
  };
});

describe("Team Management Unit Tests", () => {
  beforeEach(() => {
    mockAuthUser = { id: "user-owner-1", email: "owner@alpha.com", name: "Owner One" };

    members = [
      {
        id: "m-owner-1",
        userId: "user-owner-1",
        organizationId: "org-alpha-id",
        role: "OWNER",
        user: { id: "user-owner-1", email: "owner@alpha.com", name: "Owner One" },
        organization: mockOrgAlpha,
      },
      {
        id: "m-staff-1",
        userId: "user-staff-1",
        organizationId: "org-alpha-id",
        role: "STAFF",
        user: { id: "user-staff-1", email: "staff1@alpha.com", name: "Staff One" },
        organization: mockOrgAlpha,
      },
      {
        id: "m-beta-owner",
        userId: "user-beta-owner",
        organizationId: "org-beta-id",
        role: "OWNER",
        user: { id: "user-beta-owner", email: "owner@beta.com", name: "Beta Owner" },
        organization: mockOrgBeta,
      },
    ];

    invitations = [];
    serviceStaff = [];
    bookings = [
      { id: "b-1", organizationId: "org-alpha-id", serviceId: "svc-1", staffId: null, status: "CONFIRMED" },
    ];
    staffAvailabilities = [];
  });

  describe("1. Secure Invitation Token Requirements", () => {
    it("generates a secure random token with expiration, one-time flag, and organization association", async () => {
      const res = await inviteTeamMember({
        orgIdOrSlug: "alpha-salon",
        email: "newstaff@alpha.com",
        role: "STAFF",
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.token).toBeDefined();
      expect(res.data?.token.length).toBeGreaterThanOrEqual(32); // 64 hex chars
      expect(res.data?.role).toBe("STAFF");
      expect(res.data?.invitationLink).toContain(`/accept-invite?token=${res.data?.token}`);

      // Verify DB record association & security requirements
      const invRecord = invitations.find((i) => i.token === res.data?.token);
      expect(invRecord).toBeDefined();
      expect(invRecord.organizationId).toBe("org-alpha-id");
      expect(invRecord.used).toBe(false);
      expect(new Date(invRecord.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("prevents inviting an email that is already an active member of the organization", async () => {
      const res = await inviteTeamMember({
        orgIdOrSlug: "alpha-salon",
        email: "staff1@alpha.com", // Already in org
        role: "STAFF",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("already a member");
    });
  });

  describe("2. Invitation Acceptance & One-Time Token Usage", () => {
    it("allows a user to accept a valid invitation and joins the organization", async () => {
      // First invite
      const inviteRes = await inviteTeamMember({
        orgIdOrSlug: "alpha-salon",
        email: "staff@alpha.com",
        role: "STAFF",
      });

      const token = inviteRes.data!.token;

      mockAuthUser = { id: "user-new-staff", email: "staff@alpha.com", name: "New Staff" };

      // Accept invitation
      const acceptRes = await acceptInvitation(token);
      expect(acceptRes.success).toBe(true);
      expect(acceptRes.data?.organizationSlug).toBe("alpha-salon");
      expect(acceptRes.data?.role).toBe("STAFF");

      // Verify token is marked as used
      const invRecord = invitations.find((i) => i.token === token);
      expect(invRecord.used).toBe(true);
    });

    it("REJECTS attempting to use an already used invitation token", async () => {
      const inviteRes = await inviteTeamMember({
        orgIdOrSlug: "alpha-salon",
        email: "staff@alpha.com",
        role: "STAFF",
      });

      const token = inviteRes.data!.token;
      mockAuthUser = { id: "user-new-staff", email: "staff@alpha.com", name: "New Staff" };

      // First accept works
      await acceptInvitation(token);

      // Second accept fails (One-time usage check)
      const secondAccept = await acceptInvitation(token);
      expect(secondAccept.success).toBe(false);
      expect(secondAccept.error).toContain("already been used");
    });

    it("REJECTS an expired invitation token", async () => {
      const inv = {
        id: "inv-expired",
        organizationId: "org-alpha-id",
        email: "expired@alpha.com",
        role: "STAFF",
        token: "expired-token-123",
        expiresAt: new Date(Date.now() - 1000 * 60), // Expired 1 minute ago
        used: false,
        invitedById: "user-owner-1",
        organization: mockOrgAlpha,
      };
      invitations.push(inv);

      mockAuthUser = { id: "user-expired", email: "expired@alpha.com", name: "Expired User" };

      const res = await acceptInvitation("expired-token-123");
      expect(res.success).toBe(false);
      expect(res.error).toContain("expired");
    });
  });

  describe("3. Role Management & Role Hierarchy", () => {
    it("allows OWNER to promote STAFF to ADMIN", async () => {
      const res = await changeMemberRole({
        orgIdOrSlug: "alpha-salon",
        memberId: "m-staff-1",
        newRole: "ADMIN",
      });

      expect(res.success).toBe(true);
      expect(res.data?.role).toBe("ADMIN");
    });

    it("PREVENTS demoting or removing the only OWNER of an organization", async () => {
      const roleRes = await changeMemberRole({
        orgIdOrSlug: "alpha-salon",
        memberId: "m-owner-1",
        newRole: "STAFF",
      });

      expect(roleRes.success).toBe(false);
      expect(roleRes.error).toContain("only OWNER");

      const removeRes = await removeTeamMember({
        orgIdOrSlug: "alpha-salon",
        memberId: "m-owner-1",
      });

      expect(removeRes.success).toBe(false);
      expect(removeRes.error).toContain("only OWNER");
    });
  });

  describe("4. Tenant Isolation & Protection", () => {
    it("PREVENTS users from modifying organizations they do not belong to", async () => {
      const tenantDb = getTenantDb("org-alpha-id");

      // Org Alpha trying to remove Beta Owner
      await expect(
        tenantDb.members.removeMember("m-beta-owner")
      ).rejects.toThrow("User is not a member of this organization.");
    });
  });

  describe("5. Service & Booking Staff Assignments", () => {
    it("assigns services to a staff member", async () => {
      const res = await assignStaffServices({
        orgIdOrSlug: "alpha-salon",
        memberId: "m-staff-1",
        serviceIds: ["svc-1", "svc-2"],
      });

      expect(res.success).toBe(true);
      expect(res.data?.serviceIds).toEqual(["svc-1", "svc-2"]);
    });

    it("assigns a booking to a staff member", async () => {
      const res = await assignBookingStaff({
        orgIdOrSlug: "alpha-salon",
        bookingId: "b-1",
        staffMemberId: "m-staff-1",
      });

      expect(res.success).toBe(true);
      expect(res.data?.staffId).toBe("m-staff-1");
    });
  });

  describe("6. Staff Availability Management", () => {
    it("updates weekly availability working hours for a staff member", async () => {
      const res = await updateStaffAvailability({
        orgIdOrSlug: "alpha-salon",
        memberId: "m-staff-1",
        availabilities: [
          { dayOfWeek: "MONDAY", startTime: "10:00", endTime: "18:00", isClosed: false },
          { dayOfWeek: "TUESDAY", startTime: "10:00", endTime: "18:00", isClosed: false },
        ],
      });

      expect(res.success).toBe(true);

      const tenantDb = getTenantDb("org-alpha-id");
      const staffAvail = await tenantDb.staffAvailability.findMany("m-staff-1");
      expect(staffAvail).toHaveLength(2);
      expect(staffAvail[0].startTime).toBe("10:00");
    });
  });
});
