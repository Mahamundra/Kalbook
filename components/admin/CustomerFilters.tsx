'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useDirection } from '@/components/providers/DirectionProvider';
import { useLocale } from '@/hooks/useLocale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

export interface CustomerFilters {
  search?: string;
  blocked?: boolean;
  tags?: string[];
  consentMarketing?: boolean;
  lastVisitFrom?: string;
  lastVisitTo?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
  dateOfBirthFrom?: string;
  dateOfBirthTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CustomerFiltersProps {
  filters: CustomerFilters;
  onFilterChange: (filters: CustomerFilters) => void;
  existingTags: string[];
}

export function CustomerFilters({
  filters,
  onFilterChange,
  existingTags,
}: CustomerFiltersProps) {
  const { isRTL } = useDirection();
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof CustomerFilters, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilter = (key: keyof CustomerFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => filters[key as keyof CustomerFilters] !== undefined && filters[key as keyof CustomerFilters] !== ''
  ).length;

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    updateFilter('tags', newTags.length > 0 ? newTags : undefined);
  };

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('customers.search') || 'Search customers...'}
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            className="w-full"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
        
        {/* Sort By - moved outside */}
        <Select
          value={filters.sortBy || undefined}
          onValueChange={(value) => updateFilter('sortBy', value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('customers.filters.sortBy') || 'Sort By'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{t('customers.name') || 'Name'}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Filter className="h-4 w-4" />
          {t('customers.filters.title') || 'Filters'}
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className={isRTL ? 'mr-1' : 'ml-1'}>
              {activeFiltersCount}
            </Badge>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className={isRTL ? 'text-right' : 'text-left'}
          >
            {t('customers.filters.clearAll') || 'Clear All'}
          </Button>
        )}
      </div>

      {isOpen && (
        <div className={`border rounded-lg p-4 space-y-4 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Active Filters Display - moved to top */}
          {activeFiltersCount > 0 && (
            <div className="pb-4 border-b">
              <Label className={`text-sm font-semibold mb-3 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('customers.filters.activeFilters') || 'Active Filters'}:
              </Label>
              <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                {filters.blocked !== undefined && (
                  <Badge variant="secondary" className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {t('customers.filters.blocked') || 'Blocked'}
                    <button
                      onClick={() => clearFilter('blocked')}
                      className={`${isRTL ? 'mr-1' : 'ml-1'} hover:bg-destructive/20 rounded-full p-0.5 transition-colors`}
                      aria-label="Remove filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.consentMarketing !== undefined && (
                  <Badge variant="secondary" className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {t('customers.filters.marketingConsent') || 'Marketing Consent'}
                    <button
                      onClick={() => clearFilter('consentMarketing')}
                      className={`${isRTL ? 'mr-1' : 'ml-1'} hover:bg-destructive/20 rounded-full p-0.5 transition-colors`}
                      aria-label="Remove filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.tags && filters.tags.length > 0 && (
                  <Badge variant="secondary" className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {t('customers.tags') || 'Tags'}: {filters.tags.length}
                    <button
                      onClick={() => clearFilter('tags')}
                      className={`${isRTL ? 'mr-1' : 'ml-1'} hover:bg-destructive/20 rounded-full p-0.5 transition-colors`}
                      aria-label="Remove filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Blocked Status */}
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Label htmlFor="blocked-filter" className={isRTL ? 'text-right' : 'text-left'}>
                {t('customers.filters.blocked') || 'Blocked'}
              </Label>
              <Switch
                id="blocked-filter"
                checked={filters.blocked === true}
                onCheckedChange={(checked) =>
                  updateFilter('blocked', checked ? true : undefined)
                }
              />
            </div>

            {/* Marketing Consent */}
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Label htmlFor="consent-filter" className={isRTL ? 'text-right' : 'text-left'}>
                {t('customers.filters.marketingConsent') || 'Marketing Consent'}
              </Label>
              <Switch
                id="consent-filter"
                checked={filters.consentMarketing === true}
                onCheckedChange={(checked) =>
                  updateFilter('consentMarketing', checked ? true : undefined)
                }
              />
            </div>

          </div>

          {/* Tags Filter */}
          {existingTags.length > 0 && (
            <div>
              <Label className={`block mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('customers.tags') || 'Tags'}
              </Label>
              <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                {existingTags.map((tag) => (
                  <div
                    key={tag}
                    className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={(filters.tags || []).includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <Label
                      htmlFor={`tag-${tag}`}
                      className={`text-sm font-normal cursor-pointer ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {tag}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

