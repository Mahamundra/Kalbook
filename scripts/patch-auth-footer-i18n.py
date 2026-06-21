#!/usr/bin/env python3
"""Patch auth + footer i18n keys across all locale files."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "messages"

AUTH_PATCH = {
    "he": {
        "enterPhone": "הזינו מספר טלפון",
        "verifyCode": "אימות קוד",
        "completeRegistration": "סיום ההרשמה",
        "phonePlaceholder": "050-123-4567",
        "sendCode": "שליחת קוד",
        "namePlaceholder": "השם המלא שלכם",
        "selectGender": "בחירת מין",
        "registrationSuccess": "נרשמתם בהצלחה!",
        "invalidCode": "קוד שגוי – נסו שוב",
        "welcomeBack": "שמחים לראות אתכם, {{name}}!",
        "customerNotFound": "לא מצאנו אתכם – השלימו הרשמה כדי להמשיך",
        "confirmLogout": "בטוחים שרוצים להתנתק?",
        "fillRequiredFields": "יש למלא את כל השדות החובה",
        "invalidPhone": "הזינו מספר טלפון תקין",
        "sendCodeError": "שליחת הקוד נכשלה",
        "codeSentToWhatsApp": "קוד נשלח אל {phone} ב-WhatsApp",
        "enterWhatsAppCode": "הזינו את הקוד שקיבלתם ב-WhatsApp",
        "googleLoginError": "ההתחברות עם Google נכשלה",
        "facebookLoginError": "ההתחברות עם Facebook נכשלה",
    },
    "en": {
        "fillRequiredFields": "Please fill in all required fields",
        "invalidPhone": "Please enter a valid phone number",
        "sendCodeError": "Failed to send code",
        "codeSentToWhatsApp": "Code sent to {phone} via WhatsApp",
        "enterWhatsAppCode": "Enter the code you received on WhatsApp",
        "googleLoginError": "Failed to sign in with Google",
        "facebookLoginError": "Failed to sign in with Facebook",
    },
    "ar": {
        "fillRequiredFields": "يرجى ملء جميع الحقول المطلوبة",
        "invalidPhone": "يرجى إدخال رقم هاتف صحيح",
        "sendCodeError": "فشل إرسال الرمز",
        "codeSentToWhatsApp": "تم إرسال الرمز إلى {phone} عبر WhatsApp",
        "enterWhatsAppCode": "أدخلوا الرمز الذي استلمتموه على WhatsApp",
        "googleLoginError": "فشل تسجيل الدخول عبر Google",
        "facebookLoginError": "فشل تسجيل الدخول عبر Facebook",
    },
    "ru": {
        "fillRequiredFields": "Заполните все обязательные поля",
        "invalidPhone": "Введите действительный номер телефона",
        "sendCodeError": "Не удалось отправить код",
        "codeSentToWhatsApp": "Код отправлен на {phone} через WhatsApp",
        "enterWhatsAppCode": "Введите код, полученный в WhatsApp",
        "googleLoginError": "Не удалось войти через Google",
        "facebookLoginError": "Не удалось войти через Facebook",
    },
}

FOOTER_PATCH = {
    "he": {"copyright": "© {year} Kalbook.io · {rights}"},
    "en": {"copyright": "© {year} Kalbook.io · {rights}"},
    "ar": {"copyright": "© {year} Kalbook.io · {rights}"},
    "ru": {"copyright": "© {year} Kalbook.io · {rights}"},
}


def deep_update(target: dict, updates: dict) -> None:
    for key, value in updates.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            deep_update(target[key], value)
        else:
            target[key] = value


for locale in ["he", "en", "ar", "ru"]:
    path = ROOT / f"{locale}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    deep_update(data["auth"], AUTH_PATCH[locale])
    deep_update(data["home"]["footer"], FOOTER_PATCH[locale])
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Patched {locale}.json")
