"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import {
  getCurrentOrganization,
  requirePermission,
  requireOrganizationAccess,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/tenant";
import { organizationSchema, OrganizationInput } from "@/lib/validators";
import { ApiResponse, DayOfWeek } from "@/types";
import { slugify } from "@/lib/utils";

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  bio?: string;
  timezone?: string;
}

export interface UpdateOrganizationInput {
  id: string;
  name?: string;
  slug?: string;
  bio?: string;
  timezone?: string;
  logo?: string;
}

const DEFAULT_DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/**
 * Creates a new Organization, assigns the authenticated user as OWNER,
 * and seeds default weekly business availability.
 */
export async function createOrganizationAction(
  input: CreateOrganizationInput
): Promise<ApiResponse<{ id: string; name: string; slug: string }>> {
  try {
    const user = await requireAuth();

    const rawSlug = input.slug?.trim() || slugify(input.name);
    const validated = organizationSchema.safeParse({
      name: input.name.trim(),
      slug: rawSlug,
      bio: input.bio?.trim() || undefined,
      timezone: input.timezone || "America/New_York",
    });

    if (!validated.success) {
      const errorMsg = validated.error.errors.map((e) => e.message).join(", ");
      return { success: false, error: errorMsg };
    }

    const { name, slug, bio, timezone } = validated.data;

    // Check if slug exists; if so, append unique random suffix
    let finalSlug = slug;
    const existingOrg = await db.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      finalSlug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Create organization and owner membership atomically
    const organization = await db.organization.create({
      data: {
        name,
        slug: finalSlug,
        bio: bio || null,
        timezone,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });

    // Seed default weekly availability
    for (const day of DEFAULT_DAYS) {
      await db.availability.create({
        data: {
          organizationId: organization.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          isClosed: false,
        },
      });
    }

    await db.availability.create({
      data: {
        organizationId: organization.id,
        dayOfWeek: "SUNDAY",
        startTime: "09:00",
        endTime: "17:00",
        isClosed: true,
      },
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      data: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    };
  } catch (error: any) {
    console.error("[Create Organization Action Error]", error);
    return {
      success: false,
      error: error?.message || "Failed to create organization.",
    };
  }
}

/**
 * Updates organization profile and settings.
 * Requires `manage_organization` permission (OWNER).
 */
export async function updateOrganizationAction(
  input: UpdateOrganizationInput
): Promise<ApiResponse<any>> {
  try {
    const tenant = await requirePermission(input.id, "manage_organization");

    const updateData: Record<string, any> = {};

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (trimmedName.length < 2) {
        return { success: false, error: "Organization name must be at least 2 characters." };
      }
      updateData.name = trimmedName;
    }

    if (input.slug !== undefined) {
      const cleanSlug = slugify(input.slug);
      if (cleanSlug.length < 2) {
        return { success: false, error: "Slug must be at least 2 characters." };
      }
      if (cleanSlug !== tenant.slug) {
        const existing = await db.organization.findUnique({ where: { slug: cleanSlug } });
        if (existing && existing.id !== tenant.organizationId) {
          return { success: false, error: "This booking URL slug is already taken." };
        }
      }
      updateData.slug = cleanSlug;
    }

    if (input.bio !== undefined) {
      updateData.bio = input.bio.trim() || null;
    }

    if (input.timezone !== undefined) {
      updateData.timezone = input.timezone;
    }

    if (input.logo !== undefined) {
      updateData.logo = input.logo.trim() || null;
    }

    const updated = await db.organization.update({
      where: { id: tenant.organizationId },
      data: updateData,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath(`/book/${updated.slug}`);

    return { success: true, data: updated };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to update organization profile.",
    };
  }
}

/**
 * Retrieves organization details for the current user.
 */
export async function getOrganizationAction(
  orgIdOrSlug?: string
): Promise<ApiResponse<any>> {
  try {
    const tenant = await getCurrentOrganization(orgIdOrSlug);
    if (!tenant) {
      return { success: false, error: "Organization not found." };
    }

    const organization = await db.organization.findUnique({
      where: { id: tenant.organizationId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    if (!organization) {
      return { success: false, error: "Organization not found in database." };
    }

    return { success: true, data: organization };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to fetch organization.",
    };
  }
}
