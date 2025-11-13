import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/PageHeader';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { getServices } from '@/components/ported/lib/mockData';
import { Copy, Download, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { Service } from '@/types/admin';
import { UpgradeModal } from '@/components/admin/UpgradeModal';

const QRCodes = () => {
  const { t } = useLocale();
  const [services, setServices] = useState<Service[]>([]);
  const [hasQRCodesAccess, setHasQRCodesAccess] = useState<boolean | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  useEffect(() => {
    setServices(getServices());
    
    // Check if business has QR codes feature
    fetch('/api/admin/feature-check?feature=qr_codes')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHasQRCodesAccess(data.canPerform);
        } else {
          setHasQRCodesAccess(false);
        }
      })
      .catch(error => {
        console.error('Error checking QR codes feature:', error);
        setHasQRCodesAccess(false);
      });
  }, []);
  const bookingURL = 'https://bookinghub.app/style-studio';

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success(t('qr.urlCopied'));
  };

  const handleDownload = (name: string) => {
    toast.info(t('qr.downloadingQR').replace('{name}', name));
  };

  // Show upgrade message if QR codes not available
  if (hasQRCodesAccess === false) {
    return (
      <div>
        <PageHeader title={t('qr.title')} />
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('qr.upgradeRequired') || 'QR Codes Not Available'}
              </h2>
              <p className="text-gray-600 mb-6">
                {t('qr.upgradeMessage') || 'QR code generation is available in Professional and Business plans. Please upgrade to access this feature.'}
              </p>
            </div>
            <Button
              onClick={() => setShowUpgradeModal(true)}
              size="lg"
            >
              {t('trial.upgradeNow') || 'Upgrade Now'}
            </Button>
          </div>
        </Card>
        <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
      </div>
    );
  }

  // Show loading state
  if (hasQRCodesAccess === null) {
    return (
      <div>
        <PageHeader title={t('qr.title')} />
        <Card className="p-8 text-center">
          <p>{t('common.loading') || 'Loading...'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('qr.title')} />

      <div className="space-y-8">
        {/* Main Booking Page QR */}
        <Card className="p-6 shadow-card">
          <h3 className="text-xl font-semibold mb-4">{t('qr.bookingPage')}</h3>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-shrink-0 w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
              <div className="text-center text-muted-foreground text-sm">
                {t('qr.qrCode')}
                <div className="text-xs mt-1">{t('qr.placeholder')}</div>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('qr.bookingUrl')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bookingURL}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-lg bg-muted/30 text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={() => handleCopy(bookingURL)}>
                    <Copy className="w-4 h-4 me-2" />
                    {t('qr.copy')}
                  </Button>
                </div>
              </div>
              <Button onClick={() => handleDownload('booking-page')}>
                <Download className="w-4 h-4 me-2" />
                {t('qr.download')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Service QR Codes */}
        <div>
          <h3 className="text-xl font-semibold mb-4">{t('qr.serviceQR')}</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="p-6">
                <div className="space-y-4">
                  <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                    <div className="text-center text-muted-foreground text-sm">
                      {t('qr.qrCode')}
                      <div className="text-xs mt-1">{t('qr.placeholder')}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{service.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {service.duration} min • ₪{service.price}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleCopy(`${bookingURL}?service=${service.id}`)}
                    >
                      <Copy className="w-3 h-3 me-1" />
                      {t('qr.copy')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(service.name)}
                    >
                      <Download className="w-3 h-3 me-1" />
                      {t('qr.download')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodes;
