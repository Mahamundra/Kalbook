import type { Metadata } from 'next';
import BusinessAdminClientLayout from './ClientLayout';
import { generateAdminMetadata } from '@/lib/metadata/admin';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  // Default to dashboard for the layout
  return generateAdminMetadata(params.slug, 'dashboard');
}

export default function BusinessAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return <BusinessAdminClientLayout>{children}</BusinessAdminClientLayout>;
}
