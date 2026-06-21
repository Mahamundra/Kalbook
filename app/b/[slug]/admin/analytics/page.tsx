import { redirect } from 'next/navigation';

export default function AnalyticsPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/b/${params.slug}/admin/dashboard`);
}
