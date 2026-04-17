# EDUGPT — المساعد البيداغوجي التونسي

> منصة توليد الجذاذات الرسمية للمرحلة الابتدائية — وزارة التربية التونسية 2025-2026

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USER/edugpt-platform)

---

## المميزات

- ✅ توليد جذاذات بالهيكل الثماني الرسمي
- ✅ 7 مستويات × 9 مواد
- ✅ تصدير Word بالترويسة الرسمية (RTL صحيح)
- ✅ شبكة التقييم مع1/مع2/مع3
- ✅ مكتبة حفظ الجذاذات
- ✅ Claude Sonnet API

---

## هيكل الملفات

```
edugpt-platform/
├── index.html          ← التطبيق الكامل
├── api/
│   └── claude.js       ← Vercel serverless proxy
├── generate_docx.js    ← مولّد DOCX (Node.js)
├── vercel.json         ← إعدادات النشر
├── .env.example        ← نموذج المتغيرات
└── README.md
```

---

## النشر على Vercel

### الطريقة السريعة

1. **ارفع على GitHub:**
   ```bash
   git init
   git add .
   git commit -m "init: EDUGPT platform"
   git remote add origin https://github.com/YOUR_USER/edugpt-platform.git
   git push -u origin main
   ```

2. **اذهب إلى** https://vercel.com/new → اختر `edugpt-platform`

3. **أضف متغير البيئة:**
   - `CLAUDE_API_KEY` = مفتاحك من https://console.anthropic.com

4. **اضغط Deploy** ✅

---

## التشغيل المحلي

```bash
# بدون API (عرض فقط)
npx serve .

# مع Vercel Dev (API كاملة)
npm i -g vercel
cp .env.example .env   # أضف مفتاحك
vercel dev
```

---

## متغيرات البيئة

| المتغير | الوصف |
|---------|-------|
| `CLAUDE_API_KEY` | مفتاح Anthropic API |

---

*EDUGPT — وزارة التربية التونسية 2025-2026*
