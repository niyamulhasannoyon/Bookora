import { redirect } from "next/navigation";

export default async function PublicStorefrontPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/book/${orgSlug}`);
}
