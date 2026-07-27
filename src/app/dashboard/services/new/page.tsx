import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentOrganization } from "@/lib/tenant";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { ServiceForm } from "@/components/forms/service-form";
import { createServiceAction } from "@/actions/service";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const handleCreate = async (formData: any) => {
    "use server";
    return createServiceAction(formData, tenant.organizationId);
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
              <h1 className="text-3xl font-extrabold text-white">Create New Service</h1>
              <p className="text-slate-400 text-sm mt-1">
                Add a new appointment service to your organization catalog.
              </p>
            </div>
          </div>

          <ServiceForm
            orgSlug={tenant.slug}
            onSubmitAction={handleCreate}
          />
        </main>
      </div>
    </div>
  );
}
