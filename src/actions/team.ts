"use server";

import crypto from "crypto";
import { db } from "@/lib/db";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { getTenantDb } from "@/lib/tenant-db";
import {
  requirePermission,
  requireOrganizationAccess,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/tenant";
import { ApiResponse, DayOfWeek, OrganizationRole } from "@/types";

export interface InviteMemberInput {
  orgIdOrSlug: string;
  email: string;
  role: OrganizationRole;
}

export interface InviteMemberOutput {
  id: string;
  email: string;
  role: OrganizationRole;
  token: string;
  invitationLink: string;
  expiresAt: string;
}

/**
 * Invites a new team member to an organization with a secure, one-time, expiring token.
 */
export async function inviteTeamMember(
  input: InviteMemberInput
): Promise<ApiResponse<InviteMemberOutput>> {
  try {
    const tenant = await requirePermission(input.orgIdOrSlug, "manage_members");
    const tenantDb = getTenantDb(tenant.organizationId);

    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { success: false, error: "Please provide a valid email address." };
    }

    // Check if user is already a member of this organization
    const existingMember = await db.organizationMember.findFirst({
      where: {
        organizationId: tenant.organizationId,
        user: { email },
      },
    });

    if (existingMember) {
      return {
        success: false,
        error: `User with email '${email}' is already a member of this organization.`,
      };
    }

    // Generate a secure cryptographic random token
    const token = crypto.randomBytes(32).toString("hex");

    // Token expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await tenantDb.invitations.create({
      email,
      role: input.role,
      token,
      expiresAt,
      invitedById: tenant.userId,
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const invitationLink = `${baseUrl}/accept-invite?token=${token}`;

    return {
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role as OrganizationRole,
        token: invitation.token,
        invitationLink,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to invite team member.",
    };
  }
}

/**
 * Accepts an invitation using a secure token.
 */
export async function acceptInvitation(token: string): Promise<
  ApiResponse<{ organizationSlug: string; role: OrganizationRole }>
> {
  try {
    const user = await requireAuth();

    if (!token) {
      return { success: false, error: "Invitation token is required." };
    }

    const invitation = await db.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return { success: false, error: "Invalid or expired invitation token." };
    }

    if (invitation.used) {
      return { success: false, error: "This invitation token has already been used." };
    }

    if (new Date() > invitation.expiresAt) {
      return { success: false, error: "This invitation has expired." };
    }

    // Add user as member or update role if already exists
    const membership = await db.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: invitation.organizationId,
        },
      },
      create: {
        userId: user.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
      update: {
        role: invitation.role,
      },
    });

    // Mark invitation as used
    await db.invitation.update({
      where: { id: invitation.id },
      data: { used: true },
    });

    return {
      success: true,
      data: {
        organizationSlug: invitation.organization.slug,
        role: membership.role as OrganizationRole,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to accept invitation.",
    };
  }
}

/**
 * Removes a member from an organization.
 */
export async function removeTeamMember(params: {
  orgIdOrSlug: string;
  memberId: string;
}): Promise<ApiResponse<{ removedMemberId: string }>> {
  try {
    const tenant = await requirePermission(params.orgIdOrSlug, "manage_members");
    const tenantDb = getTenantDb(tenant.organizationId);

    const targetMember = await tenantDb.members.findById(params.memberId);
    if (!targetMember) {
      return { success: false, error: "Member not found in this organization." };
    }

    // Prevent removing oneself if trying to remove own member record
    if (targetMember.userId === tenant.userId && tenant.role === "OWNER") {
      const ownerCount = await db.organizationMember.count({
        where: { organizationId: tenant.organizationId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return {
          success: false,
          error: "You cannot remove yourself as you are the only OWNER of this organization.",
        };
      }
    }

    await tenantDb.members.removeMember(targetMember.id);

    return {
      success: true,
      data: { removedMemberId: targetMember.id },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to remove team member.",
    };
  }
}

/**
 * Changes a member's role in an organization.
 */
export async function changeMemberRole(params: {
  orgIdOrSlug: string;
  memberId: string;
  newRole: OrganizationRole;
}): Promise<ApiResponse<{ memberId: string; role: OrganizationRole }>> {
  try {
    const tenant = await requirePermission(params.orgIdOrSlug, "manage_members");
    const tenantDb = getTenantDb(tenant.organizationId);

    const targetMember = await tenantDb.members.findById(params.memberId);
    if (!targetMember) {
      return { success: false, error: "Member not found in this organization." };
    }

    // Non-owners cannot promote someone to OWNER or alter an OWNER's role
    if (tenant.role !== "OWNER") {
      if (targetMember.role === "OWNER" || params.newRole === "OWNER") {
        return {
          success: false,
          error: "Only Organization Owners can grant or revoke OWNER access.",
        };
      }
    }

    // Prevent demoting the last OWNER
    if (targetMember.role === "OWNER" && params.newRole !== "OWNER") {
      const ownerCount = await db.organizationMember.count({
        where: { organizationId: tenant.organizationId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return {
          success: false,
          error: "Cannot change the role of the only OWNER of this organization.",
        };
      }
    }

    const updated = await tenantDb.members.updateMemberRole(targetMember.id, params.newRole);

    return {
      success: true,
      data: {
        memberId: updated.id,
        role: updated.role as OrganizationRole,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to change member role.",
    };
  }
}

/**
 * Assigns services to a staff member.
 */
export async function assignStaffServices(params: {
  orgIdOrSlug: string;
  memberId: string;
  serviceIds: string[];
}): Promise<ApiResponse<{ memberId: string; serviceIds: string[] }>> {
  try {
    const tenant = await requirePermission(params.orgIdOrSlug, "manage_members");
    const tenantDb = getTenantDb(tenant.organizationId);

    await tenantDb.members.assignServices(params.memberId, params.serviceIds);

    return {
      success: true,
      data: {
        memberId: params.memberId,
        serviceIds: params.serviceIds,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to assign services to staff member.",
    };
  }
}

/**
 * Assigns a booking to a staff member.
 */
export async function assignBookingStaff(params: {
  orgIdOrSlug: string;
  bookingId: string;
  staffMemberId: string | null;
}): Promise<ApiResponse<{ bookingId: string; staffId: string | null }>> {
  try {
    const tenant = await requirePermission(params.orgIdOrSlug, "manage_bookings");
    const tenantDb = getTenantDb(tenant.organizationId);

    const updated = await tenantDb.bookings.assignStaff(params.bookingId, params.staffMemberId);

    return {
      success: true,
      data: {
        bookingId: updated.id,
        staffId: updated.staffId,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to assign booking to staff.",
    };
  }
}

/**
 * Updates availability for a staff member.
 */
export async function updateStaffAvailability(params: {
  orgIdOrSlug: string;
  memberId: string;
  availabilities: Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    isClosed?: boolean;
  }>;
}): Promise<ApiResponse<{ success: boolean }>> {
  try {
    const user = await requireAuth();
    const tenant = await requireOrganizationAccess(params.orgIdOrSlug);
    const tenantDb = getTenantDb(tenant.organizationId);

    const targetMember = await tenantDb.members.findById(params.memberId);
    if (!targetMember) {
      return { success: false, error: "Member not found in this organization." };
    }

    // Check if user is editing their own availability or has manage_availability permission
    const isSelf = targetMember.userId === user.id;
    if (!isSelf && tenant.role !== "OWNER" && tenant.role !== "ADMIN") {
      throw new ForbiddenError("You can only manage your own staff availability.");
    }

    for (const item of params.availabilities) {
      await tenantDb.staffAvailability.setAvailability(
        targetMember.id,
        item.dayOfWeek,
        item.startTime,
        item.endTime,
        item.isClosed ?? false
      );
    }

    return {
      success: true,
      data: { success: true },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update staff availability.",
    };
  }
}
