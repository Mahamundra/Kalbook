import type { Metadata } from 'next';
import { generateAdminMetadata } from '@/lib/metadata/admin';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return generateAdminMetadata(params.slug, 'workout-requests');
}

export default function WorkoutRequestsPage() {
  return (
    <div className="p-6">
      <p>Workout requests coming soon...</p>
    </div>
  );
}

