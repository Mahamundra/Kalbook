import type { Metadata } from 'next';
import Component from "@/components/pages/admin/Workers";
import { generateAdminMetadata } from '@/lib/metadata/admin';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return generateAdminMetadata(params.slug, 'workers');
}

export default function Page() {
  return <Component />;
}

