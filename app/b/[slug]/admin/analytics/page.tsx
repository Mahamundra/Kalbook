import type { Metadata } from 'next';
import { generateAdminMetadata } from '@/lib/metadata/admin';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return generateAdminMetadata(params.slug, 'analytics');
}

export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <p>Analytics coming soon...</p>
    </div>
  );
}

