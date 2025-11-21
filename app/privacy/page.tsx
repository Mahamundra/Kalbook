"use client";

import { PageHeader } from '@/components/ui/PageHeader';
import { Footer } from '@/components/ui/Footer';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';

export default function PrivacyPage() {
  const { t, locale } = useLocale();
  const { dir } = useDirection();

  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader />
          
          <div className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold mb-2 text-center">{t('privacy.title')}</h1>
            <p className="text-muted-foreground mb-8 text-center">{t('privacy.lastUpdated')}</p>
            
            <div className="space-y-6 text-foreground">
              <section>
                <p className="mb-4">
                  {t('privacy.intro').split('KalBook.io').map((part, index, array) => 
                    index === array.length - 1 ? part : (
                      <span key={index}>
                        {part}
                        <a href="https://kalbook.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">KalBook.io</a>
                      </span>
                    )
                  )}
                </p>
                <p className="mb-4">{t('privacy.intro2')}</p>
                <p className="mb-4">{t('privacy.genderNote')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">1. {t('privacy.section1.title')}</h2>
                <p className="mb-3"><strong>{t('privacy.section1.subtitle1')}</strong></p>
                <p className="mb-3">{t('privacy.section1.p1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.item1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.item2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.item3')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.item4')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.item5')}</p>
                <p className="mb-3 ms-4">{t('privacy.section1.item6')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section1.subtitle2')}</strong></p>
                <p className="mb-3">{t('privacy.section1.p2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.customerItem1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.customerItem2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.customerItem3')}</p>
                <p className="mb-3 ms-4">{t('privacy.section1.customerItem4')}</p>
                <p className="mb-3">{t('privacy.section1.p3')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section1.subtitle3')}</strong></p>
                <p className="mb-3">{t('privacy.section1.p4')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.techItem1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.techItem2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.techItem3')}</p>
                <p className="mb-3 ms-4">{t('privacy.section1.techItem4')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section1.subtitle4')}</strong></p>
                <p className="mb-3">{t('privacy.section1.p5')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">2. {t('privacy.section2.title')}</h2>
                <p className="mb-3"><strong>{t('privacy.section2.subtitle1')}</strong></p>
                <p className="mb-2 ms-4">{t('privacy.section2.item1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section2.item2')}</p>
                <p className="mb-3 ms-4">{t('privacy.section2.item3')}</p>
                <p className="mb-3">{t('privacy.section2.p1')}</p>
                <p className="mb-3">{t('privacy.section2.p2')}</p>
                <p className="mb-3">{t('privacy.section2.p3')}</p>
                <p className="mb-3">{t('privacy.section2.p4')}</p>
                <p className="mb-3">{t('privacy.section2.p5')}</p>
                <p className="mb-3">{t('privacy.section2.p6')}</p>
                <p className="mb-3">{t('privacy.section2.p7')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">3. {t('privacy.section3.title')}</h2>
                <p className="mb-3">{t('privacy.section3.p1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section3.item1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section3.item2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section3.item3')}</p>
                <p className="mb-3 ms-4">{t('privacy.section3.item4')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">4. {t('privacy.section4.title')}</h2>
                <p className="mb-3"><strong>{t('privacy.section4.subtitle1')}</strong></p>
                <p className="mb-3">{t('privacy.section4.p1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section4.item1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section4.item2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section4.item3')}</p>
                <p className="mb-3 ms-4">{t('privacy.section4.item4')}</p>
                <p className="mb-3">{t('privacy.section4.p2')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section4.subtitle2')}</strong></p>
                <p className="mb-3">{t('privacy.section4.p3')}</p>
                <p className="mb-3">{t('privacy.section4.p4')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section4.subtitle3')}</strong></p>
                <p className="mb-3">{t('privacy.section4.p5')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section4.subtitle4')}</strong></p>
                <p className="mb-3">{t('privacy.section4.p6')}</p>
                <p className="mb-3">{t('privacy.section4.p7')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">5. {t('privacy.section5.title')}</h2>
                <p className="mb-3">{t('privacy.section5.p1')}</p>
                <p className="mb-3">{t('privacy.section5.p2')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">6. {t('privacy.section6.title')}</h2>
                <p className="mb-3">{t('privacy.section6.p1')}</p>
                <p className="mb-3">{t('privacy.section6.p2')}</p>
                <p className="mb-3">{t('privacy.section6.p3')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">7. {t('privacy.section7.title')}</h2>
                <p className="mb-3">{t('privacy.section7.p1')}</p>
                <p className="mb-3">{t('privacy.section7.p2')}</p>
                <p className="mb-3">{t('privacy.section7.p3')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">8. {t('privacy.section8.title')}</h2>
                <p className="mb-3">{t('privacy.section8.p1')}</p>
                <p className="mb-3"><strong>{t('privacy.section8.subtitle1')}</strong></p>
                <p className="mb-3">{t('privacy.section8.p2')}</p>
                <p className="mb-3"><strong>{t('privacy.section8.subtitle2')}</strong></p>
                <p className="mb-3">{t('privacy.section8.p3')}</p>
                <p className="mb-3"><strong>{t('privacy.section8.subtitle3')}</strong></p>
                <p className="mb-3">{t('privacy.section8.p4')}</p>
                <p className="mb-3"><strong>{t('privacy.section8.subtitle4')}</strong></p>
                <p className="mb-3">{t('privacy.section8.p5')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">9. {t('privacy.section9.title')}</h2>
                <p className="mb-3">{t('privacy.section9.p1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section9.item1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section9.item2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section9.item3')}</p>
                <p className="mb-2 ms-4">{t('privacy.section9.item4')}</p>
                <p className="mb-3">{t('privacy.section9.p2')}</p>
                <p className="mb-3">
                  {t('privacy.section9.p3').split('Google Analytics').map((part, index, array) => 
                    index === array.length - 1 ? part : (
                      <span key={index}>
                        {part}
                        <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Analytics</a>
                      </span>
                    )
                  )}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">10. {t('privacy.section10.title')}</h2>
                <p className="mb-3">{t('privacy.section10.p1')}</p>
                <p className="mb-3">{t('privacy.section10.p2')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">11. {t('privacy.section11.title')}</h2>
                <p className="mb-3">{t('privacy.section11.p1')}</p>
                <p className="mb-3">{t('privacy.section11.p2')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">12. {t('privacy.section12.title')}</h2>
                <p className="mb-3">{t('privacy.section12.p1')}</p>
                <div className="mb-3 space-y-2">
                  <p><strong>{t('privacy.section12.businessName')}</strong> {t('privacy.section12.businessNameValue')}</p>
                  <p><strong>{t('privacy.section12.email')}</strong> <a href={`mailto:${t('privacy.section12.emailValue')}`} className="text-primary hover:underline">{t('privacy.section12.emailValue')}</a></p>
                  <p><strong>{t('privacy.section12.phone')}</strong> <a href={`tel:+972542636737`} className="text-primary hover:underline">{t('privacy.section12.phoneValue')}</a> / <a href="https://wa.me/972542636737" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp</a></p>
                  <p><strong>{t('privacy.section12.address')}</strong> {t('privacy.section12.addressValue')}</p>
                </div>
                <p className="mb-3">{t('privacy.section12.p2')}</p>
              </section>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

