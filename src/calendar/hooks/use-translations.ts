/**
 * Translation hook for big-calendar components
 */

import { useLocale } from '@/components/ported/hooks/useLocale';

export function useTranslations() {
  const { t } = useLocale();
  
  return {
    events: t('calendar.events') || 'events',
    event: t('calendar.event') || 'event',
    addEvent: t('calendar.addEvent') || 'Add Event',
    viewByDay: t('calendar.viewByDay') || 'View by day',
    viewByWeek: t('calendar.viewByWeek') || 'View by week',
    viewByMonth: t('calendar.viewByMonth') || 'View by month',
    viewByYear: t('calendar.viewByYear') || 'View by year',
    viewByAgenda: t('calendar.viewByAgenda') || 'View by agenda',
    weeklyViewNotAvailable: t('calendar.weeklyViewNotAvailable') || 'Weekly view is not available on smaller devices.',
    switchToDailyOrMonthly: t('calendar.switchToDailyOrMonthly') || 'Please switch to daily or monthly view.',
    allUsers: t('calendar.allUsers') || 'All Users',
    responsible: t('calendar.responsible') || 'Responsible',
    startDate: t('calendar.startDate') || 'Start Date',
    endDate: t('calendar.endDate') || 'End Date',
    description: t('calendar.description') || 'Description',
    edit: t('calendar.edit') || 'Edit',
    today: t('calendar.today') || 'Today',
  };
}

