'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/admin/DataTable';

interface MembershipPackage {
  id: string;
  name: string;
  session_count: number;
  duration_days: number;
  price: number;
  discount_price: number | null;
  active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const defaultFormData = {
  name: '',
  session_count: 10,
  duration_days: 30,
  price: 0,
  discount_price: null as number | null,
  active: true,
  description: '',
};

export function MembershipPlansManager() {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/membership-packages');
      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }
      const data = await response.json();
      if (data.success) {
        setPackages(data.packages || []);
      }
    } catch (error) {
      console.error('Failed to load packages:', error);
      toast.error(t('membershipPlans.loadError') || 'Failed to load membership plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPackageId(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (pkg: MembershipPackage) => {
    setEditingPackageId(pkg.id);
    setFormData({
      name: pkg.name,
      session_count: pkg.session_count,
      duration_days: pkg.duration_days,
      price: pkg.price,
      discount_price: pkg.discount_price,
      active: pkg.active,
      description: pkg.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (pkg: MembershipPackage) => {
    setPackageToDelete({ id: pkg.id, name: pkg.name });
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!packageToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/membership-packages/${packageToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete package');
      }

      toast.success(t('membershipPlans.deleted') || 'Membership plan deleted successfully');
      loadPackages();
      setShowDeleteDialog(false);
      setPackageToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete package:', error);
      toast.error(error.message || t('membershipPlans.deleteError') || 'Failed to delete membership plan');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t('membershipPlans.nameRequired') || 'Package name is required');
      return;
    }

    if (formData.session_count <= 0) {
      toast.error(t('membershipPlans.sessionCountRequired') || 'Session count must be greater than 0');
      return;
    }

    if (formData.duration_days <= 0) {
      toast.error(t('membershipPlans.durationRequired') || 'Duration must be greater than 0');
      return;
    }

    if (formData.discount_price !== null && formData.discount_price !== undefined && formData.discount_price >= formData.price) {
      toast.error(t('membershipPlans.discountInvalid') || 'Discount price must be less than regular price');
      return;
    }

    try {
      setSaving(true);
      const url = editingPackageId
        ? `/api/membership-packages/${editingPackageId}`
        : '/api/membership-packages';
      const method = editingPackageId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          session_count: formData.session_count,
          duration_days: formData.duration_days,
          price: formData.price,
          discount_price: formData.discount_price || null,
          active: formData.active,
          description: formData.description.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save package');
      }

      toast.success(
        editingPackageId
          ? (t('membershipPlans.updated') || 'Membership plan updated successfully')
          : (t('membershipPlans.created') || 'Membership plan created successfully')
      );
      setIsDialogOpen(false);
      loadPackages();
    } catch (error: any) {
      console.error('Failed to save package:', error);
      toast.error(error.message || t('membershipPlans.saveError') || 'Failed to save membership plan');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: t('membershipPlans.name') || 'Name',
    },
    {
      key: 'session_count',
      label: t('membershipPlans.sessions') || 'Sessions',
    },
    {
      key: 'duration_days',
      label: t('membershipPlans.duration') || 'Duration (days)',
    },
    {
      key: 'price',
      label: t('membershipPlans.price') || 'Price',
      render: (pkg: MembershipPackage) => {
        return (
          <div className={`flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}>
            {pkg.discount_price && pkg.discount_price < pkg.price ? (
              <>
                <span className="line-through text-muted-foreground text-sm">
                  ₪{pkg.price.toFixed(2)}
                </span>
                <span className="font-semibold text-primary">
                  ₪{pkg.discount_price.toFixed(2)}
                </span>
              </>
            ) : (
              <span>₪{pkg.price.toFixed(2)}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'active',
      label: t('membershipPlans.status') || 'Status',
      render: (pkg: MembershipPackage) => {
        return (
          <Badge variant={pkg.active ? 'default' : 'secondary'}>
            {pkg.active
              ? (t('membershipPlans.active') || 'Active')
              : (t('membershipPlans.inactive') || 'Inactive')}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      label: t('common.actions') || 'Actions',
      render: (pkg: MembershipPackage) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(pkg);
              }}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(pkg);
              }}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-4">
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h3 className="text-lg font-semibold">
            {t('membershipPlans.title') || 'Membership Plans'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('membershipPlans.description') || 'Create and manage membership packages for your clients'}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
          {t('membershipPlans.create') || 'Create Plan'}
        </Button>
      </div>

      <DataTable
        data={packages}
        columns={columns}
        searchable
        searchPlaceholder={t('membershipPlans.search') || 'Search plans...'}
        emptyMessage={t('membershipPlans.noPlans') || 'No membership plans found'}
        loading={loading}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
          <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
            <DialogTitle>
              {editingPackageId
                ? (t('membershipPlans.edit') || 'Edit Membership Plan')
                : (t('membershipPlans.create') || 'Create Membership Plan')}
            </DialogTitle>
            <DialogDescription>
              {editingPackageId
                ? (t('membershipPlans.editDescription') || 'Update the membership plan details')
                : (t('membershipPlans.createDescription') || 'Create a new membership plan for your clients')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('membershipPlans.name') || 'Plan Name'} *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('membershipPlans.namePlaceholder') || 'e.g., Monthly Plan, 10-Session Package'}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="session_count" className={isRTL ? 'text-right' : 'text-left'}>
                    {t('membershipPlans.sessions') || 'Number of Sessions'} *
                  </Label>
                  <Input
                    id="session_count"
                    type="number"
                    min="1"
                    value={formData.session_count}
                    onChange={(e) =>
                      setFormData({ ...formData, session_count: parseInt(e.target.value) || 0 })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration_days" className={isRTL ? 'text-right' : 'text-left'}>
                    {t('membershipPlans.duration') || 'Duration (days)'} *
                  </Label>
                  <Input
                    id="duration_days"
                    type="number"
                    min="1"
                    value={formData.duration_days}
                    onChange={(e) =>
                      setFormData({ ...formData, duration_days: parseInt(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price" className={isRTL ? 'text-right' : 'text-left'}>
                    {t('membershipPlans.price') || 'Regular Price'} *
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="discount_price" className={isRTL ? 'text-right' : 'text-left'}>
                    {t('membershipPlans.discountPrice') || 'Discount Price'} (optional)
                  </Label>
                  <Input
                    id="discount_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_price || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_price: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder={t('membershipPlans.discountPricePlaceholder') || 'Leave empty for no discount'}
                  />
                  {formData.discount_price && formData.discount_price < formData.price && (
                    <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('membershipPlans.savings') || 'Savings'}:{' '}
                      {((formData.price - formData.discount_price) / formData.price * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="description" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('membershipPlans.description') || 'Description'} (optional)
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('membershipPlans.descriptionPlaceholder') || 'Add a description for this plan...'}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active" className="cursor-pointer">
                  {t('membershipPlans.active') || 'Active'}
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ms-2' : 'me-2'}`} />
                    {t('common.saving') || 'Saving...'}
                  </>
                ) : (
                  editingPackageId
                    ? (t('common.save') || 'Save')
                    : (t('common.create') || 'Create')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={dir}>
          <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
            <DialogTitle>{t('membershipPlans.deleteConfirm') || 'Delete Membership Plan'}</DialogTitle>
            <DialogDescription>
              {t('membershipPlans.deleteConfirmMessage') || 'Are you sure you want to delete'} "{packageToDelete?.name}"?{' '}
              {t('membershipPlans.deleteWarning') || 'This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('common.deleting') || 'Deleting...'}
                </>
              ) : (
                t('common.delete') || 'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

