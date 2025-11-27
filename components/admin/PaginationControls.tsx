'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useDirection } from '@/components/providers/DirectionProvider';
import { useLocale } from '@/components/ported/hooks/useLocale';

interface PaginationControlsProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function PaginationControls({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: PaginationControlsProps) {
  const { isRTL } = useDirection();
  const { t } = useLocale();

  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const handleFirst = () => {
    if (page > 1) {
      onPageChange(1);
    }
  };

  const handlePrev = () => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  };

  const handleLast = () => {
    if (page < totalPages) {
      onPageChange(totalPages);
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <span className="text-sm text-muted-foreground">
          {t('customers.pagination.showing') || 'Showing'} {start}-{end} {t('customers.pagination.of') || 'of'} {total}
        </span>
        <Select
          value={limit.toString()}
          onValueChange={(value) => onLimitChange(parseInt(value, 10))}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="200">200</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {t('customers.pagination.perPage') || 'per page'}
        </span>
      </div>

      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFirst}
          disabled={page === 1}
          aria-label={t('customers.pagination.first') || 'First page'}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={page === 1}
          aria-label={t('customers.pagination.previous') || 'Previous page'}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          {t('customers.pagination.page') || 'Page'} {page} {t('customers.pagination.of') || 'of'} {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={page >= totalPages}
          aria-label={t('customers.pagination.next') || 'Next page'}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLast}
          disabled={page >= totalPages}
          aria-label={t('customers.pagination.last') || 'Last page'}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


