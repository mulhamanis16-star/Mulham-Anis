# Nova AI Stores API

خادم منفصل وآمن لتوليد محتوى المنتجات باستخدام Cloudflare Workers AI.

## النشر الأولي
1. أنشئ حساب Cloudflare وسجّل الدخول.
2. افتح Workers & Pages ثم أنشئ Worker باسم `nova-ai-stores-api`.
3. انشر هذا المشروع من مجلد `nova-ai-api` باستخدام Wrangler، أو أنشئ Worker والصق محتوى `src/index.ts`.
4. فعّل Workers AI binding باسم `AI` من إعدادات Worker: Settings > Bindings > Add > Workers AI.
5. أعد نشر Worker بعد إضافة الربط.
6. انسخ رابط Worker (مثل `https://nova-ai-stores-api.<your-subdomain>.workers.dev`).
7. الصق الرابط داخل إعدادات الذكاء الاصطناعي في تطبيق Nova.

## النشر عبر Wrangler
يتطلب Node.js وnpm ووجود حساب Cloudflare:
```bash
npx wrangler login
cd nova-ai-api
npx wrangler deploy
```
ثم تأكد من وجود ربط Workers AI باسم `AI` في إعدادات Worker وأعد النشر.

## الأمان
- لا يوجد مفتاح API في تطبيق المتصفح أو المستودع.
- يقبل الخادم الطلبات من نطاق GitHub Pages الخاص بالتطبيق فقط.
- يحدد أطوال المدخلات ويتحقق من منصة البيع.
- لا ترسل بيانات شخصية أو سرية ضمن مواصفات المنتجات.
- الحصة المجانية محدودة وقد تتوقف الطلبات عند استنفادها.
