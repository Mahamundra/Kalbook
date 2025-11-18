"use client";

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/super-admin/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-700 hover:text-gray-900"
    >
      Logout
    </button>
  );
}


