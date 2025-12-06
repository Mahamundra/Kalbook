'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Upload, Loader2, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

interface CSVImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: () => void;
}

export function CSVImportDialog({ open, onClose, onImport }: CSVImportDialogProps) {
  const { t } = useLocale();
  const { isRTL } = useDirection();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setResults(null);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResults(data.results);

      if (data.success) {
        toast.success(
          `${data.results.successful} customers imported successfully. ${data.results.failed} failed.`
        );
        onImport();
        if (data.results.failed === 0) {
          onClose();
        }
      } else {
        toast.error(data.error || 'Failed to import customers');
      }
    } catch (error) {
      toast.error('Failed to import customers');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-xl font-semibold">{t('customers.import') || 'Import Customers'}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('customers.importDescription') || 'Upload a CSV file to import customers'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* File Upload Area */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-center block">
              {t('customers.selectFile') || 'Select CSV File'}
            </Label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importing}
              className="hidden"
            />

            {!file ? (
              <div
                onClick={handleFileClick}
                className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors hover:border-primary hover:bg-muted/50 flex flex-col items-center justify-center gap-3 ${
                  importing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FileText className="h-12 w-12 text-muted-foreground" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">
                    {t('customers.noFileChosen') || 'No file chosen'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('customers.clickToChooseFile') || 'Click to choose file'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileClick();
                  }}
                  disabled={importing}
                  className="mt-2"
                >
                  {t('customers.chooseFile') || 'Choose File'}
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className={`flex items-center justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-3 flex-1 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    disabled={importing}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {results && (
            <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
              <div className="font-semibold text-sm text-center mb-3">
                {t('customers.importResults') || 'Import Results'}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col items-center gap-1 p-2 rounded bg-background">
                  <span className="text-xs text-muted-foreground">{t('customers.total') || 'Total'}</span>
                  <span className="text-lg font-semibold">{results.total}</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded bg-background">
                  <span className="text-xs text-muted-foreground">{t('customers.successful') || 'Successful'}</span>
                  <span className="text-lg font-semibold text-green-600 dark:text-green-400">{results.successful}</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded bg-background">
                  <span className="text-xs text-muted-foreground">{t('customers.failed') || 'Failed'}</span>
                  <span className="text-lg font-semibold text-red-600 dark:text-red-400">{results.failed}</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded bg-background">
                  <span className="text-xs text-muted-foreground">{t('customers.skipped') || 'Skipped'}</span>
                  <span className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{results.skipped}</span>
                </div>
              </div>
              {results.errors && results.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="font-semibold text-xs mb-2 text-center">{t('customers.errors') || 'Errors'}:</div>
                  <div className="text-xs text-red-600 dark:text-red-400 max-h-24 overflow-y-auto space-y-1">
                    {results.errors.slice(0, 5).map((err: any, idx: number) => (
                      <div key={idx} className="truncate">
                        {t('customers.row') || 'Row'} {err.row}: {err.errors[0]}
                      </div>
                    ))}
                    {results.errors.length > 5 && (
                      <div className="text-muted-foreground text-center">
                        +{results.errors.length - 5} {t('customers.moreErrors') || 'more errors'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 justify-center">
          <Button variant="outline" onClick={onClose} disabled={importing}>
            {t('customers.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? (
              <>
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ms-2' : 'me-2'}`} />
                {t('customers.importing') || 'Importing...'}
              </>
            ) : (
              <>
                <Upload className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                {t('customers.import') || 'Import'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

