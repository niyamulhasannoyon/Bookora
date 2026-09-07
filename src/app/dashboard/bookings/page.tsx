import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { BookingsView } from "@/components/dashboard/bookings-view";

export const dynamic = "force-dynamic";

export default async function DashboardBookingsPage() {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const tenantDb = getTenantDb(tenant.organizationId);
  const rawBookings = await tenantDb.bookings.findMany();

  // Serialize dates for Client Component
  const bookings = rawBookings.map((b) => ({
    id: b.id,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    notes: b.notes,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    status: b.status,
    paymentStatus: b.paymentStatus,
    service: {
      id: b.service.id,
      name: b.service.name,
      price: b.service.price,
      durationMinutes: b.service.durationMinutes,
    },
    payment: b.payment
      ? {
          amount: b.payment.amount,
          status: b.payment.status,
        }
      : null,
  }));

  return <BookingsView initialBookings={bookings} />;
}
