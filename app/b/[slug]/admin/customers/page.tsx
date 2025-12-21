import type { Metadata } from 'next';
import Component from "@/components/pages/admin/Customers";
import { generateAdminMetadata } from '@/lib/metadata/admin';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return generateAdminMetadata(params.slug, 'customers');
}

export default function Page() {
  return <Component />;
}

