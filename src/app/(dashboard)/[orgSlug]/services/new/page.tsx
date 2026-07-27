import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentOrganization } from "@/lib/tenant";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { ServiceForm } from "@/components/forms/service-form";
import { createServiceAction } from "@/actions/service";

export const dynamic = "force-dynamic";

export default async function OrgNewServicePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const tenant = await getCurrentOrganization(orgSlug);

  if (!tenant) {
    redirect("/login");
  }

  const handleCreate = async (formData: any) => {
    "use server";
    return createServiceAction(formData, orgSlug);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={orgSlug} />
      <div className="flex">
        <Sidebar orgSlug={orgSlug} />
        <main className="flex-1 p-8 space-y-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/${orgSlug}/services`}
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
            orgSlug={orgSlug}
            onSubmitAction={handleCreate}
          />
        </main>
      </div>
    </div>
  );
}
