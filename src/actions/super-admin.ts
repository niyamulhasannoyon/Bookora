"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/super-admin";
import { PlanTier } from "@/lib/plans";
import { ApiResponse } from "@/types";

/**
 * Retrieves aggregate platform metrics for the Super Admin overview
 */
export async function getPlatformOverviewStatsAction(): Promise<
  ApiResponse<{
    totalOrganizations: number;
    totalUsers: number;
    totalBookings: number;
    totalPlatformGmvCents: number;
    subscriptionBreakdown: {
      free: number;
      pro: number;
      enterprise: number;
    };
    recentOrganizations: Array<{
      id: string;
      name: string;
      slug: string;
      subscriptionPlan: string;
      createdAt: string;
      memberCount: number;
      bookingCount: number;
    }>;
    recentBookings: Array<{
      id: string;
      orgName: string;
      orgSlug: string;
      serviceName: string;
      customerName: string;
      customerEmail: string;
      startAt: string;
      status: string;
      paymentStatus: string;
      priceCents: number;
    }>;
    systemHealth: {
      database: boolean;
      stripe: boolean;
      email: boolean;
      googleOAuth: boolean;
    };
  }>
> {
  try {
    await requireSuperAdmin();

    const [
      totalOrganizations,
      totalUsers,
      totalBookings,
      paidPaymentsAggregate,
      freeOrgs,
      proOrgs,
      enterpriseOrgs,
      recentOrgsData,
      recentBookingsData,
    ] = await Promise.all([
      db.organization.count(),
      db.user.count(),
      db.booking.count(),
      db.payment.aggregate({
        where: { status: "SUCCEEDED" },
        _sum: { amount: true },
      }),
      db.organization.count({ where: { subscriptionPlan: "FREE" } }),
      db.organization.count({ where: { subscriptionPlan: "PRO" } }),
      db.organization.count({ where: { subscriptionPlan: "ENTERPRISE" } }),
      db.organization.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { members: true, bookings: true },
          },
        },
      }),
      db.booking.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          organization: { select: { name: true, slug: true } },
          service: { select: { name: true, price: true } },
        },
      }),
    ]);

    const systemHealth = {
      database: true,
      stripe: Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("your_stripe")),
      email: Boolean(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("your_resend")),
      googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    };

    return {
      success: true,
      data: {
        totalOrganizations,
        totalUsers,
        totalBookings,
        totalPlatformGmvCents: paidPaymentsAggregate._sum.amount || 0,
        subscriptionBreakdown: {
          free: freeOrgs,
          pro: proOrgs,
          enterprise: enterpriseOrgs,
        },
        recentOrganizations: recentOrgsData.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          subscriptionPlan: org.subscriptionPlan,
          createdAt: org.createdAt.toISOString(),
          memberCount: org._count.members,
          bookingCount: org._count.bookings,
        })),
        recentBookings: recentBookingsData.map((b) => ({
          id: b.id,
          orgName: b.organization.name,
          orgSlug: b.organization.slug,
          serviceName: b.service.name,
          customerName: b.customerName,
          customerEmail: b.customerEmail,
          startAt: b.startAt.toISOString(),
          status: b.status,
          paymentStatus: b.paymentStatus,
          priceCents: b.service.price,
        })),
        systemHealth,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to load platform overview stats.",
    };
  }
}

/**
 * Retrieves all organizations with filtering and search
 */
export async function getAllOrganizationsAction(params?: {
  query?: string;
  planFilter?: string;
}): Promise<ApiResponse<any[]>> {
  try {
    await requireSuperAdmin();

    const { query, planFilter } = params || {};

    const where: any = {};
    if (query && query.trim() !== "") {
      where.OR = [
        { name: { contains: query.trim(), mode: "insensitive" } },
        { slug: { contains: query.trim(), mode: "insensitive" } },
      ];
    }
    if (planFilter && planFilter !== "ALL") {
      where.subscriptionPlan = planFilter.toUpperCase();
    }

    const orgs = await db.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { members: true, services: true, bookings: true },
        },
      },
    });

    return {
      success: true,
      data: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        subscriptionPlan: o.subscriptionPlan,
        subscriptionStatus: o.subscriptionStatus,
        isSuspended: o.isSuspended,
        currentPeriodEnd: o.currentPeriodEnd ? o.currentPeriodEnd.toISOString() : null,
        createdAt: o.createdAt.toISOString(),
        membersCount: o._count.members,
        servicesCount: o._count.services,
        bookingsCount: o._count.bookings,
      })),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to load organizations.",
    };
  }
}

/**
 * Toggles an organization's suspended status
 */
export async function toggleOrganizationSuspensionAction(
  organizationId: string,
  suspend: boolean
): Promise<ApiResponse<{ id: string; isSuspended: boolean }>> {
  try {
    await requireSuperAdmin();

    const updated = await db.organization.update({
      where: { id: organizationId },
      data: { isSuspended: suspend },
    });

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/organizations");
    revalidatePath(`/dashboard`);

    return {
      success: true,
      data: { id: updated.id, isSuspended: updated.isSuspended },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to update organization status.",
    };
  }
}

/**
 * Manually updates an organization's subscription plan tier
 */
export async function updateOrganizationPlanAction(
  organizationId: string,
  plan: PlanTier
): Promise<ApiResponse<{ id: string; subscriptionPlan: string }>> {
  try {
    await requireSuperAdmin();

    const updated = await db.organization.update({
      where: { id: organizationId },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: "ACTIVE",
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/organizations");
    revalidatePath(`/dashboard/billing`);

    return {
      success: true,
      data: { id: updated.id, subscriptionPlan: updated.subscriptionPlan },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to update organization plan.",
    };
  }
}

/**
 * Retrieves all registered platform users
 */
export async function getAllUsersAction(query?: string): Promise<ApiResponse<any[]>> {
  try {
    await requireSuperAdmin();

    const where: any = {};
    if (query && query.trim() !== "") {
      where.OR = [
        { name: { contains: query.trim(), mode: "insensitive" } },
        { email: { contains: query.trim(), mode: "insensitive" } },
      ];
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        memberships: {
          include: {
            organization: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    return {
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        isSuperAdmin: u.isSuperAdmin,
        emailVerified: u.emailVerified ? u.emailVerified.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        organizations: u.memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
        })),
      })),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to load platform users.",
    };
  }
}

/**
 * Toggles a user's Super Admin status
 */
export async function toggleSuperAdminStatusAction(
  targetUserId: string,
  isSuperAdmin: boolean
): Promise<ApiResponse<{ id: string; isSuperAdmin: boolean }>> {
  try {
    const admin = await requireSuperAdmin();

    if (!isSuperAdmin && admin.id === targetUserId) {
      return {
        success: false,
        error: "You cannot revoke your own Super Admin access.",
      };
    }

    const updated = await db.user.update({
      where: { id: targetUserId },
      data: { isSuperAdmin },
    });

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/users");

    return {
      success: true,
      data: { id: updated.id, isSuperAdmin: updated.isSuperAdmin },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to update user admin status.",
    };
  }
}

/**
 * Retrieves platform-wide bookings
 */
export async function getAllPlatformBookingsAction(params?: {
  query?: string;
  statusFilter?: string;
}): Promise<ApiResponse<any[]>> {
  try {
    await requireSuperAdmin();

    const { query, statusFilter } = params || {};
    const where: any = {};

    if (query && query.trim() !== "") {
      where.OR = [
        { customerName: { contains: query.trim(), mode: "insensitive" } },
        { customerEmail: { contains: query.trim(), mode: "insensitive" } },
        { organization: { name: { contains: query.trim(), mode: "insensitive" } } },
      ];
    }

    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter.toUpperCase();
    }

    const bookings = await db.booking.findMany({
      where,
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { name: true, slug: true } },
        service: { select: { name: true, price: true, currency: true } },
      },
    });

    return {
      success: true,
      data: bookings.map((b) => ({
        id: b.id,
        organizationName: b.organization.name,
        organizationSlug: b.organization.slug,
        serviceName: b.service.name,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        customerPhone: b.customerPhone,
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        status: b.status,
        paymentStatus: b.paymentStatus,
        price: b.service.price,
        currency: b.service.currency,
        createdAt: b.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to load platform bookings.",
    };
  }
}
