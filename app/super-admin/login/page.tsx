"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ported/ui/button';
import { Input } from '@/components/ported/ui/input';
import { Label } from '@/components/ported/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ported/ui/card';
import { Alert, AlertDescription } from '@/components/ported/ui/alert';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { KalBokLogo } from '@/components/ui/KalBookLogo';

export const dynamic = 'force-dynamic';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if already logged in as super admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { supabase } = await import('@/lib/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsChecking(false);
          return;
        }

        // Verify if user is a super admin
        const verifyResponse = await fetch('/api/super-admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        const verifyData = await verifyResponse.json();

        if (verifyData.isSuperAdmin) {
          // Already logged in as super admin, redirect
          router.push('/super-admin/businesses');
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Use Supabase client-side auth
      const { supabase } = await import('@/lib/supabase/client');
      const supabaseClient = supabase;

      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Invalid email or password');
      }

      // Verify user is a super admin
      const verifyResponse = await fetch('/api/super-admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id }),
      });
      const verifyData = await verifyResponse.json();

      if (!verifyData.isSuperAdmin) {
        await supabaseClient.auth.signOut();
        throw new Error('Access denied. Super admin privileges required.');
      }

      toast.success('Logged in successfully');
      
      // Small delay to ensure session is set
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to super admin panel
      window.location.href = '/super-admin/businesses';
    } catch (error: any) {
      setIsLoading(false);
      setError(error.message || 'Login failed');
      toast.error(error.message || 'Login failed');
    }
  };

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          {/* Logo and Header */}
          <div className="flex flex-col items-center justify-center gap-3 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <KalBokLogo size="lg" variant="full" />
          </div>
          
          <CardTitle className="text-2xl font-bold text-center">
            Super Admin Login
          </CardTitle>
          <CardDescription className="text-center">
            Access the platform administration panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@kalbook.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Login
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-center text-muted-foreground">
              This is a secure admin area. Unauthorized access is prohibited.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

