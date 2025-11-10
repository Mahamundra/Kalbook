'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';

interface Business {
  id: string;
  slug: string;
  name: string;
}

export default function BusinessDebugPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [compareBusinessId, setCompareBusinessId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [compareData, setCompareData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load all businesses
  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        const response = await fetch('/api/debug/businesses');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to load businesses');
        setBusinesses(result.businesses || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load businesses');
      }
    };
    loadBusinesses();
  }, []);

  // Load data for selected business
  const loadBusinessData = async (businessId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/debug/business-data?businessId=${businessId}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load business data');
      }

      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load business data');
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinessId(businessId);
    if (businessId) {
      loadBusinessData(businessId);
    } else {
      setData(null);
    }
  };

  const handleCompareChange = async (businessId: string) => {
    if (!businessId) {
      setCompareBusinessId('');
      setCompareData(null);
      return;
    }
    
    setCompareBusinessId(businessId);
    setCompareLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/debug/business-data?businessId=${businessId}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load compare business data');
      }

      setCompareData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load compare business data');
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Business Data Debugger</h1>

      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="font-medium">Select Business:</label>
            <Select value={selectedBusinessId} onValueChange={handleBusinessChange}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Choose a business..." />
              </SelectTrigger>
              <SelectContent>
                {businesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.slug} - {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBusinessId && (
              <Button onClick={() => loadBusinessData(selectedBusinessId)} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-4 border-t pt-4">
            <label className="font-medium">Compare With:</label>
            <Select value={compareBusinessId || undefined} onValueChange={handleCompareChange}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Choose another business to compare..." />
              </SelectTrigger>
              <SelectContent>
                {businesses
                  .filter(b => b.id !== selectedBusinessId)
                  .map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.slug} - {business.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {compareBusinessId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCompareChange('')}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800 font-medium">Error: {error}</p>
        </Card>
      )}

      {loading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading business data...</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* Summary */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{data.counts.users}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customers</p>
                <p className="text-2xl font-bold">{data.counts.customers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-2xl font-bold">{data.counts.services}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Workers</p>
                <p className="text-2xl font-bold">{data.counts.workers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Appointments</p>
                <p className="text-2xl font-bold">{data.counts.appointments}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visits</p>
                <p className="text-2xl font-bold">{data.counts.visits}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Templates</p>
                <p className="text-2xl font-bold">{data.counts.templates}</p>
              </div>
            </div>
          </Card>

          {/* Business Info */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Business Info</h2>
            <pre className="bg-muted p-4 rounded overflow-auto text-sm">
              {JSON.stringify(data.business, null, 2)}
            </pre>
          </Card>

          {/* Users */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Users ({data.counts.users})</h2>
            <pre className="bg-muted p-4 rounded overflow-auto text-sm max-h-96">
              {JSON.stringify(data.users, null, 2)}
            </pre>
          </Card>

          {/* Customers */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">
              Customers ({data.counts.customers})
              {compareData && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  vs {compareData.counts.customers} (compare)
                </span>
              )}
            </h2>
            
            {/* Check for duplicate customer IDs between businesses */}
            {compareData && (() => {
              const selectedIds = new Set(data.customers.map((c: any) => c.id));
              const compareIds = new Set(compareData.customers.map((c: any) => c.id));
              const duplicates = Array.from(selectedIds).filter(id => compareIds.has(id));
              
              return duplicates.length > 0 ? (
                <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 rounded">
                  <p className="font-bold text-red-800">⚠️ WARNING: DUPLICATE CUSTOMER IDs FOUND!</p>
                  <p className="text-sm text-red-700 mt-2">
                    Found {duplicates.length} customer(s) with the SAME ID in both businesses:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm text-red-700">
                    {duplicates.map((id: unknown) => {
                      const idStr = String(id);
                      const selected = data.customers.find((c: any) => c.id === idStr);
                      const compared = compareData.customers.find((c: any) => c.id === idStr);
                      return (
                        <li key={id}>
                          ID: {id.slice(0, 8)}... | 
                          Selected: {selected?.name} (business_id: {selected?.business_id.slice(0, 8)}...) | 
                          Compare: {compared?.name} (business_id: {compared?.business_id.slice(0, 8)}...)
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="mb-4 p-2 bg-green-100 border border-green-500 rounded">
                  <p className="text-sm text-green-800">✅ No duplicate customer IDs - Data is isolated correctly</p>
                </div>
              );
            })()}
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Selected Business Customers</h3>
                <div className="space-y-2 mb-4">
                  {data.customers.map((customer: any) => (
                    <div key={customer.id} className="p-2 bg-muted rounded">
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ID: {customer.id.slice(0, 8)}... | Phone: {customer.phone} | Business ID: {customer.business_id.slice(0, 8)}...
                      </p>
                    </div>
                  ))}
                  {data.customers.length === 0 && (
                    <p className="text-sm text-muted-foreground">No customers</p>
                  )}
                </div>
              </div>
              {compareData && (
                <div>
                  <h3 className="font-semibold mb-2">Compare Business Customers</h3>
                  <div className="space-y-2 mb-4">
                    {compareData.customers.map((customer: any) => (
                      <div key={customer.id} className="p-2 bg-blue-50 rounded border border-blue-200">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {customer.id.slice(0, 8)}... | Phone: {customer.phone} | Business ID: {customer.business_id.slice(0, 8)}...
                        </p>
                      </div>
                    ))}
                    {compareData.customers.length === 0 && (
                      <p className="text-sm text-muted-foreground">No customers</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">Show full JSON</summary>
              <pre className="bg-muted p-4 rounded overflow-auto text-sm max-h-96 mt-2">
                {JSON.stringify(data.customers, null, 2)}
              </pre>
            </details>
          </Card>

          {/* Services */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Services ({data.counts.services})</h2>
            <pre className="bg-muted p-4 rounded overflow-auto text-sm max-h-96">
              {JSON.stringify(data.services, null, 2)}
            </pre>
          </Card>

          {/* Workers */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Workers ({data.counts.workers})</h2>
            <pre className="bg-muted p-4 rounded overflow-auto text-sm max-h-96">
              {JSON.stringify(data.workers, null, 2)}
            </pre>
          </Card>

          {/* Appointments */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Appointments ({data.counts.appointments})</h2>
            <pre className="bg-muted p-4 rounded overflow-auto text-sm max-h-96">
              {JSON.stringify(data.appointments, null, 2)}
            </pre>
          </Card>

          {/* Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Settings</h2>
            <pre className="bg-muted p-4 rounded overflow-auto text-sm max-h-96">
              {JSON.stringify(data.settings, null, 2)}
            </pre>
          </Card>

          {/* Errors (if any) */}
          {Object.values(data.errors).some(e => e) && (
            <Card className="p-6 bg-yellow-50 border-yellow-200">
              <h2 className="text-xl font-bold mb-4 text-yellow-800">Errors</h2>
              <pre className="bg-muted p-4 rounded overflow-auto text-sm">
                {JSON.stringify(data.errors, null, 2)}
              </pre>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

