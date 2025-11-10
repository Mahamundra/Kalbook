import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ported/ui/card';
import { Search } from 'lucide-react';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Checkbox } from '@/components/ported/ui/checkbox';
import { useIsMobile } from '@/components/ported/hooks/use-mobile';
import { useLocale } from '@/components/ported/hooks/useLocale';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  loading?: boolean;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data available',
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  loading = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const { isRTL } = useDirection();
  const isMobile = useIsMobile();
  const { t } = useLocale();

  const filteredData = searchable
    ? data.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : data;

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? filteredData.map(item => item.id) : []);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedIds, id]);
      } else {
        onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
      }
    }
  };

  const isAllSelected = filteredData.length > 0 && filteredData.every(item => selectedIds.includes(item.id));

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-4">
        {searchable && (
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={isRTL ? "pr-10 pl-3" : "pl-10 pr-3"}
            />
          </div>
        )}

        {selectable && filteredData.length > 0 && (
          <div className={`flex items-center gap-2 p-3 border rounded-lg bg-muted/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              aria-label="Select all"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.length > 0 ? `${selectedIds.length} ${isRTL ? 'נבחרו' : 'selected'}` : isRTL ? 'בחר הכל' : 'Select all'}
            </span>
          </div>
        )}

        {loading ? (
          <div className="border rounded-lg p-12 flex flex-col items-center justify-center space-y-4 animate-fade-in">
            <div className="relative mx-auto w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin" style={{ animationDuration: '0.8s' }}></div>
            </div>
            <p className="text-sm text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredData.map((item) => {
              // Filter out actions column for main display, we'll add it separately
              const displayColumns = columns.filter(col => col.key !== 'actions');
              const actionsColumn = columns.find(col => col.key === 'actions');
              
              return (
                <Card 
                  key={item.id} 
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedIds.includes(item.id) ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  <CardContent className="p-4">
                    {selectable && (
                      <div className={`flex items-center gap-2 mb-3 pb-3 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                          aria-label={`Select ${item.id}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm font-medium text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                          {isRTL ? 'נבחר' : 'Selected'}
                        </span>
                      </div>
                    )}
                    <div className="space-y-2.5">
                      {displayColumns.map((column) => (
                        <div key={column.key} className={`flex ${isRTL ? 'flex-row' : 'flex-row'} justify-between items-start gap-3`}>
                          {/* Label - appears on RIGHT in RTL, LEFT in LTR */}
                          <span className={`text-xs sm:text-sm font-medium text-muted-foreground ${isRTL ? 'text-right' : 'text-left'} min-w-[90px] sm:min-w-[100px] shrink-0`}>
                            {column.label}:
                          </span>
                          {/* Value - appears on LEFT in RTL, RIGHT in LTR */}
                          <span className={`text-xs sm:text-sm ${isRTL ? 'text-left' : 'text-right'} flex-1 break-words text-foreground`}>
                            {column.render ? column.render(item) : String((item as any)[column.key] || '-')}
                          </span>
                        </div>
                      ))}
                      {actionsColumn && (
                        <div className={`flex items-center gap-2 pt-2 mt-2 border-t ${isRTL ? 'flex-row-reverse' : 'flex-row'} ${isRTL ? 'justify-start' : 'justify-end'}`}>
                          {actionsColumn.render && actionsColumn.render(item)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={isRTL ? "pr-10 pl-3" : "pl-10 pr-3"}
          />
        </div>
      )}

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              {selectable && (
                <TableHead className="w-12">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </div>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in">
                    <div className="relative mx-auto w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin" style={{ animationDuration: '0.8s' }}></div>
                    </div>
                    <p className="text-sm text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center text-muted-foreground py-8">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => !selectable && onRowClick?.(item)}
                  className={onRowClick && !selectable ? 'cursor-pointer hover:bg-muted/50' : ''}
                >
                  {columns.map((column) => (
                    <TableCell 
                      key={column.key}
                      onClick={() => selectable && onRowClick?.(item)}
                      className={selectable && onRowClick ? 'cursor-pointer' : ''}
                    >
                      {column.render ? column.render(item) : String((item as any)[column.key])}
                    </TableCell>
                  ))}
                  {selectable && (
                    <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                          aria-label={`Select ${item.id}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
