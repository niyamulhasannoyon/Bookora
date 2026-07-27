import { PrismaClient } from "@prisma/client";
import { encryptToken } from "../src/lib/encryption";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create Seed Users
  const ownerUser = await db.user.upsert({
    where: { email: "owner@velvetandblade.com" },
    update: {},
    create: {
      name: "Marcus Vance",
      email: "owner@velvetandblade.com",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    },
  });

  const staffUser = await db.user.upsert({
    where: { email: "barber.alex@velvetandblade.com" },
    update: {},
    create: {
      name: "Alex Rivera",
      email: "barber.alex@velvetandblade.com",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    },
  });

  console.log(`Created Users: ${ownerUser.name}, ${staffUser.name}`);

  // 2. Create Organization
  const org = await db.organization.upsert({
    where: { slug: "demo-salon" },
    update: {},
    create: {
      name: "Velvet & Blade Barbering",
      slug: "demo-salon",
      logo: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200",
      bio: "Premier barbering and grooming lounge offering luxury haircuts, styling, and hot towel beard treatments.",
      timezone: "America/New_York",
    },
  });

  console.log(`Created Organization: ${org.name} (${org.slug})`);

  // 3. Create Organization Memberships
  await db.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: ownerUser.id,
        organizationId: org.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      userId: ownerUser.id,
      organizationId: org.id,
      role: "OWNER",
    },
  });

  await db.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: staffUser.id,
        organizationId: org.id,
      },
    },
    update: { role: "STAFF" },
    create: {
      userId: staffUser.id,
      organizationId: org.id,
      role: "STAFF",
    },
  });

  // 4. Create Services
  const servicesData = [
    {
      name: "Signature Haircut & Styling",
      slug: "haircut-and-styling",
      description: "Consultation, deep wash, precision cut, and custom hair styling finish.",
      durationMinutes: 45,
      price: 6500, // $65.00 in cents
      currency: "usd",
      bufferBefore: 5,
      bufferAfter: 10,
      isActive: true,
    },
    {
      name: "Beard Trim & Hot Towel Treatment",
      slug: "beard-trim-and-facial",
      description: "Precision razor edging with relaxing essential oil hot towel treatment.",
      durationMinutes: 30,
      price: 3500, // $35.00 in cents
      currency: "usd",
      bufferBefore: 0,
      bufferAfter: 5,
      isActive: true,
    },
    {
      name: "Full Service Scalp Therapy & Blowout",
      slug: "scalp-therapy",
      description: "Restorative scalp massage, organic conditioning mask, and custom styling.",
      durationMinutes: 60,
      price: 9500, // $95.00 in cents
      currency: "usd",
      bufferBefore: 10,
      bufferAfter: 15,
      isActive: true,
    },
  ];

  const createdServices = [];
  for (const s of servicesData) {
    const service = await db.service.upsert({
      where: {
        organizationId_slug: {
          organizationId: org.id,
          slug: s.slug,
        },
      },
      update: {
        durationMinutes: s.durationMinutes,
        price: s.price,
      },
      create: {
        organizationId: org.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        durationMinutes: s.durationMinutes,
        price: s.price,
        currency: s.currency,
        bufferBefore: s.bufferBefore,
        bufferAfter: s.bufferAfter,
        isActive: s.isActive,
      },
    });
    createdServices.push(service);
  }

  // 5. Create Weekly Availability
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  for (const day of days) {
    const existing = await db.availability.findFirst({
      where: { organizationId: org.id, dayOfWeek: day },
    });
    if (!existing) {
      await db.availability.create({
        data: {
          organizationId: org.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          isClosed: false,
        },
      });
    }
  }

  const existingSunday = await db.availability.findFirst({
    where: { organizationId: org.id, dayOfWeek: "SUNDAY" },
  });
  if (!existingSunday) {
    await db.availability.create({
      data: {
        organizationId: org.id,
        dayOfWeek: "SUNDAY",
        startTime: "09:00",
        endTime: "17:00",
        isClosed: true,
      },
    });
  }

  // 6. Create Availability Override (e.g., Holiday Closure)
  const holidayDate = new Date();
  holidayDate.setDate(holidayDate.getDate() + 14); // 2 weeks out
  holidayDate.setHours(0, 0, 0, 0);

  const existingOverride = await db.availabilityOverride.findFirst({
    where: { organizationId: org.id, date: holidayDate },
  });

  if (!existingOverride) {
    await db.availabilityOverride.create({
      data: {
        organizationId: org.id,
        date: holidayDate,
        startTime: null,
        endTime: null,
        isAvailable: false,
      },
    });
  }

  // 7. Create Sample Booking, Payment, & Notification
  const bookingStart = new Date();
  bookingStart.setDate(bookingStart.getDate() + 1);
  bookingStart.setHours(10, 0, 0, 0);

  const bookingEnd = new Date(bookingStart);
  bookingEnd.setMinutes(bookingEnd.getMinutes() + createdServices[0].durationMinutes);

  const existingBooking = await db.booking.findFirst({
    where: {
      organizationId: org.id,
      customerEmail: "john.doe@example.com",
    },
  });

  let booking = existingBooking;
  if (!booking) {
    booking = await db.booking.create({
      data: {
        organizationId: org.id,
        serviceId: createdServices[0].id,
        customerName: "John Doe",
        customerEmail: "john.doe@example.com",
        customerPhone: "+15550192834",
        notes: "Prefers low fade taper haircut.",
        startAt: bookingStart,
        endAt: bookingEnd,
        timezone: "America/New_York",
        status: "CONFIRMED",
        paymentStatus: "PAID",
      },
    });
  }

  if (booking) {
    // 8. Create Payment for Booking
    const existingPayment = await db.payment.findUnique({
      where: { bookingId: booking.id },
    });

    if (!existingPayment) {
      await db.payment.create({
        data: {
          bookingId: booking.id,
          stripeSessionId: `cs_test_seed_${booking.id}`,
          stripePaymentIntentId: `pi_test_seed_${booking.id}`,
          amount: createdServices[0].price,
          currency: createdServices[0].currency,
          status: "SUCCEEDED",
        },
      });
    }

    // 9. Create Notifications for Booking
    const existingNotification = await db.notification.findFirst({
      where: { bookingId: booking.id, type: "BOOKING_CONFIRMATION" },
    });

    if (!existingNotification) {
      await db.notification.create({
        data: {
          bookingId: booking.id,
          type: "BOOKING_CONFIRMATION",
          status: "SENT",
          sentAt: new Date(),
        },
      });

      await db.notification.create({
        data: {
          bookingId: booking.id,
          type: "PAYMENT_RECEIVED",
          status: "SENT",
          sentAt: new Date(),
        },
      });
    }
  }

  // 10. Create Encrypted Google Calendar Connection
  const encryptedAccess = encryptToken("mock-access-token-xyz-123");
  const encryptedRefresh = encryptToken("mock-refresh-token-abc-789");
  const expiresAt = new Date(Date.now() + 3600 * 1000);

  await db.googleCalendarConnection.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: ownerUser.id,
      },
    },
    update: {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
    },
    create: {
      organizationId: org.id,
      userId: ownerUser.id,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
    },
  });

  console.log("✅ Seed complete! All 10 models populated with test data.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
