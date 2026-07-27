"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganization, requirePermission, ForbiddenError, UnauthorizedError } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { serviceSchema, ServiceInput } from "@/lib/validators";
import { ApiResponse } from "@/types";

/**
 * Helper to slugify a string if no slug is provided
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Retrieves all services for the user's current or specified organization.
 * Includes both active and inactive services for management purposes.
 */
export async function getServicesAction(
  orgIdOrSlug?: string
): Promise<ApiResponse<any[]>> {
  try {
    const tenant = await getCurrentOrganization(orgIdOrSlug);
    if (!tenant) {
      return { success: false, error: "Organization context not found or unauthorized." };
    }

    const tenantDb = getTenantDb(tenant.organizationId);
    const services = await tenantDb.services.findMany(false);
    return { success: true, data: services };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to fetch services.",
    };
  }
}

/**
 * Retrieves a single service by ID within the current organization context.
 */
export async function getServiceByIdAction(
  serviceId: string,
  orgIdOrSlug?: string
): Promise<ApiResponse<any>> {
  try {
    const tenant = await getCurrentOrganization(orgIdOrSlug);
    if (!tenant) {
      return { success: false, error: "Organization context not found or unauthorized." };
    }

    const tenantDb = getTenantDb(tenant.organizationId);
    const service = await tenantDb.services.findById(serviceId);

    if (!service) {
      return { success: false, error: "Service not found." };
    }

    return { success: true, data: service };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to fetch service.",
    };
  }
}

/**
 * Creates a new service for the organization.
 * Requires `manage_services` permission (OWNER or ADMIN).
 * Staff members are barred unless explicitly permitted.
 */
export async function createServiceAction(
  input: ServiceInput,
  orgIdOrSlug?: string
): Promise<ApiResponse<any>> {
  try {
    const tenant = await getCurrentOrganization(orgIdOrSlug);
    if (!tenant) {
      return { success: false, error: "Authentication required to create services." };
    }

    // Server-side permission check: enforce `manage_services` permission
    await requirePermission(tenant.organizationId, "manage_services");

    // Zod Validation
    const validationResult = serviceSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.errors.map((e) => e.message).join(", ");
      return { success: false, error: errorMsg };
    }

    const data = validationResult.data;
    const slug = data.slug && data.slug.trim() !== "" ? data.slug : slugify(data.name);
    const durationMinutes = data.durationMinutes ?? data.duration ?? 30;

    const tenantDb = getTenantDb(tenant.organizationId);

    // Check slug uniqueness within organization
    const existing = await tenantDb.services.findBySlug(slug);
    if (existing) {
      return {
        success: false,
        error: `A service with slug '${slug}' already exists in your organization.`,
      };
    }

    const newService = await tenantDb.services.create({
      name: data.name,
      slug,
      description: data.description || "",
      durationMinutes,
      price: data.price,
      currency: data.currency || "usd",
      bufferBefore: data.bufferBefore || 0,
      bufferAfter: data.bufferAfter || 0,
    });

    revalidatePath("/dashboard/services");
    revalidatePath(`/${tenant.slug}/services`);

    return { success: true, data: newService };
  } catch (error: any) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error?.message || "An unexpected error occurred while creating the service.",
    };
  }
}

/**
 * Updates an existing service.
 * Requires `manage_services` permission.
 */
export async function updateServiceAction(
  serviceId: string,
  input: Partial<ServiceInput>,
  orgIdOrSlug?: string
): Promise<ApiResponse<any>> {
  try {
    const tenant = await getCurrentOrganization(orgIdOrSlug);
    if (!tenant) {
      return { success: false, error: "Authentication required to update services." };
    }

    // Server-side permission check
    await requirePermission(tenant.organizationId, "manage_services");

    const tenantDb = getTenantDb(tenant.organizationId);

    const existingService = await tenantDb.services.findById(serviceId);
    if (!existingService) {
      return { success: false, error: "Service not found in your organization." };
    }

    const durationMinutes = input.durationMinutes ?? input.duration ?? existingService.durationMinutes;

    const updatedService = await tenantDb.services.update(serviceId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      durationMinutes,
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.bufferBefore !== undefined ? { bufferBefore: input.bufferBefore } : {}),
      ...(input.bufferAfter !== undefined ? { bufferAfter: input.bufferAfter } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    revalidatePath("/dashboard/services");
    revalidatePath(`/dashboard/services/${serviceId}/edit`);
    revalidatePath(`/${tenant.slug}/services`);

    return { success: true, data: updatedService };
  } catch (error: any) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error?.message || "Failed to update service.",
    };
  }
}

/**
 * Toggles the `isActive` state of a service.
 * Safe for optimistic UI updates.
 * Requires `manage_services` permission.
 */
export async function toggleServiceActiveAction(
  serviceId: string,
  isActive: boolean,
  orgIdOrSlug?: string
): Promise<ApiResponse<any>> {
  try {
    const tenant = await getCurrentOrganization(orgIdOrSlug);
    if (!tenant) {
      return { success: false, error: "Authentication required." };
    }

    // Server-side permission check
    await requirePermission(tenant.organizationId, "manage_services");

    const tenantDb = getTenantDb(tenant.organizationId);
    const updated = await tenantDb.services.update(serviceId, { isActive });

    revalidatePath("/dashboard/services");
    revalidatePath(`/${tenant.slug}/services`);

    return { success: true, data: updated };
  } catch (error: any) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error?.message || "Failed to toggle service status.",
    };
  }
}

/**
 * Deletes a service.
 * Requires `manage_services` permission.
 */
export async function deleteServiceAction(
  serviceId: string,
  orgIdOrSlug?: string
): Promise<ApiResponse<void>> {
  try {
    const tenant = await getCurrentOrganization(orgIdOrSlug);
    if (!tenant) {
      return { success: false, error: "Authentication required." };
    }

    // Server-side permission check
    await requirePermission(tenant.organizationId, "manage_services");

    const tenantDb = getTenantDb(tenant.organizationId);
    await tenantDb.services.delete(serviceId);

    revalidatePath("/dashboard/services");
    revalidatePath(`/${tenant.slug}/services`);

    return { success: true };
  } catch (error: any) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error?.message || "Failed to delete service.",
    };
  }
}
