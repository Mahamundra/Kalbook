import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ScheduleItem } from '@/types/admin';
import { useLocale } from '@/components/ported/hooks/useLocale';

interface ScheduleListProps {
  items: ScheduleItem[];
  onViewDetails: (id: string) => void;
}

export const ScheduleList = ({ items, onViewDetails }: ScheduleListProps) => {
  const { t } = useLocale();
  const pathname = usePathname();
  
  // Detect if we're on slug-based admin route
  const slugMatch = pathname?.match(/^\/b\/([^/]+)\/admin/);
  const businessSlug = slugMatch?.[1];
  const basePath = businessSlug ? `/b/${businessSlug}/admin` : '/admin';
  
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t('dashboard.noAppointmentsToday')}</p>
        <Link href={`${basePath}/calendar`}>
          <Button variant="default" size="sm">
            {t('dashboard.goToCalendar')}
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="text-sm font-mono font-semibold text-primary min-w-[4rem]">
            {item.time}
          </div>
          <div className="flex-1">
            <p className="font-medium">{item.service}</p>
            <p className="text-sm text-muted-foreground">
              {item.customer} • {item.staff}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onViewDetails(item.id)}>
            {t('dashboard.details')}
          </Button>
        </div>
      ))}
    </div>
  );
};
