'use client';

import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function BusinessLoginPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Redirect to admin login
  redirect(`/b/${slug}/admin/login`);
}

