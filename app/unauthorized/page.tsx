import Link from 'next/link';
import { Button } from '@/components/ported/ui/button';
import { Home, ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="text-center max-w-md">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-destructive mb-4">403</h1>
        <h2 className="text-2xl font-semibold mb-4">Unauthorized Access</h2>
        <p className="text-gray-600 mb-8">
          You don't have permission to access this resource.
        </p>
        <Link href="/">
          <Button size="lg" className="gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

