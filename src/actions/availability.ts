"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganization, requirePermission, ForbiddenError, UnauthorizedError } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { DayOfWeek, ApiResponse } from "@/types";

export async function updateWeeklyAvailabilityAction(
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
  isClosed: boolean
): Promise<ApiResponse<any>> {
  try {
    const tenant = await getCurrentOrganization();
    if (!tenant) {
      return { success: false, error: "Unauthorized or tenant context not found." };
    }

    // SECURITY: Require manage_availability permission
    await requirePermission(tenant.organizationId, "manage_availability");

    const tenantDb = getTenantDb(tenant.organizationId);
    const updated = await tenantDb.availabilities.setAvailability(
      dayOfWeek,
      startTime,
      endTime,
      isClosed
    );

    revalidatePath("/dashboard/availability");
    return { success: true, data: updated };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to update weekly availability.",
    };
  }
}

export async function createAvailabilityOverrideAction(
  dateString: string,
  startTime?: string,
  endTime?: string,
  isAvailable = false
): Promise<ApiResponse<any>> {
  try {
    const tenant = await getCurrentOrganization();
    if (!tenant) {
      return { success: false, error: "Unauthorized or tenant context not found." };
    }

    // SECURITY: Require manage_availability permission
    await requirePermission(tenant.organizationId, "manage_availability");

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { success: false, error: "Invalid override date format." };
    }

    const tenantDb = getTenantDb(tenant.organizationId);
    const created = await tenantDb.availabilityOverrides.create({
      date,
      startTime,
      endTime,
      isAvailable,
    });

    revalidatePath("/dashboard/availability");
    return { success: true, data: created };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to create availability override.",
    };
  }
}

export async function deleteAvailabilityOverrideAction(
  overrideId: string
): Promise<ApiResponse<void>> {
  try {
    const tenant = await getCurrentOrganization();
    if (!tenant) {
      return { success: false, error: "Unauthorized." };
    }

    // SECURITY: Require manage_availability permission
    await requirePermission(tenant.organizationId, "manage_availability");

    const tenantDb = getTenantDb(tenant.organizationId);
    await tenantDb.availabilityOverrides.delete(overrideId);

    revalidatePath("/dashboard/availability");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to delete availability override.",
    };
  }
}
