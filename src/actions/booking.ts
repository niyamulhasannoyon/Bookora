"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganization, requirePermission, ForbiddenError, UnauthorizedError } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { BookingStatus, ApiResponse } from "@/types";

export async function updateBookingStatusAction(
  bookingId: string,
  newStatus: BookingStatus
): Promise<ApiResponse<any>> {
  try {
    const tenant = await getCurrentOrganization();
    if (!tenant) {
      return { success: false, error: "Unauthorized or tenant context not found." };
    }

    // SECURITY: Require update_booking_status permission
    await requirePermission(tenant.organizationId, "update_booking_status");

    const tenantDb = getTenantDb(tenant.organizationId);
    const updated = await tenantDb.bookings.updateStatus(bookingId, newStatus);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bookings");
    revalidatePath("/dashboard/calendar");

    return { success: true, data: updated };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to update booking status.",
    };
  }
}
