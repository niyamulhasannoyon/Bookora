import { db } from "@/lib/db";
import { BookingStatus, DayOfWeek, OrganizationRole } from "@/types";
import { encryptToken, decryptToken } from "@/lib/encryption";
import { createBookingWithTransaction, processPaymentStateChangeWithTransaction } from "@/lib/booking-transactions";

/**
 * Tenant-scoped Database Client
 * 
 * Guarantees server-side tenant isolation by automatically injecting `organizationId`
 * into every read, write, update, and delete query across all models.
 */
export function getTenantDb(organizationId: string) {
  return {
    organizationId,

    // 1. Services Scoped API
    services: {
      async findMany(activeOnly = true) {
        const list = await db.service.findMany({
          where: {
            organizationId,
            ...(activeOnly ? { isActive: true } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
        return list.map((s) => ({
          ...s,
          duration: s.durationMinutes, // backward compatibility property
        }));
      },

      async findBySlug(slug: string) {
        const item = await db.service.findFirst({
          where: {
            organizationId,
            slug,
          },
        });
        if (!item) return null;
        return {
          ...item,
          duration: item.durationMinutes,
        };
      },

      async findById(id: string) {
        const item = await db.service.findFirst({
          where: {
            id,
            organizationId,
          },
        });
        if (!item) return undefined;
        return {
          ...item,
          duration: item.durationMinutes,
        };
      },

      async create(data: {
        name: string;
        slug: string;
        description?: string;
        durationMinutes?: number;
        duration?: number;
        price: number;
        currency?: string;
        bufferBefore?: number;
        bufferAfter?: number;
      }) {
        const durationMinutes = data.durationMinutes ?? data.duration ?? 30;
        const created = await db.service.create({
          data: {
            organizationId,
            name: data.name,
            slug: data.slug,
            description: data.description,
            durationMinutes,
            price: data.price,
            currency: data.currency || "usd",
            bufferBefore: data.bufferBefore || 0,
            bufferAfter: data.bufferAfter || 0,
          },
        });
        return {
          ...created,
          duration: created.durationMinutes,
        };
      },

      async update(
        id: string,
        data: Partial<{
          name: string;
          slug: string;
          description: string;
          durationMinutes: number;
          duration: number;
          price: number;
          currency: string;
          bufferBefore: number;
          bufferAfter: number;
          isActive: boolean;
        }>
      ) {
        const existing = await db.service.findFirst({
          where: { id, organizationId },
        });
        if (!existing) {
          throw new Error("Service not found in this organization.");
        }

        const updateData: any = { ...data };
        if (data.duration !== undefined && data.durationMinutes === undefined) {
          updateData.durationMinutes = data.duration;
          delete updateData.duration;
        }

        const updated = await db.service.update({
          where: { id },
          data: updateData,
        });

        return {
          ...updated,
          duration: updated.durationMinutes,
        };
      },

      async delete(id: string) {
        const existing = await db.service.findFirst({
          where: { id, organizationId },
        });
        if (!existing) {
          throw new Error("Service not found in this organization.");
        }

        return db.service.delete({
          where: { id },
        });
      },
    },

    // 2. Bookings Scoped API (supports transactions)
    bookings: {
      async findMany(filters?: { status?: BookingStatus; serviceId?: string; staffId?: string }) {
        const list = await db.booking.findMany({
          where: {
            organizationId,
            ...(filters?.status ? { status: filters.status } : {}),
            ...(filters?.serviceId ? { serviceId: filters.serviceId } : {}),
            ...(filters?.staffId ? { staffId: filters.staffId } : {}),
          },
          include: {
            service: true,
            assignedStaff: {
              include: {
                user: { select: { id: true, name: true, email: true, image: true } },
              },
            },
            payment: true,
            notifications: true,
          },
          orderBy: { startAt: "asc" },
        });

        return list.map((b) => ({
          ...b,
          startTime: b.startAt,
          endTime: b.endAt,
          stripeSessionId: b.payment?.stripeSessionId || null,
        }));
      },

      async findById(id: string) {
        const item = await db.booking.findFirst({
          where: {
            id,
            organizationId,
          },
          include: {
            service: true,
            assignedStaff: {
              include: {
                user: { select: { id: true, name: true, email: true, image: true } },
              },
            },
            payment: true,
            notifications: true,
          },
        });

        if (!item) return undefined;

        return {
          ...item,
          startTime: item.startAt,
          endTime: item.endAt,
          stripeSessionId: item.payment?.stripeSessionId || null,
        };
      },

      async create(data: {
        serviceId: string;
        staffId?: string;
        customerName: string;
        customerEmail: string;
        customerPhone?: string;
        notes?: string;
        startAt?: Date;
        startTime?: Date;
        endAt?: Date;
        endTime?: Date;
        timezone?: string;
        stripeSessionId?: string;
      }) {
        const startAt = data.startAt ?? data.startTime!;
        const endAt = data.endAt ?? data.endTime!;

        const result = await createBookingWithTransaction({
          organizationId,
          serviceId: data.serviceId,
          staffId: data.staffId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          notes: data.notes,
          startAt,
          endAt,
          timezone: data.timezone,
          stripeSessionId: data.stripeSessionId,
        });

        return {
          ...result.booking,
          startTime: result.booking.startAt,
          endTime: result.booking.endAt,
          payment: result.payment,
          notification: result.notification,
        };
      },

      async assignStaff(bookingId: string, staffId: string | null) {
        const existing = await db.booking.findFirst({
          where: { id: bookingId, organizationId },
        });

        if (!existing) {
          throw new Error("Booking not found in this organization.");
        }

        if (staffId) {
          const staffMember = await db.organizationMember.findFirst({
            where: { id: staffId, organizationId },
          });

          if (!staffMember) {
            throw new Error("Staff member not found in this organization.");
          }
        }

        return db.booking.update({
          where: { id: bookingId },
          data: { staffId },
          include: {
            service: true,
            assignedStaff: {
              include: {
                user: { select: { id: true, name: true, email: true, image: true } },
              },
            },
          },
        });
      },

      async updateStatus(id: string, status: BookingStatus) {
        const existing = await db.booking.findFirst({
          where: { id, organizationId },
        });

        if (!existing) {
          throw new Error("Booking not found in this organization.");
        }

        const updated = await db.booking.update({
          where: { id },
          data: { status },
        });

        return {
          ...updated,
          startTime: updated.startAt,
          endTime: updated.endAt,
        };
      },

      async processPayment(params: {
        bookingId: string;
        paymentStatus: "PAID" | "UNPAID" | "REFUNDED" | "FAILED";
        bookingStatus?: "CONFIRMED" | "CANCELLED" | "PENDING" | "COMPLETED";
        stripeSessionId?: string;
        stripePaymentIntentId?: string;
        amount?: number;
      }) {
        const existing = await db.booking.findFirst({
          where: { id: params.bookingId, organizationId },
        });

        if (!existing) {
          throw new Error("Booking not found in this organization.");
        }

        return processPaymentStateChangeWithTransaction({
          bookingId: params.bookingId,
          paymentStatus: params.paymentStatus,
          bookingStatus: params.bookingStatus,
          stripeSessionId: params.stripeSessionId,
          stripePaymentIntentId: params.stripePaymentIntentId,
          paymentAmount: params.amount,
        });
      },
    },

    // 3. Availabilities Scoped API
    availabilities: {
      async findMany() {
        return db.availability.findMany({
          where: { organizationId },
          orderBy: { createdAt: "asc" },
        });
      },

      async setAvailability(
        dayOfWeek: DayOfWeek,
        startTime: string,
        endTime: string,
        isClosed = false
      ) {
        const existing = await db.availability.findFirst({
          where: { organizationId, dayOfWeek },
        });

        if (existing) {
          return db.availability.update({
            where: { id: existing.id },
            data: { startTime, endTime, isClosed },
          });
        }

        return db.availability.create({
          data: {
            organizationId,
            dayOfWeek,
            startTime,
            endTime,
            isClosed,
          },
        });
      },
    },

    // 4. Availability Overrides Scoped API
    availabilityOverrides: {
      async findMany() {
        return db.availabilityOverride.findMany({
          where: { organizationId },
          orderBy: { date: "asc" },
        });
      },

      async create(data: {
        date: Date;
        startTime?: string;
        endTime?: string;
        isAvailable?: boolean;
      }) {
        return db.availabilityOverride.create({
          data: {
            organizationId,
            date: data.date,
            startTime: data.startTime || null,
            endTime: data.endTime || null,
            isAvailable: data.isAvailable ?? false,
          },
        });
      },

      async delete(id: string) {
        const existing = await db.availabilityOverride.findFirst({
          where: { id, organizationId },
        });

        if (!existing) {
          throw new Error("Availability override not found in this organization.");
        }

        return db.availabilityOverride.delete({
          where: { id },
        });
      },
    },

    // 5. Members Scoped API
    members: {
      async findMany() {
        return db.organizationMember.findMany({
          where: { organizationId },
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
            assignedServices: {
              select: { serviceId: true },
            },
          },
        });
      },

      async findById(memberIdOrUserId: string) {
        return db.organizationMember.findFirst({
          where: {
            organizationId,
            OR: [
              { id: memberIdOrUserId },
              { userId: memberIdOrUserId },
            ],
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
            assignedServices: {
              select: { serviceId: true },
            },
          },
        });
      },

      async updateMemberRole(memberIdOrUserId: string, role: OrganizationRole) {
        const membership = await db.organizationMember.findFirst({
          where: {
            organizationId,
            OR: [
              { id: memberIdOrUserId },
              { userId: memberIdOrUserId },
            ],
          },
        });

        if (!membership) {
          throw new Error("User is not a member of this organization.");
        }

        return db.organizationMember.update({
          where: { id: membership.id },
          data: { role },
        });
      },

      async removeMember(memberIdOrUserId: string) {
        const membership = await db.organizationMember.findFirst({
          where: {
            organizationId,
            OR: [
              { id: memberIdOrUserId },
              { userId: memberIdOrUserId },
            ],
          },
        });

        if (!membership) {
          throw new Error("User is not a member of this organization.");
        }

        // Prevent removing the last OWNER of an organization
        if (membership.role === "OWNER") {
          const ownerCount = await db.organizationMember.count({
            where: {
              organizationId,
              role: "OWNER",
            },
          });

          if (ownerCount <= 1) {
            throw new Error("Cannot remove the only OWNER of the organization.");
          }
        }

        return db.organizationMember.delete({
          where: { id: membership.id },
        });
      },

      async assignServices(memberId: string, serviceIds: string[]) {
        const member = await db.organizationMember.findFirst({
          where: { id: memberId, organizationId },
        });

        if (!member) {
          throw new Error("Member not found in this organization.");
        }

        // Verify all serviceIds belong to this organization
        if (serviceIds.length > 0) {
          const validServices = await db.service.findMany({
            where: {
              organizationId,
              id: { in: serviceIds },
            },
          });

          if (validServices.length !== serviceIds.length) {
            throw new Error("One or more service IDs are invalid or belong to another organization.");
          }
        }

        // Remove old service assignments
        await db.serviceStaff.deleteMany({
          where: { memberId: member.id },
        });

        // Add new service assignments
        if (serviceIds.length > 0) {
          await db.serviceStaff.createMany({
            data: serviceIds.map((serviceId) => ({
              serviceId,
              memberId: member.id,
            })),
          });
        }

        return db.organizationMember.findUnique({
          where: { id: member.id },
          include: {
            assignedServices: { select: { serviceId: true } },
          },
        });
      },

      async getAssignedServices(memberId: string) {
        const member = await db.organizationMember.findFirst({
          where: { id: memberId, organizationId },
        });

        if (!member) {
          throw new Error("Member not found in this organization.");
        }

        const assignments = await db.serviceStaff.findMany({
          where: { memberId: member.id },
          select: { serviceId: true },
        });

        return assignments.map((a) => a.serviceId);
      },
    },

    // 6. Invitations Scoped API
    invitations: {
      async findMany() {
        return db.invitation.findMany({
          where: { organizationId },
          include: {
            invitedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        });
      },

      async create(data: {
        email: string;
        role: OrganizationRole;
        token: string;
        expiresAt: Date;
        invitedById: string;
      }) {
        return db.invitation.create({
          data: {
            organizationId,
            email: data.email.toLowerCase(),
            role: data.role,
            token: data.token,
            expiresAt: data.expiresAt,
            invitedById: data.invitedById,
          },
        });
      },

      async findByToken(token: string) {
        return db.invitation.findFirst({
          where: {
            token,
            organizationId,
          },
          include: {
            organization: true,
            invitedBy: { select: { id: true, name: true, email: true } },
          },
        });
      },

      async cancel(id: string) {
        const invitation = await db.invitation.findFirst({
          where: { id, organizationId },
        });

        if (!invitation) {
          throw new Error("Invitation not found in this organization.");
        }

        return db.invitation.delete({
          where: { id },
        });
      },
    },

    // 7. Staff Availability Scoped API
    staffAvailability: {
      async findMany(memberId: string) {
        const member = await db.organizationMember.findFirst({
          where: { id: memberId, organizationId },
        });

        if (!member) {
          throw new Error("Staff member not found in this organization.");
        }

        return db.staffAvailability.findMany({
          where: { memberId: member.id, organizationId },
          orderBy: { createdAt: "asc" },
        });
      },

      async setAvailability(
        memberId: string,
        dayOfWeek: DayOfWeek,
        startTime: string,
        endTime: string,
        isClosed = false
      ) {
        const member = await db.organizationMember.findFirst({
          where: { id: memberId, organizationId },
        });

        if (!member) {
          throw new Error("Staff member not found in this organization.");
        }

        return db.staffAvailability.upsert({
          where: {
            memberId_dayOfWeek: {
              memberId: member.id,
              dayOfWeek,
            },
          },
          create: {
            organizationId,
            memberId: member.id,
            dayOfWeek,
            startTime,
            endTime,
            isClosed,
          },
          update: {
            startTime,
            endTime,
            isClosed,
          },
        });
      },

      async findOverrides(memberId: string) {
        const member = await db.organizationMember.findFirst({
          where: { id: memberId, organizationId },
        });

        if (!member) {
          throw new Error("Staff member not found in this organization.");
        }

        return db.staffAvailabilityOverride.findMany({
          where: { memberId: member.id, organizationId },
          orderBy: { date: "asc" },
        });
      },

      async setOverride(data: {
        memberId: string;
        date: Date;
        startTime?: string;
        endTime?: string;
        isAvailable?: boolean;
      }) {
        const member = await db.organizationMember.findFirst({
          where: { id: data.memberId, organizationId },
        });

        if (!member) {
          throw new Error("Staff member not found in this organization.");
        }

        return db.staffAvailabilityOverride.create({
          data: {
            organizationId,
            memberId: member.id,
            date: data.date,
            startTime: data.startTime || null,
            endTime: data.endTime || null,
            isAvailable: data.isAvailable ?? false,
          },
        });
      },
    },

    // 8. Google Calendar Connections (with automatic token encryption/decryption)
    googleCalendar: {
      async getConnection(userId: string) {
        const connection = await db.googleCalendarConnection.findUnique({
          where: {
            organizationId_userId: {
              organizationId,
              userId,
            },
          },
        });

        if (!connection) return null;

        return {
          ...connection,
          accessToken: decryptToken(connection.accessToken),
          refreshToken: decryptToken(connection.refreshToken),
        };
      },

      async saveConnection(data: {
        userId: string;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
      }) {
        const encryptedAccessToken = encryptToken(data.accessToken);
        const encryptedRefreshToken = encryptToken(data.refreshToken);

        return db.googleCalendarConnection.upsert({
          where: {
            organizationId_userId: {
              organizationId,
              userId: data.userId,
            },
          },
          create: {
            organizationId,
            userId: data.userId,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: data.expiresAt,
          },
          update: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: data.expiresAt,
          },
        });
      },
    },

    // 9. Notifications Scoped API
    notifications: {
      async findMany(bookingId?: string) {
        return db.notification.findMany({
          where: {
            booking: {
              organizationId,
            },
            ...(bookingId ? { bookingId } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
      },

      async updateStatus(id: string, status: "PENDING" | "SENT" | "FAILED") {
        const existing = await db.notification.findFirst({
          where: {
            id,
            booking: { organizationId },
          },
        });

        if (!existing) {
          throw new Error("Notification not found in this organization.");
        }

        return db.notification.update({
          where: { id },
          data: {
            status,
            ...(status === "SENT" ? { sentAt: new Date() } : {}),
          },
        });
      },
    },
  };
}

