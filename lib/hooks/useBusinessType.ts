"use client";

import { useState, useEffect } from 'react';

type BusinessType = 'gym_trainer' | string | null;
type BusinessTypeState = BusinessType | 'loading';

/**
 * Hook to fetch and cache the current business's business_type
 * Returns 'gym_trainer' for fitness trainer businesses, the actual type for others, or 'loading'/'null'
 */
export function useBusinessType(): BusinessTypeState {
  const [businessType, setBusinessType] = useState<BusinessTypeState>('loading');

  useEffect(() => {
    let mounted = true;

    async function fetchBusinessType() {
      try {
        const response = await fetch('/api/business/type');
        if (!response.ok) {
          throw new Error('Failed to fetch business type');
        }

        const data = await response.json();
        console.log('[useBusinessType] API response:', data);
        if (mounted) {
          const type = data.success ? (data.businessType || null) : null;
          console.log('[useBusinessType] Setting business type:', type);
          setBusinessType(type);
        }
      } catch (error) {
        console.error('[useBusinessType] Error fetching business type:', error);
        if (mounted) {
          setBusinessType(null);
        }
      }
    }

    fetchBusinessType();

    return () => {
      mounted = false;
    };
  }, []);

  return businessType;
}

