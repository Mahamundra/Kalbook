import { Suspense } from 'react';
import Home from '@/components/pages/Home';

function HomePageContent() {
  return <Home />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}