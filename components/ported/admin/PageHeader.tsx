import { useLocale } from '@/components/ported/hooks/useLocale';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader = ({ title, description, action }: PageHeaderProps) => {
  const { isRTL } = useLocale();
  
  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
      <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h2>
        {description && <p className="text-muted-foreground text-sm sm:text-base">{description}</p>}
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </div>
  );
};
