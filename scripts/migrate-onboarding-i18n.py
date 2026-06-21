#!/usr/bin/env python3
"""Replace inline locale ternaries in Onboarding.tsx with t() calls."""
from pathlib import Path
import re

path = Path(__file__).resolve().parents[1] / "components/pages/Onboarding.tsx"
text = path.read_text(encoding="utf-8")

replacements = [
    (
        "locale === 'he' ? 'יש לך כבר עסק רשום. אנא התחבר לעסק הקיים.' :\n"
        "              locale === 'ar' ? 'لديك بالفعل عمل مسجل. يرجى تسجيل الدخول إلى عملك الحالي.' :\n"
        "              locale === 'ru' ? 'У вас уже есть зарегистрированный бизнес. Пожалуйста, войдите в свой текущий бизнес.' :\n"
        "              'You already have a registered business. Please log in to your existing business.'",
        "t('onboarding.alreadyRegistered')",
    ),
    (
        "locale === 'he' ? 'יש לך כבר עסק רשום. אנא התחבר לעסק הקיים.' :\n"
        "                  locale === 'ar' ? 'لديك بالفعل عمل مسجل. يرجى تسجيل الدخول إلى عملك الحالي.' :\n"
        "                  locale === 'ru' ? 'У вас уже есть зарегистрированный бизнес. Пожалуйста, войдите в свой текущий бизнес.' :\n"
        "                  'You already have a registered business. Please log in to your existing business.'",
        "t('onboarding.alreadyRegistered')",
    ),
    (
        "{selectedPlan === 'portfolio' \n"
        "                        ? (locale === 'he' ? 'חינם לנצח - לא נדרש אמצעי תשלום' : \n"
        "                           locale === 'ar' ? 'مجاني إلى الأبد - لا حاجة لوسيلة دفع' :\n"
        "                           locale === 'ru' ? 'Бесплатно навсегда - способ оплаты не требуется' :\n"
        "                           'Free Forever - No payment required')\n"
        "                        : (locale === 'he' ? 'חינם - לא נדרש אמצעי תשלום' : \n"
        "                           locale === 'ar' ? 'مجاني - لا حاجة لوسيلة دفع' :\n"
        "                           locale === 'ru' ? 'Бесплатно - способ оплаты не требуется' :\n"
        "                           'Free - No payment required')\n"
        "                      }",
        "{selectedPlan === 'portfolio' ? t('onboarding.planBanner.freeForever') : t('onboarding.planBanner.freeNoPayment')}",
    ),
    (
        "{locale === 'he' ? `שלב ${displayStep} מתוך ${TOTAL_STEPS}` :\n"
        "                   locale === 'ar' ? `الخطوة ${displayStep} من ${TOTAL_STEPS}` :\n"
        "                   locale === 'ru' ? `Шаг ${displayStep} из ${TOTAL_STEPS}` :\n"
        "                   `Step ${displayStep} of ${TOTAL_STEPS}`}",
        "{t('onboarding.stepOf').replace('{step}', String(displayStep)).replace('{total}', String(TOTAL_STEPS))}",
    ),
    (
        "{Math.round((displayStep / TOTAL_STEPS) * 100)}% {t('onboarding.complete') || (locale === 'he' ? 'הושלם' : locale === 'ar' ? 'مكتمل' : locale === 'ru' ? 'завершено' : 'complete')}",
        "{Math.round((displayStep / TOTAL_STEPS) * 100)}% {t('onboarding.complete')}",
    ),
    (
        "{locale === 'he' ? 'זה לוקח פחות מדקה :)' :\n"
        "                   locale === 'ar' ? 'يستغرق أقل من دقيقة :)' :\n"
        "                   locale === 'ru' ? 'Это займет меньше минуты :)' :\n"
        "                   'It takes less than a minute :)' }",
        "{t('onboarding.lessThanMinute')}",
    ),
    (
        "{locale === 'he' ? 'מה שם העסק שלך?' :\n"
        "                 locale === 'ar' ? 'ما اسم عملك؟' :\n"
        "                 locale === 'ru' ? 'Какое название вашего бизнеса?' :\n"
        "                 \"What's your business name?\"}",
        "{t('onboarding.steps.businessName.title')}",
    ),
    (
        "{locale === 'he' ? 'כדי שנוכל להציג אותו ללקוחות במסך קביעת תור' :\n"
        "                 locale === 'ar' ? 'حتى نتمكن من عرضه للعملاء في شاشة الحجز' :\n"
        "                 locale === 'ru' ? 'Чтобы мы могли показать его клиентам на экране бронирования' :\n"
        "                 \"So we can show it to customers on the booking page\"}",
        "{t('onboarding.steps.businessName.subtitle')}",
    ),
    (
        "{locale === 'he' ? '💡 אל דאגה – הכל ניתן לשנות אחר כך' :\n"
        "                 locale === 'ar' ? '💡 لا تقلق – يمكن تغيير كل شيء لاحقًا' :\n"
        "                 locale === 'ru' ? '💡 Не волнуйтесь – все можно изменить позже' :\n"
        "                 \"💡 Don't worry – everything can be changed later\"}",
        "{t('onboarding.steps.reassurance')}",
    ),
    (
        "{locale === 'he' ? 'שם העסק' :\n"
        "                     locale === 'ar' ? 'اسم العمل' :\n"
        "                     locale === 'ru' ? 'Название бизнеса' :\n"
        "                     'Business Name'}",
        "{t('onboarding.steps.businessName.label')}",
    ),
    (
        "placeholder={locale === 'he' ? 'לדוגמה: סטודיו חן פיטנס' : (t('onboarding.businessInfo.namePlaceholder') || 'e.g., Dima\\'s Barbershop')}",
        "placeholder={t('onboarding.steps.businessName.placeholder')}",
    ),
    (
        "<p>{locale === 'he' ? 'שדה זה נדרש' :\n"
        "                              locale === 'ar' ? 'هذا الحقل مطلوب' :\n"
        "                              locale === 'ru' ? 'Это поле обязательно' :\n"
        "                              'This field is required'}</p>",
        "<p>{t('onboarding.steps.fieldRequired')}</p>",
    ),
    (
        "{locale === 'he' ? '✨ כך זה ייראה ללקוחות:' :\n"
        "                       locale === 'ar' ? '✨ هكذا سيظهر للعملاء:' :\n"
        "                       locale === 'ru' ? '✨ Так это будет выглядеть для клиентов:' :\n"
        "                       '✨ Here\\'s how customers will see it:'}",
        "{t('onboarding.steps.businessName.preview')}",
    ),
    (
        "{locale === 'he' ? 'מה השם שלך?' :\n"
        "                 locale === 'ar' ? 'מה اسمك؟' :\n"
        "                 locale === 'ru' ? 'Как вас зовут?' :\n"
        "                 \"What's your name?\"}",
        "{t('onboarding.steps.ownerName.title')}",
    ),
    (
        "{locale === 'he' ? 'כך נציג אותך במערכת' :\n"
        "                 locale === 'ar' ? 'هكذا سنعرضك في النظام' :\n"
        "                 locale === 'ru' ? 'Так мы покажем вас в системе' :\n"
        "                 \"This is how we'll show you in the system\"}",
        "{t('onboarding.steps.ownerName.subtitle')}",
    ),
    (
        "{locale === 'he' ? '👋 שמחים להכיר אותך!' :\n"
        "                 locale === 'ar' ? '👋 سعيد بلقائك!' :\n"
        "                 locale === 'ru' ? '👋 Приятно познакомиться!' :\n"
        "                 '👋 Nice to meet you!'}",
        "{t('onboarding.steps.ownerName.greeting')}",
    ),
    (
        "{locale === 'he' ? 'שם הבעלים' :\n"
        "                     locale === 'ar' ? 'اسم المالك' :\n"
        "                     locale === 'ru' ? 'Имя владельца' :\n"
        "                     'Owner Name'}",
        "{t('onboarding.steps.ownerName.label')}",
    ),
    (
        "placeholder={locale === 'he' ? 'שם בעל העסק' : (t('onboarding.businessInfo.ownerNamePlaceholder') || 'Enter your name')}",
        "placeholder={t('onboarding.steps.ownerName.placeholder')}",
    ),
    (
        "{locale === 'he' ? 'איך ליצור איתך קשר?' :\n"
        "                 locale === 'ar' ? 'كيف يمكن التواصل معك؟' :\n"
        "                 locale === 'ru' ? 'Как с вами связаться?' :\n"
        "                 'How can customers contact you?'}",
        "{t('onboarding.steps.contact.title')}",
    ),
    (
        "{locale === 'he' ? 'מספר הטלפון והאימייל שיוצגו ללקוחות בעמוד ההזמנות. לקוחות יוכלו להתקשר ולשלוח הודעות.' :\n"
        "                 locale === 'ar' ? 'رقم الهاتف والبريد الإلكتروني الذي سيظهر للعملاء في صفحة الحجز. يمكن للعملاء الاتصال وإرسال الرسائل.' :\n"
        "                 locale === 'ru' ? 'Номер телефона и email, которые будут отображаться клиентам на странице бронирования. Клиенты смогут звонить и отправлять сообщения.' :\n"
        "                 'Phone and email shown on your booking page. Customers can call and message you.'}",
        "{t('onboarding.steps.contact.subtitle')}",
    ),
    (
        "{locale === 'he' ? 'מספר זה יוצג ללקוחות בעמוד ההזמנות ויוכלו להתקשר אליך' :\n"
        "                     locale === 'ar' ? 'سيظهر هذا الرقم للعملاء في صفحة الحجز ويمكنهم الاتصال بك' :\n"
        "                     locale === 'ru' ? 'Этот номер будет отображаться клиентам на странице бронирования, и они смогут вам позвонить' :\n"
        "                     'Customers will see this number on your booking page and can call you'}",
        "{t('onboarding.steps.contact.phoneHint')}",
    ),
    (
        "{locale === 'he' ? 'מספר הטלפון שלך:' :\n"
        "                             locale === 'ar' ? 'رقم هاتفك:' :\n"
        "                             locale === 'ru' ? 'Ваш номер телефона:' :\n"
        "                             'Your phone number:'}",
        "{t('onboarding.steps.contact.yourPhone')}",
    ),
    (
        "aria-label={locale === 'he' ? 'מספר טלפון' : locale === 'ar' ? 'رقم الهاتف' : locale === 'ru' ? 'Номер телефона' : 'Phone Number'}",
        "aria-label={t('onboarding.steps.contact.phoneLabel')}",
    ),
    (
        "{locale === 'he' ? 'השתמש במספר טלפון אחר לעסק שלי' :\n"
        "                         locale === 'ar' ? 'استخدم رقم هاتف مختلف لعملي' :\n"
        "                         locale === 'ru' ? 'Использовать другой номер телефона для моего бизнеса' :\n"
        "                         'Use a different phone number for my business'}",
        "{t('onboarding.steps.contact.useDifferentPhone')}",
    ),
    (
        "{locale === 'he' ? 'מספר הטלפון שלך יוצג ללקוחות בעמוד ההזמנות' :\n"
        "                       locale === 'ar' ? 'سيظهر رقم هاتفك للعملاء في صفحة الحجز' :\n"
        "                       locale === 'ru' ? 'Ваш номер телефона будет отображаться клиентам на странице бронирования' :\n"
        "                       'Your phone number will appear on your booking page'}",
        "{t('onboarding.steps.contact.phoneDisplayNote')}",
    ),
    (
        "{locale === 'he' ? 'אימייל (אופציונלי)' :\n"
        "                     locale === 'ar' ? 'البريد الإلكتروني (اختياري)' :\n"
        "                     locale === 'ru' ? 'Email (необязательно)' :\n"
        "                     'Email (optional)'}",
        "{t('onboarding.steps.contact.emailOptional')}",
    ),
    (
        "{locale === 'he' ? 'כתובת האימייל שתוצג ללקוחות בעמוד ההזמנות' :\n"
        "                     locale === 'ar' ? 'عنوان البريد الإلكتروني الذي سيظهر للعملاء في صفحة الحجز' :\n"
        "                     locale === 'ru' ? 'Email адрес, который будет отображаться клиентам на странице бронирования' :\n"
        "                     'Email address shown to customers on your booking page'}",
        "{t('onboarding.steps.contact.emailHint')}",
    ),
    (
        "{locale === 'he' ? 'מה הכתובת של העסק? (אופציונלי)' :\n"
        "                 locale === 'ar' ? 'ما عنوان العمل؟ (اختياري)' :\n"
        "                 locale === 'ru' ? 'Какой адрес бизнеса? (необязательно)' :\n"
        "                 \"What's the business address? (optional)\"}",
        "{t('onboarding.steps.address.title')}",
    ),
    (
        "{locale === 'he' ? 'נציג אותה ללקוחות (אופציונלי)' :\n"
        "                 locale === 'ar' ? 'سنعرضه للعملاء (اختياري)' :\n"
        "                 locale === 'ru' ? 'Мы покажем его клиентам (необязательно)' :\n"
        "                 \"We'll show it to customers (optional)\"}",
        "{t('onboarding.steps.address.subtitle')}",
    ),
    (
        "{locale === 'he' ? 'כתובת' :\n"
        "                     locale === 'ar' ? 'العنوان' :\n"
        "                     locale === 'ru' ? 'Адрес' :\n"
        "                     'Address'}",
        "{t('onboarding.steps.address.label')}",
    ),
    (
        "{locale === 'he' ? 'הוסף קישורי רשתות חברתיות להצגה בתחתית עמוד ההזמנות. הקישורים יפתחו באפליקציות המתאימות בלחיצה.' :\n"
        "                     locale === 'ar' ? 'أضف روابط وسائل التواصل الاجتماعي للعرض في أسفل صفحة الحجز. ستفتح الروابط في التطبيقات المناسبة عند النقر.' :\n"
        "                     locale === 'ru' ? 'Добавьте ссылки на социальные сети для отображения внизу страницы бронирования. Ссылки откроются в соответствующих приложениях при нажатии.' :\n"
        "                     'Add social network links to display at the bottom of the booking page. The links will open in the corresponding applications when clicked.'}",
        "{t('onboarding.steps.address.socialHint')}",
    ),
    (
        "{locale === 'he' ? 'הוסף קישור חברתי' :\n"
        "                             locale === 'ar' ? 'أضف رابط اجتماعي' :\n"
        "                             locale === 'ru' ? 'Добавить ссылку' :\n"
        "                             'Add Social Link'}",
        "{t('onboarding.steps.address.addSocialLink')}",
    ),
    (
        "{locale === 'he' ? 'בחרו את סוג העסק שמתאים לכם ביותר' :\n"
        "                 locale === 'ar' ? 'اختر نوع العمل الذي يناسبك' :\n"
        "                 locale === 'ru' ? 'Выберите тип бизнеса, который вам подходит' :\n"
        "                 'Choose the business type that fits you best'}",
        "{t('onboarding.chooseBusinessType.stepSubtitle')}",
    ),
    (
        "{locale === 'he' ? 'רק 2-3 שירותים להתחלה, תמיד אפשר להוסיף עוד אחרי ההקמה' :\n"
        "                 locale === 'ar' ? '2-3 خدمات فقط للبداية، يمكنك دائمًا إضافة المزيد بعد الإعداد' :\n"
        "                 locale === 'ru' ? 'Только 2-3 услуги для начала, всегда можно добавить больше после настройки' :\n"
        "                 'Just 2-3 services to start, you can always add more after setup'}",
        "{t('onboarding.steps.services.hint')}",
    ),
    (
        "{locale === 'he' ? 'דלג - תמיד אפשר להוסיף אחרי ההקמה' :\n"
        "                 locale === 'ar' ? 'تخطي - يمكنك دائمًا الإضافة بعد الإعداد' :\n"
        "                 locale === 'ru' ? 'Пропустить - всегда можно добавить после настройки' :\n"
        "                 'Skip - you can always add after setup'}",
        "{t('onboarding.steps.services.skip')}",
    ),
    (
        "{locale === 'he' ? 'שם השירות' :\n"
        "                     locale === 'ar' ? 'اسم الخدمة' :\n"
        "                     locale === 'ru' ? 'Название услуги' :\n"
        "                     'Service Name'}",
        "{t('onboarding.steps.services.serviceName')}",
    ),
    (
        "placeholder={locale === 'he' ? 'לדוגמה: תספורת' : (t('onboarding.services.namePlaceholder') || 'e.g., Haircut')}",
        "placeholder={t('onboarding.steps.services.serviceNamePlaceholder')}",
    ),
    (
        "{locale === 'he' ? 'תיאור (אופציונלי)' :\n"
        "                     locale === 'ar' ? 'الوصف (اختياري)' :\n"
        "                     locale === 'ru' ? 'Описание (необязательно)' :\n"
        "                     'Description (optional)'}",
        "{t('onboarding.steps.services.descriptionOptional')}",
    ),
    (
        "{locale === 'he' ? 'משך זמן (דקות)' :\n"
        "                     locale === 'ar' ? 'المدة (دقائق)' :\n"
        "                     locale === 'ru' ? 'Длительность (минуты)' :\n"
        "                     'Duration (minutes)'}",
        "{t('onboarding.steps.services.durationMinutes')}",
    ),
    (
        "{locale === 'he' ? 'מחיר (₪)' :\n"
        "                     locale === 'ar' ? 'السعر (₪)' :\n"
        "                     locale === 'ru' ? 'Цена (₪)' :\n"
        "                     'Price (₪)'}",
        "{t('onboarding.steps.services.priceIls')}",
    ),
]

count = 0
for old, new in replacements:
    occurrences = text.count(old)
    if occurrences:
        text = text.replace(old, new)
        count += occurrences
    else:
        print(f"MISSING ({occurrences}): {old[:60]}...")

# service counter template
text = re.sub(
    r"\{locale === 'he' \? `שירות \$\{serviceIndex \+ 1\} \(מתוך 3\)` :[\s\S]*?'Service \$\{serviceIndex \+ 1\} \(of 3\)'\}",
    "{t('onboarding.steps.services.serviceCounter').replace('{current}', String(serviceIndex + 1)).replace('{total}', '3')}",
    text,
    count=1,
)

path.write_text(text, encoding="utf-8")
print(f"applied {count} replacements")
