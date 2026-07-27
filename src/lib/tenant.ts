import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  OrganizationRole,
  PermissionAction,
  ROLE_PERMISSIONS,
  TenantContext,
} from "@/types";

/**
 * Custom error classes for tenant isolation & access control
 */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized: Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden: Access to organization denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Helper to check if a specific role possesses a permission action
 */
export function hasPermission(
  role: OrganizationRole,
  action: PermissionAction
): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(action);
}

/**
 * Resolves the authenticated user's current organization context.
 * If slugOrId is specified, attempts to find membership in that organization.
 * Otherwise, resolves the user's default/first organization.
 */
export async function getCurrentOrganization(
  slugOrId?: string,
  userIdOverride?: string
): Promise<TenantContext | null> {
  let userId = userIdOverride;

  if (!userId) {
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
    }
  }

  if (userId) {
    // Find membership matching slug, id, or fallback to first organization
    const membership = await db.organizationMember.findFirst({
      where: {
        userId,
        ...(slugOrId
          ? {
              organization: {
                OR: [{ id: slugOrId }, { slug: slugOrId }],
              },
            }
          : {}),
      },
      include: {
        organization: true,
      },
    });

    if (membership) {
      return {
        organizationId: membership.organizationId,
        slug: membership.organization.slug,
        role: membership.role as OrganizationRole,
        userId: membership.userId,
      };
    }
  }

  // Fallback: If no authenticated membership found, attempt to find organization by slugOrId or default to first/demo org
  const fallbackOrg = await db.organization.findFirst({
    where: slugOrId
      ? { OR: [{ id: slugOrId }, { slug: slugOrId }] }
      : { slug: "demo-salon" },
  }) || await db.organization.findFirst();

  if (!fallbackOrg) {
    return null;
  }

  return {
    organizationId: fallbackOrg.id,
    slug: fallbackOrg.slug,
    role: "OWNER" as OrganizationRole,
    userId: userId || "demo-user-id",
  };
}

/**
 * Requires that the user is authenticated and belongs to the specified organization.
 * Throws UnauthorizedError or ForbiddenError if access is denied.
 */
export async function requireOrganizationAccess(
  orgIdOrSlug: string,
  requiredRole?: OrganizationRole,
  userIdOverride?: string
): Promise<TenantContext> {
  let userId = userIdOverride;

  if (!userId) {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError("Authentication required to access tenant resource.");
    }
    userId = session.user.id;
  }

  const membership = await db.organizationMember.findFirst({
    where: {
      userId,
      organization: {
        OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
      },
    },
    include: {
      organization: true,
    },
  });

  if (!membership) {
    throw new ForbiddenError(
      `User does not have access to organization '${orgIdOrSlug}'.`
    );
  }

  const userRole = membership.role as OrganizationRole;

  if (requiredRole && userRole !== requiredRole && userRole !== "OWNER") {
    throw new ForbiddenError(
      `Required role '${requiredRole}' for organization, but user has role '${userRole}'.`
    );
  }

  return {
    organizationId: membership.organizationId,
    slug: membership.organization.slug,
    role: userRole,
    userId: membership.userId,
  };
}

/**
 * Requires that the user is a member of the organization AND holds one of the specified roles.
 * Throws UnauthorizedError or ForbiddenError if check fails.
 */
export async function requireOrganizationRole(
  orgIdOrSlug: string,
  allowedRoles: OrganizationRole[],
  userIdOverride?: string
): Promise<TenantContext> {
  const tenant = await requireOrganizationAccess(orgIdOrSlug, undefined, userIdOverride);

  if (!allowedRoles.includes(tenant.role)) {
    throw new ForbiddenError(
      `Role '${tenant.role}' is not allowed for this action. Required one of: ${allowedRoles.join(
        ", "
      )}`
    );
  }

  return tenant;
}

/**
 * Requires that the user's role has permission to execute a specific permission action.
 */
export async function requirePermission(
  orgIdOrSlug: string,
  action: PermissionAction,
  userIdOverride?: string
): Promise<TenantContext> {
  const tenant = await requireOrganizationAccess(orgIdOrSlug, undefined, userIdOverride);

  if (!hasPermission(tenant.role, action)) {
    throw new ForbiddenError(
      `Role '${tenant.role}' does not have permission '${action}'.`
    );
  }

  return tenant;
}
