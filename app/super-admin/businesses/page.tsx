"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ported/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';

interface Business {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  created_at: string;
  plans: {
    id: string;
    name: string;
    price: number;
  } | null;
}

export default function SuperAdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load businesses
      const businessesRes = await fetch('/api/super-admin/businesses');
      const businessesData = await businessesRes.json();
      
      if (!businessesRes.ok) {
        throw new Error(businessesData.error || `HTTP ${businessesRes.status}: Failed to fetch businesses`);
      }
      
      if (businessesData.success) {
        setBusinesses(businessesData.businesses || []);
      } else {
        throw new Error(businessesData.error || 'Failed to load businesses');
      }

      // Load plans
      const plansRes = await fetch('/api/super-admin/plans');
      const plansData = await plansRes.json();
      
      if (!plansRes.ok) {
        console.warn('Failed to load plans:', plansData.error);
      } else if (plansData.success) {
        setPlans(plansData.plans || []);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load businesses. Please check if you are logged in as super admin.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (businessId: string, planId: string) => {
    setUpdating(businessId);
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, subscriptionStatus: 'active' }),
      });

      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        alert('Failed to update plan: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Failed to update plan');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading businesses...</div>;
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">All Businesses</h1>
        <Card className="p-6">
          <div className="text-red-600 mb-4">
            <p className="font-semibold">Error: {error}</p>
            <p className="text-sm mt-2 text-gray-600">
              Make sure you are logged in as a super admin. If you haven't created a super admin account yet, 
              run: <code className="bg-gray-100 px-2 py-1 rounded">npx tsx scripts/setup-super-admin.ts</code>
            </p>
          </div>
          <Button onClick={loadData}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">All Businesses ({businesses.length})</h1>
      
      {businesses.length === 0 ? (
        <Card className="p-6">
          <p className="text-gray-600">No businesses found. Create a business through the onboarding process.</p>
        </Card>
      ) : (
        <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Slug</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Plan</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Trial Ends</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((business) => (
                <tr key={business.id} className="border-b">
                  <td className="p-2">{business.name}</td>
                  <td className="p-2">
                    <a href={`/b/${business.slug}`} target="_blank" className="text-blue-600 hover:underline">
                      {business.slug}
                    </a>
                  </td>
                  <td className="p-2">{business.email || '-'}</td>
                  <td className="p-2">{business.plans?.name || 'No plan'}</td>
                  <td className="p-2">{business.subscription_status || '-'}</td>
                  <td className="p-2">
                    {business.trial_ends_at
                      ? new Date(business.trial_ends_at).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="p-2">
                    <Select
                      value={business.plan_id || ''}
                      onValueChange={(value) => handlePlanChange(business.id, value)}
                      disabled={updating === business.id}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      )}
    </div>
  );
}

