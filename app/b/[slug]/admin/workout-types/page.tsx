import type { Metadata } from 'next';
import { generateAdminMetadata } from '@/lib/metadata/admin';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return generateAdminMetadata(params.slug, 'workout-types');
}

export default function WorkoutTypesPage() {
  return (
    <div className="p-6">
      <p>Workout types coming soon...</p>
    </div>
  );
}

