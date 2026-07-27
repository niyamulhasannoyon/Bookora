"use server";

/**
 * Server Actions Module Directory for Bookora
 * 
 * Business logic implementation will be housed in respective action modules:
 * - auth.ts: User registration, login, session management
 * - booking.ts: Creating bookings, checking availability, stripe checkout
 * - service.ts: CRUD operations for tenant services
 * - organization.ts: Multi-tenant organization settings & member management
 */

export * from "./service";
export * from "./availability";
export * from "./booking";
export * from "./team";

export async function placeholderAction() {
  return { success: true, message: "Server actions initialized." };
}

