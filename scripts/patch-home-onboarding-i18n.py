#!/usr/bin/env python3
"""Patch home + onboarding i18n keys across all locale files."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "messages"

HE_PATCH = {
    "home": {
        "seeFeatures": "מה יש בפנים?",
        "contact": {
            "description": "רוצים לדבר? כתבו לנו – נחזור אליכם.",
            "success": "קיבלנו! נחזור אליכם בקרוב.",
        },
        "preview": {
            "withBooking": "עם הזמנות",
            "businessCard": "כרטיס ביקור",
            "mobile": "נייד",
            "desktop": "מחשב",
            "modalBooking": "עם הזמנות",
            "modalCard": "כרטיס",
        },
        "pricing": {
            "basic": "בסיסי",
            "customPlan": "Custom",
            "startingFrom": "החל מ-",
            "free": "חינם",
            "proPriceNote": "למקצוענים שבינינו",
            "noCreditCard": "אין צורך בכרטיס אשראי",
        },
        "customFeatures": {
            "title": "תכונות נוספות שאפשר לפתח",
            "subtitle": "פתרונות מתקדמים ומותאמים לצרכים שלכם",
            "items": {
                "apiAccess": {
                    "title": "גישה ל-API",
                    "desc": "אינטגרציה מלאה עם המערכות שלכם",
                },
                "whiteLabel": {
                    "title": "פתרון White-Label",
                    "desc": "מותג מותאם בלי הלוגו שלנו",
                },
                "customIntegrations": {
                    "title": "אינטגרציות מותאמות",
                    "desc": "חיבור ל-CRM, ERP וכלים נוספים",
                },
                "advancedReports": {
                    "title": "דוחות מתקדמים",
                    "desc": "דוחות וניתוחים מותאמים לעסק",
                },
                "multiLocation": {
                    "title": "תמיכה במיקומים מרובים",
                    "desc": "ניהול כמה סניפים ממקום אחד",
                },
                "customWorkflows": {
                    "title": "זרימות עבודה מותאמות",
                    "desc": "אוטומציה לתהליכים שלכם",
                },
                "advancedAutomation": {
                    "title": "אוטומציה מתקדמת",
                    "desc": "כללי עסק וטריגרים מותאמים",
                },
                "dedicatedSupport": {
                    "title": "תמיכה ייעודית",
                    "desc": "מנהל/ת חשבון ותמיכה 24/7",
                },
                "customDevelopment": {
                    "title": "פיתוח מותאם",
                    "desc": "תכונות ייחודיות לפי הזמנה",
                },
            },
        },
    },
    "onboarding": {
        "alreadyRegistered": "כבר יש לכם עסק רשום. התחברו לעסק הקיים.",
        "lessThanMinute": "זה לוקח פחות מדקה :)",
        "planBanner": {
            "freeForever": "חינם לנצח – בלי אמצעי תשלום",
            "freeNoPayment": "חינם – בלי אמצעי תשלום",
        },
        "chooseBusinessType": {
            "stepSubtitle": "בחרו את סוג העסק שהכי מתאים לכם",
        },
        "steps": {
            "reassurance": "💡 לא לדאוג – אפשר לשנות הכל אחר כך",
            "fieldRequired": "שדה חובה",
            "businessName": {
                "title": "איך קוראים לעסק?",
                "subtitle": "כך הלקוחות יראו אותו בעמוד ההזמנות",
                "label": "שם העסק",
                "placeholder": "לדוגמה: סטודיו חן פיטנס",
                "preview": "✨ כך זה ייראה ללקוחות:",
            },
            "ownerName": {
                "title": "איך קוראים לכם?",
                "subtitle": "כך נציג אתכם במערכת",
                "greeting": "👋 נעים להכיר!",
                "label": "שם הבעלים",
                "placeholder": "שם בעל העסק",
            },
            "contact": {
                "title": "איך יוצרים איתכם קשר?",
                "subtitle": "הטלפון והאימייל שיוצגו ללקוחות בעמוד ההזמנות",
                "phoneHint": "המספר הזה יוצג ללקוחות – הם יוכלו להתקשר אליכם",
                "yourPhone": "מספר הטלפון שלכם:",
                "phoneLabel": "מספר טלפון",
                "useDifferentPhone": "להשתמש במספר אחר לעסק",
                "phoneDisplayNote": "המספר יוצג ללקוחות בעמוד ההזמנות",
                "emailOptional": "אימייל (אופציונלי)",
                "emailHint": "כתובת האימייל שתוצג ללקוחות בעמוד ההזמנות",
            },
            "address": {
                "title": "מה הכתובת של העסק? (אופציונלי)",
                "subtitle": "נציג אותה ללקוחות (אופציונלי)",
                "label": "כתובת",
                "socialHint": "הוסיפו קישורי רשתות חברתיות בתחתית עמוד ההזמנות. הקישורים ייפתחו באפליקציה המתאימה.",
                "addSocialLink": "הוסף קישור חברתי",
            },
            "services": {
                "hint": "2–3 שירותים להתחלה – תמיד אפשר להוסיף אחר כך",
                "skip": "דלג – תמיד אפשר להוסיף אחרי ההקמה",
                "serviceName": "שם השירות",
                "serviceNamePlaceholder": "לדוגמה: תספורת",
                "descriptionOptional": "תיאור (אופציונלי)",
                "durationMinutes": "משך זמן (דקות)",
                "priceIls": "מחיר (₪)",
                "serviceCounter": "שירות {current} (מתוך {total})",
            },
        },
        "errors": {
            "selectBusinessType": "בחרו סוג עסק כדי להמשיך.",
        },
        "businessInfo": {
            "namePlaceholder": "לדוגמה: סטודיו חן פיטנס",
            "ownerNamePlaceholder": "שם בעל העסק",
        },
    },
}

EN_PATCH = {
    "home": {
        "seeFeatures": "See what's inside",
        "contact": {
            "description": "Want to talk? Write to us — we'll get back to you.",
            "success": "Got it! We'll be in touch soon.",
        },
        "preview": {
            "withBooking": "With Booking",
            "businessCard": "Business Card",
            "mobile": "Mobile",
            "desktop": "Desktop",
            "modalBooking": "Booking",
            "modalCard": "Card",
        },
        "pricing": {
            "basic": "Basic",
            "customPlan": "Custom",
            "startingFrom": "From ",
            "free": "Free",
            "proPriceNote": "For pros who mean business",
            "noCreditCard": "No credit card required",
        },
        "customFeatures": {
            "title": "Additional features we can build",
            "subtitle": "Advanced, tailored solutions for your needs",
            "items": {
                "apiAccess": {"title": "API Access", "desc": "Full integration with your systems"},
                "whiteLabel": {"title": "White-Label Solution", "desc": "Your brand, without our logo"},
                "customIntegrations": {"title": "Custom Integrations", "desc": "Connect CRM, ERP, and other tools"},
                "advancedReports": {"title": "Advanced Reports", "desc": "Custom reports and deep analytics"},
                "multiLocation": {"title": "Multi-Location Support", "desc": "Manage multiple branches from one place"},
                "customWorkflows": {"title": "Custom Workflows", "desc": "Automation for your processes"},
                "advancedAutomation": {"title": "Advanced Automation", "desc": "Custom business rules and triggers"},
                "dedicatedSupport": {"title": "Dedicated Support", "desc": "Account manager and 24/7 support"},
                "customDevelopment": {"title": "Custom Development", "desc": "Unique features built to order"},
            },
        },
    },
    "onboarding": {
        "alreadyRegistered": "You already have a registered business. Please log in to your existing business.",
        "lessThanMinute": "Takes less than a minute :)",
        "planBanner": {
            "freeForever": "Free forever — no payment method needed",
            "freeNoPayment": "Free — no payment method needed",
        },
        "chooseBusinessType": {
            "stepSubtitle": "Choose the business type that fits you best",
        },
        "steps": {
            "reassurance": "💡 Don't worry — you can change everything later",
            "fieldRequired": "This field is required",
            "businessName": {
                "title": "What's your business called?",
                "subtitle": "This is what customers will see on your booking page",
                "label": "Business name",
                "placeholder": "e.g., Chen Fitness Studio",
                "preview": "✨ Here's how customers will see it:",
            },
            "ownerName": {
                "title": "What's your name?",
                "subtitle": "This is how we'll show you in the system",
                "greeting": "👋 Nice to meet you!",
                "label": "Owner name",
                "placeholder": "Business owner name",
            },
            "contact": {
                "title": "How can customers reach you?",
                "subtitle": "Phone and email shown on your booking page",
                "phoneHint": "Customers will see this number and can call you",
                "yourPhone": "Your phone number:",
                "phoneLabel": "Phone number",
                "useDifferentPhone": "Use a different phone number for my business",
                "phoneDisplayNote": "Your number will appear on your booking page",
                "emailOptional": "Email (optional)",
                "emailHint": "Email address shown to customers on your booking page",
            },
            "address": {
                "title": "What's the business address? (optional)",
                "subtitle": "We'll show it to customers (optional)",
                "label": "Address",
                "socialHint": "Add social links at the bottom of your booking page. Links open in the matching app.",
                "addSocialLink": "Add social link",
            },
            "services": {
                "hint": "Start with 2–3 services — you can add more later",
                "skip": "Skip — you can add services after setup",
                "serviceName": "Service name",
                "serviceNamePlaceholder": "e.g., Haircut",
                "descriptionOptional": "Description (optional)",
                "durationMinutes": "Duration (minutes)",
                "priceIls": "Price (₪)",
                "serviceCounter": "Service {current} (of {total})",
            },
        },
        "errors": {
            "selectBusinessType": "Please select a business type to continue.",
        },
        "businessInfo": {
            "namePlaceholder": "e.g., Chen Fitness Studio",
            "ownerNamePlaceholder": "Business owner name",
        },
    },
}

AR_PATCH = {
    "home": {
        "seeFeatures": "ما الموجود؟",
        "contact": {
            "description": "تريد التحدث؟ اكتب لنا — سنعود إليك.",
            "success": "تم! سنتواصل معك قريبًا.",
        },
        "preview": {
            "withBooking": "مع الحجز",
            "businessCard": "بطاقة عمل",
            "mobile": "جوال",
            "desktop": "كمبيوتر",
            "modalBooking": "حجز",
            "modalCard": "بطاقة",
        },
        "pricing": {
            "basic": "أساسي",
            "customPlan": "Custom",
            "startingFrom": "بدءًا من ",
            "free": "مجاني",
            "proPriceNote": "للمحترفين",
            "noCreditCard": "لا حاجة لبطاقة ائتمان",
        },
        "customFeatures": {
            "title": "ميزات إضافية يمكننا تطويرها",
            "subtitle": "حلول متقدمة ومخصصة لاحتياجاتك",
            "items": {
                "apiAccess": {"title": "وصول API", "desc": "تكامل كامل مع أنظمتك"},
                "whiteLabel": {"title": "حل White-Label", "desc": "علامتك التجارية بدون شعارنا"},
                "customIntegrations": {"title": "تكاملات مخصصة", "desc": "ربط CRM وERP وأدوات أخرى"},
                "advancedReports": {"title": "تقارير متقدمة", "desc": "تقارير وتحليلات مخصصة"},
                "multiLocation": {"title": "دعم مواقع متعددة", "desc": "إدارة فروع متعددة من مكان واحد"},
                "customWorkflows": {"title": "سير عمل مخصص", "desc": "أتمتة لعملياتك"},
                "advancedAutomation": {"title": "أتمتة متقدمة", "desc": "قواعد عمل ومشغلات مخصصة"},
                "dedicatedSupport": {"title": "دعم مخصص", "desc": "مدير حساب ودعم 24/7"},
                "customDevelopment": {"title": "تطوير مخصص", "desc": "ميزات فريدة حسب الطلب"},
            },
        },
    },
    "onboarding": {
        "alreadyRegistered": "لديك بالفعل عمل مسجل. يرجى تسجيل الدخول إلى عملك الحالي.",
        "lessThanMinute": "يستغرق أقل من دقيقة :)",
        "planBanner": {
            "freeForever": "مجاني إلى الأبد — لا حاجة لوسيلة دفع",
            "freeNoPayment": "مجاني — لا حاجة لوسيلة دفع",
        },
        "chooseBusinessType": {
            "stepSubtitle": "اختر نوع العمل الذي يناسبك",
        },
        "steps": {
            "reassurance": "💡 لا تقلق — يمكن تغيير كل شيء لاحقًا",
            "fieldRequired": "هذا الحقل مطلوب",
            "businessName": {
                "title": "ما اسم عملك؟",
                "subtitle": "هكذا سيراه العملاء في صفحة الحجز",
                "label": "اسم العمل",
                "placeholder": "مثال: استوديو تشen للياقة",
                "preview": "✨ هكذا سيظهر للعملاء:",
            },
            "ownerName": {
                "title": "ما اسمك؟",
                "subtitle": "هكذا سنعرضك في النظام",
                "greeting": "👋 سعيد بلقائك!",
                "label": "اسم المالك",
                "placeholder": "اسم صاحب العمل",
            },
            "contact": {
                "title": "كيف يمكن التواصل معك؟",
                "subtitle": "الهاتف والبريد المعروضان في صفحة الحجز",
                "phoneHint": "سيظهر هذا الرقم للعملاء ويمكنهم الاتصال بك",
                "yourPhone": "رقم هاتفك:",
                "phoneLabel": "رقم الهاتف",
                "useDifferentPhone": "استخدم رقم هاتف مختلف لعملي",
                "phoneDisplayNote": "سيظهر رقمك للعملاء في صفحة الحجز",
                "emailOptional": "البريد الإلكتروني (اختياري)",
                "emailHint": "البريد المعروض للعملاء في صفحة الحجز",
            },
            "address": {
                "title": "ما عنوان العمل؟ (اختياري)",
                "subtitle": "سنعرضه للعملاء (اختياري)",
                "label": "العنوان",
                "socialHint": "أضف روابط التواصل في أسفل صفحة الحجز. تفتح في التطبيق المناسب.",
                "addSocialLink": "أضف رابط اجتماعي",
            },
            "services": {
                "hint": "2–3 خدمات للبداية — يمكنك إضافة المزيد لاحقًا",
                "skip": "تخطي — يمكنك الإضافة بعد الإعداد",
                "serviceName": "اسم الخدمة",
                "serviceNamePlaceholder": "مثال: قص شعر",
                "descriptionOptional": "الوصف (اختياري)",
                "durationMinutes": "المدة (دقائق)",
                "priceIls": "السعر (₪)",
                "serviceCounter": "خدمة {current} (من {total})",
            },
        },
        "errors": {
            "selectBusinessType": "يرجى اختيار نوع العمل للمتابعة.",
        },
        "businessInfo": {
            "namePlaceholder": "مثال: استوديو للياقة",
            "ownerNamePlaceholder": "اسم صاحب العمل",
        },
    },
}

RU_PATCH = {
    "home": {
        "seeFeatures": "Что внутри?",
        "contact": {
            "description": "Хотите поговорить? Напишите — мы ответим.",
            "success": "Получили! Скоро свяжемся.",
        },
        "preview": {
            "withBooking": "С записью",
            "businessCard": "Визитка",
            "mobile": "Мобильный",
            "desktop": "Десктоп",
            "modalBooking": "Запись",
            "modalCard": "Карточка",
        },
        "pricing": {
            "basic": "Basic",
            "customPlan": "Custom",
            "startingFrom": "От ",
            "free": "Бесплатно",
            "proPriceNote": "Для профессионалов",
            "noCreditCard": "Карта не нужна",
        },
        "customFeatures": {
            "title": "Дополнительные функции под заказ",
            "subtitle": "Продвинутые решения под ваши задачи",
            "items": {
                "apiAccess": {"title": "Доступ к API", "desc": "Полная интеграция с вашими системами"},
                "whiteLabel": {"title": "White-Label", "desc": "Ваш бренд без нашего логотипа"},
                "customIntegrations": {"title": "Кастомные интеграции", "desc": "CRM, ERP и другие инструменты"},
                "advancedReports": {"title": "Расширенные отчёты", "desc": "Кастомная аналитика"},
                "multiLocation": {"title": "Несколько локаций", "desc": "Управление филиалами из одного места"},
                "customWorkflows": {"title": "Кастомные процессы", "desc": "Автоматизация ваших процессов"},
                "advancedAutomation": {"title": "Продвинутая автоматизация", "desc": "Правила и триггеры"},
                "dedicatedSupport": {"title": "Выделенная поддержка", "desc": "Менеджер и поддержка 24/7"},
                "customDevelopment": {"title": "Разработка под заказ", "desc": "Уникальные функции"},
            },
        },
    },
    "onboarding": {
        "alreadyRegistered": "У вас уже есть зарегистрированный бизнес. Войдите в существующий аккаунт.",
        "lessThanMinute": "Займёт меньше минуты :)",
        "planBanner": {
            "freeForever": "Бесплатно навсегда — оплата не нужна",
            "freeNoPayment": "Бесплатно — оплата не нужна",
        },
        "chooseBusinessType": {
            "stepSubtitle": "Выберите тип бизнеса, который вам подходит",
        },
        "steps": {
            "reassurance": "💡 Не переживайте — всё можно изменить позже",
            "fieldRequired": "Обязательное поле",
            "businessName": {
                "title": "Как называется ваш бизнес?",
                "subtitle": "Так клиенты увидят его на странице записи",
                "label": "Название бизнеса",
                "placeholder": "например, Chen Fitness Studio",
                "preview": "✨ Так это увидят клиенты:",
            },
            "ownerName": {
                "title": "Как вас зовут?",
                "subtitle": "Так мы покажем вас в системе",
                "greeting": "👋 Приятно познакомиться!",
                "label": "Имя владельца",
                "placeholder": "Имя владельца бизнеса",
            },
            "contact": {
                "title": "Как с вами связаться?",
                "subtitle": "Телефон и email на странице записи",
                "phoneHint": "Клиенты увидят этот номер и смогут позвонить",
                "yourPhone": "Ваш номер телефона:",
                "phoneLabel": "Номер телефона",
                "useDifferentPhone": "Использовать другой номер для бизнеса",
                "phoneDisplayNote": "Номер будет на странице записи",
                "emailOptional": "Email (необязательно)",
                "emailHint": "Email, который увидят клиенты",
            },
            "address": {
                "title": "Адрес бизнеса? (необязательно)",
                "subtitle": "Покажем клиентам (необязательно)",
                "label": "Адрес",
                "socialHint": "Добавьте соцсети внизу страницы записи. Ссылки откроются в нужном приложении.",
                "addSocialLink": "Добавить ссылку",
            },
            "services": {
                "hint": "Начните с 2–3 услуг — добавите позже",
                "skip": "Пропустить — добавите после настройки",
                "serviceName": "Название услуги",
                "serviceNamePlaceholder": "например, Стрижка",
                "descriptionOptional": "Описание (необязательно)",
                "durationMinutes": "Длительность (мин)",
                "priceIls": "Цена (₪)",
                "serviceCounter": "Услуга {current} (из {total})",
            },
        },
        "errors": {
            "selectBusinessType": "Выберите тип бизнеса, чтобы продолжить.",
        },
        "businessInfo": {
            "namePlaceholder": "например, Chen Fitness Studio",
            "ownerNamePlaceholder": "Имя владельца бизнеса",
        },
    },
}

PATCHES = {"he": HE_PATCH, "en": EN_PATCH, "ar": AR_PATCH, "ru": RU_PATCH}


def deep_merge(base, patch):
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge(base[key], value)
        else:
            base[key] = value


def remove_duplicate_feature_keys(data):
    features = data.get("home", {}).get("features", {})
    if not isinstance(features, dict):
        return
    seen = set()
    to_remove = []
    for key in list(features.keys()):
        if key in ("title", "subtitle"):
            continue
        if key in seen:
            to_remove.append(key)
        else:
            seen.add(key)
    for key in to_remove:
        del features[key]


for locale, patch in PATCHES.items():
    path = ROOT / f"{locale}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    deep_merge(data, patch)
    if locale == "he":
        remove_duplicate_feature_keys(data)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"patched {locale}.json")

print("done")
