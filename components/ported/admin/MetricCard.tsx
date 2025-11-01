import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Metric } from '@/types/admin';

interface MetricCardProps extends Metric {}

export const MetricCard = ({ label, value, change, trend = 'neutral' }: MetricCardProps) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <Card className="p-6 shadow-soft hover:shadow-card transition-shadow">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <div className="flex items-center gap-1">
        <TrendIcon className={`w-3 h-3 ${trendColor}`} />
        <p className="text-xs text-muted-foreground">{change}</p>
      </div>
    </Card>
  );
};
