import { redirect } from 'next/navigation';

export default function BusinessAdminPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/b/${params.slug}/admin/dashboard`);
}

