interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader = ({ title, description, action }: PageHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div className="flex-1">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h2>
        {description && <p className="text-muted-foreground text-sm sm:text-base">{description}</p>}
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </div>
  );
};
