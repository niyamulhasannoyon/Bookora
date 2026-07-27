import {
  requireOrganizationAccess,
  requireOrganizationRole,
  requirePermission,
} from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { BookingStatus } from "@/types";

/**
 * Example 1: Securely Fetching Services for a Tenant Organization
 * 
 * Step 1: Verify the authenticated user is a member of orgIdOrSlug.
 * Step 2: Use tenant-scoped database client (getTenantDb) to retrieve only this tenant's services.
 */
export async function getOrganizationServicesExample(
  orgSlug: string,
  userId?: string
) {
  // Authorization check - throws ForbiddenError if user is not a member of orgSlug
  const tenant = await requireOrganizationAccess(orgSlug, undefined, userId);

  // Scoped DB query - automatically enforces where: { organizationId: tenant.organizationId }
  const tenantDb = getTenantDb(tenant.organizationId);
  const services = await tenantDb.services.findMany();

  return {
    organization: tenant.slug,
    userRole: tenant.role,
    services,
  };
}

/**
 * Example 2: Admin or Owner Updating Service Configuration
 * 
 * Requires role to be OWNER or ADMIN. STAFF will be rejected with ForbiddenError.
 */
export async function updateServiceExample(
  orgSlug: string,
  serviceId: string,
  updates: { name?: string; price?: number },
  userId?: string
) {
  // Role check: Only OWNER or ADMIN allowed
  const tenant = await requireOrganizationRole(
    orgSlug,
    ["OWNER", "ADMIN"],
    userId
  );

  const tenantDb = getTenantDb(tenant.organizationId);
  const updatedService = await tenantDb.services.update(serviceId, updates);

  return updatedService;
}

/**
 * Example 3: Staff Member Updating Booking Status
 * 
 * Allows STAFF, ADMIN, or OWNER.
 */
export async function updateBookingStatusExample(
  orgSlug: string,
  bookingId: string,
  newStatus: BookingStatus,
  userId?: string
) {
  // Role check: Allowed for OWNER, ADMIN, or STAFF
  const tenant = await requireOrganizationRole(
    orgSlug,
    ["OWNER", "ADMIN", "STAFF"],
    userId
  );

  const tenantDb = getTenantDb(tenant.organizationId);
  const updatedBooking = await tenantDb.bookings.updateStatus(
    bookingId,
    newStatus
  );

  return updatedBooking;
}

/**
 * Example 4: Owner-Only Action (e.g., Managing Billing or Deleting Organization)
 * 
 * Rejects ADMIN and STAFF roles with ForbiddenError.
 */
export async function deleteOrganizationExample(
  orgSlug: string,
  userId?: string
) {
  // Permission action check: Requires "delete_organization" capability (OWNER only)
  const tenant = await requirePermission(
    orgSlug,
    "delete_organization",
    userId
  );

  return {
    success: true,
    message: `Organization ${tenant.slug} deleted by OWNER ${tenant.userId}.`,
  };
}
