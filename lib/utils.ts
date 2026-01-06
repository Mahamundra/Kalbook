import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the base URL for the application
 * Uses NEXT_PUBLIC_APP_URL if available, otherwise falls back to window.location.origin
 * This is safe to use in client components
 */
export function getBaseUrl(): string {
  // In client components, NEXT_PUBLIC_APP_URL is available at runtime
  if (typeof window !== 'undefined') {
    // Client-side: prefer NEXT_PUBLIC_APP_URL, fallback to window.location.origin
    return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  }
  // Server-side: use environment variables
  return process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
}


