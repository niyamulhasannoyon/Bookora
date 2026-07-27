import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { CustomersView, CustomerRecord } from "@/components/dashboard/customers-view";

export const dynamic = "force-dynamic";

export default async function DashboardCustomersPage() {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const tenantDb = getTenantDb(tenant.organizationId);
  const bookings = await tenantDb.bookings.findMany();

  // Aggregate Customer Records
  const customerMap = new Map<string, CustomerRecord>();

  bookings.forEach((b) => {
    const existing = customerMap.get(b.customerEmail);
    const bookingItem = {
      id: b.id,
      serviceName: b.service.name,
      startAt: b.startAt.toISOString(),
      status: b.status,
      price: b.service.price,
    };

    if (!existing) {
      customerMap.set(b.customerEmail, {
        email: b.customerEmail,
        name: b.customerName,
        phone: b.customerPhone,
        totalBookings: 1,
        totalSpentInCents: b.paymentStatus === "PAID" ? b.service.price : 0,
        lastBookingDate: b.startAt.toISOString(),
        bookings: [bookingItem],
      });
    } else {
      existing.totalBookings += 1;
      if (b.paymentStatus === "PAID") {
        existing.totalSpentInCents += b.service.price;
      }
      if (new Date(b.startAt) > new Date(existing.lastBookingDate)) {
        existing.lastBookingDate = b.startAt.toISOString();
      }
      existing.bookings.push(bookingItem);
    }
  });

  const customerRecords = Array.from(customerMap.values());

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={tenant.slug} />
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar orgSlug={tenant.slug} />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <CustomersView initialCustomers={customerRecords} />
        </main>
      </div>
    </div>
  );
}
