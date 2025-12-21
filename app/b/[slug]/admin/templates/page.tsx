import type { Metadata } from 'next';
import Component from "@/components/pages/admin/Templates";
import { generateAdminMetadata } from '@/lib/metadata/admin';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return generateAdminMetadata(params.slug, 'templates');
}

export default function Page() {
  return <Component />;
}

