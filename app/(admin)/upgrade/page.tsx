"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ported/ui/button';
import { Input } from '@/components/ported/ui/input';
import { Label } from '@/components/ported/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';
import { Textarea } from '@/components/ported/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ported/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';

interface TrialStatus {
  success: boolean;
  planName: string;
  subscriptionStatus: string;
}

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [formData, setFormData] = useState({
    desiredPlan: '',
    contactEmail: '',
    message: '',
  });

  useEffect(() => {
    // Fetch current trial status
    fetch('/api/admin/trial-status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTrialStatus(data);
        }
      })
      .catch(err => console.error('Error fetching trial status:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.desiredPlan) {
      toast.error('Please select a desired plan');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/upgrade/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit upgrade request');
      }

      toast.success(data.message || 'Upgrade request submitted successfully!');
      setFormData({ desiredPlan: '', contactEmail: '', message: '' });
    } catch (error: any) {
      console.error('Error submitting upgrade request:', error);
      toast.error(error.message || 'Failed to submit upgrade request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Upgrade Your Plan"
        description="Submit a request to upgrade your plan. We'll contact you shortly to complete the upgrade process."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Upgrade Request</CardTitle>
          <CardDescription>
            Fill out the form below and we'll get back to you as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPlan">Current Plan</Label>
              <Input
                id="currentPlan"
                value={trialStatus?.planName ? trialStatus.planName.charAt(0).toUpperCase() + trialStatus.planName.slice(1) : 'Loading...'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desiredPlan">Desired Plan *</Label>
              <Select
                value={formData.desiredPlan}
                onValueChange={(value) => setFormData({ ...formData, desiredPlan: value })}
              >
                <SelectTrigger id="desiredPlan">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="your@email.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                We'll use this email to contact you about your upgrade
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Tell us about your needs or any questions..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={6}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

