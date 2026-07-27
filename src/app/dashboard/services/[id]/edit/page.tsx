import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentOrganization } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { ServiceForm } from "@/components/forms/service-form";
import { updateServiceAction } from "@/actions/service";

export const dynamic = "force-dynamic";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const tenantDb = getTenantDb(tenant.organizationId);
  const service = await tenantDb.services.findById(id);

  if (!service) {
    notFound();
  }

  const handleUpdate = async (formData: any) => {
    "use server";
    return updateServiceAction(id, formData, tenant.organizationId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={tenant.slug} />
      <div className="flex">
        <Sidebar orgSlug={tenant.slug} />
        <main className="flex-1 p-8 space-y-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/services"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold text-white">Edit Service</h1>
              <p className="text-slate-400 text-sm mt-1">
                Update parameters, duration, price, and settings for "{service.name}".
              </p>
            </div>
          </div>

          <ServiceForm
            initialValues={{
              id: service.id,
              name: service.name,
              slug: service.slug,
              description: service.description || "",
              durationMinutes: service.durationMinutes,
              price: service.price,
              currency: service.currency,
              bufferBefore: service.bufferBefore,
              bufferAfter: service.bufferAfter,
              isActive: service.isActive,
            }}
            orgSlug={tenant.slug}
            isEditing={true}
            onSubmitAction={handleUpdate}
          />
        </main>
      </div>
    </div>
  );
}
