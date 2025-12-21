import type { Metadata } from 'next';
import Component from "@/components/pages/admin/ActivityLogs";
import { generateAdminMetadata } from '@/lib/metadata/admin';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return generateAdminMetadata(params.slug, 'activity-logs');
}

export default function Page() {
  return <Component />;
}







