"use client";

import { PageHeader } from '@/components/ui/PageHeader';
import { Footer } from '@/components/ui/Footer';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';

export default function TermsPage() {
  const { t, locale } = useLocale();
  const { dir } = useDirection();

  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader />
          
          <div className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold mb-2 text-center">{t('terms.title')}</h1>
            <p className="text-muted-foreground mb-8 text-center">{t('terms.lastUpdated')}</p>
            
            <div className="space-y-6 text-foreground">
              <section>
                <p className="mb-4">
                  {t('terms.intro').split('KalBook.io').map((part, index, array) => 
                    index === array.length - 1 ? part : (
                      <span key={index}>
                        {part}
                        <a href="https://kalbook.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">KalBook.io</a>
                      </span>
                    )
                  )}
                </p>
                <p className="mb-4">{t('terms.genderNote')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">1. {t('terms.section1.title')}</h2>
                <p className="mb-3">{t('terms.section1.p1')}</p>
                <p className="mb-3">{t('terms.section1.p2')}</p>
                <p className="mb-3">{t('terms.section1.p3')}</p>
                <p className="mb-3">{t('terms.section1.p4')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">2. {t('terms.section2.title')}</h2>
                <p className="mb-3">{t('terms.section2.p1')}</p>
                <p className="mb-3">{t('terms.section2.p2')}</p>
                <p className="mb-3">{t('terms.section2.p3')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">3. {t('terms.section3.title')}</h2>
                <p className="mb-3"><strong>{t('terms.section3.businessOwner')}</strong> {t('terms.section3.businessOwnerDesc')}</p>
                <p className="mb-3"><strong>{t('terms.section3.endCustomer')}</strong> {t('terms.section3.endCustomerDesc')}</p>
                <p className="mb-3"><strong>{t('terms.section3.user')}</strong> {t('terms.section3.userDesc')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">4. {t('terms.section4.title')}</h2>
                <p className="mb-3">{t('terms.section4.p1')}</p>
                <p className="mb-3">{t('terms.section4.p2')}</p>
                <p className="mb-3">{t('terms.section4.p3')}</p>
                <p className="mb-3">{t('terms.section4.p4')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">5. {t('terms.section5.title')}</h2>
                <p className="mb-3">{t('terms.section5.p1')}</p>
                <p className="mb-3">{t('terms.section5.p2')}</p>
                <p className="mb-3">{t('terms.section5.p3')}</p>
                <p className="mb-3"><strong>{t('terms.section5.cancellation')}</strong></p>
                <p className="mb-3 ms-4">{t('terms.section5.cancellationMonthly')}</p>
                <p className="mb-3 ms-4">{t('terms.section5.cancellationYearly')}</p>
                <p className="mb-3 ms-4">{t('terms.section5.cancellationMethod')}</p>
                <p className="mb-3">{t('terms.section5.p4')}</p>
                <p className="mb-3">{t('terms.section5.p5')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">6. {t('terms.section6.title')}</h2>
                <p className="mb-3">{t('terms.section6.p1')}</p>
                <p className="mb-3">{t('terms.section6.p2')}</p>
                <p className="mb-3">{t('terms.section6.p3')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">7. {t('terms.section7.title')}</h2>
                <p className="mb-3">{t('terms.section7.p1')}</p>
                <p className="mb-3"><strong>{t('terms.section7.userObligations')}</strong></p>
                <p className="mb-2 ms-4">{t('terms.section7.obligation1')}</p>
                <p className="mb-2 ms-4">{t('terms.section7.obligation2')}</p>
                <p className="mb-2 ms-4">{t('terms.section7.obligation3')}</p>
                <p className="mb-2 ms-4">{t('terms.section7.obligation4')}</p>
                <p className="mb-2 ms-4">{t('terms.section7.obligation5')}</p>
                <p className="mb-2 ms-4">{t('terms.section7.obligation6')}</p>
                <p className="mb-3">{t('terms.section7.p2')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">8. {t('terms.section8.title')}</h2>
                <p className="mb-3">{t('terms.section8.p1')}</p>
                <p className="mb-3">{t('terms.section8.p2')}</p>
                <p className="mb-3">{t('terms.section8.p3')}</p>
                <p className="mb-3">{t('terms.section8.p4')}</p>
                <p className="mb-3">{t('terms.section8.p5')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">9. {t('terms.section9.title')}</h2>
                <p className="mb-3">{t('terms.section9.p1')}</p>
                <p className="mb-3">{t('terms.section9.p2')}</p>
                <p className="mb-3">{t('terms.section9.p3')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">10. {t('terms.section10.title')}</h2>
                <p className="mb-3">{t('terms.section10.p1')}</p>
                <p className="mb-3">{t('terms.section10.p2')}</p>
                <p className="mb-3">{t('terms.section10.p3')}</p>
                <p className="mb-3">{t('terms.section10.p4')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">11. {t('terms.section11.title')}</h2>
                <p className="mb-3">{t('terms.section11.p1')}</p>
                <p className="mb-3">{t('terms.section11.p2')}</p>
                <p className="mb-3">{t('terms.section11.p3')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">12. {t('terms.section12.title')}</h2>
                <p className="mb-3">{t('terms.section12.p1')}</p>
                <p className="mb-3">{t('terms.section12.p2')}</p>
                <p className="mb-3">{t('terms.section12.p3')}</p>
                <p className="mb-3">{t('terms.section12.p4')}</p>
                <p className="mb-3">{t('terms.section12.p5')}</p>
                <p className="mb-3">{t('terms.section12.p6')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">13. {t('terms.section13.title')}</h2>
                <p className="mb-3">{t('terms.section13.p1')}</p>
                <p className="mb-2 ms-4">{t('terms.section13.reason1')}</p>
                <p className="mb-2 ms-4">{t('terms.section13.reason2')}</p>
                <p className="mb-2 ms-4">{t('terms.section13.reason3')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">14. {t('terms.section14.title')}</h2>
                <p className="mb-3">{t('terms.section14.p1')}</p>
                <p className="mb-3">{t('terms.section14.p2')}</p>
                <p className="mb-3">{t('terms.section14.p3')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">15. {t('terms.section15.title')}</h2>
                <p className="mb-3">{t('terms.section15.p1')}</p>
                <p className="mb-3">{t('terms.section15.p2')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">16. {t('terms.section16.title')}</h2>
                <p className="mb-3">{t('terms.section16.p1')}</p>
                <div className="mb-3 space-y-2">
                  <p><strong>{t('terms.section16.businessName')}</strong> {t('terms.section16.businessNameValue')}</p>
                  <p><strong>{t('terms.section16.email')}</strong> <a href={`mailto:${t('terms.section16.emailValue')}`} className="text-primary hover:underline">{t('terms.section16.emailValue')}</a></p>
                  <p><strong>{t('terms.section16.phone')}</strong> <a href={`tel:+972542636737`} className="text-primary hover:underline">{t('terms.section16.phoneValue')}</a> / <a href="https://wa.me/972542636737" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp</a></p>
                  <p><strong>{t('terms.section16.address')}</strong> {t('terms.section16.addressValue')}</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

