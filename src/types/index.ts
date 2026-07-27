/**
 * Core domain types for Bookora Multi-Tenant SaaS
 */

export type OrganizationRole = "OWNER" | "ADMIN" | "STAFF";

// Backwards compatibility alias
export type Role = OrganizationRole;

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

/**
 * Role Permission Action definitions
 */
export type PermissionAction =
  | "manage_organization"
  | "manage_billing"
  | "delete_organization"
  | "manage_members"
  | "manage_services"
  | "manage_bookings"
  | "manage_availability"
  | "manage_settings"
  | "view_assigned_bookings"
  | "manage_own_availability"
  | "update_booking_status";

/**
 * Permission matrix defining capabilities for each role
 */
export const ROLE_PERMISSIONS: Record<OrganizationRole, PermissionAction[]> = {
  OWNER: [
    "manage_organization",
    "manage_billing",
    "delete_organization",
    "manage_members",
    "manage_services",
    "manage_bookings",
    "manage_availability",
    "manage_settings",
    "view_assigned_bookings",
    "manage_own_availability",
    "update_booking_status",
  ],
  ADMIN: [
    "manage_services",
    "manage_bookings",
    "manage_availability",
    "manage_settings",
    "view_assigned_bookings",
    "manage_own_availability",
    "update_booking_status",
  ],
  STAFF: [
    "view_assigned_bookings",
    "manage_own_availability",
    "update_booking_status",
  ],
};

export interface TenantContext {
  organizationId: string;
  slug: string;
  role: OrganizationRole;
  userId: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface InvitationRecord {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  token: string;
  expiresAt: string | Date;
  used: boolean;
  invitedById: string;
  createdAt: string | Date;
}

export interface TeamMemberRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  role: OrganizationRole;
  createdAt: string;
  assignedServices?: string[]; // Service IDs
}

export interface StaffAvailabilityRecord {
  id: string;
  organizationId: string;
  memberId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isClosed: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

