# تحديثات Grove Street - الشخصية GC والكرت

## الملفات المحدثة

### 1. src/components/GCCharacterShowcase.tsx
- **التغيير**: استبدال عرض الشخصية الثابت بكرت يحتوي على:
  - **card.png**: صورة الخلفية (من C:\Users\admin\Downloads\Web-Asset-Manager\card.png)
  - **chargre.png**: الشخصية تطير وتدور بشكل عشوائي
- **الحركة**: تدوير لطيف + تحرك عشوائي (غير سريع)
- **التأثير**: drop-shadow خفيف للعمق

### 2. src/components/FloatingCigarettesBackground.tsx
- **التغيير**: تحديث مسار الصورة من `/images/characters/gc-character.png` إلى `/chargre.png`
- **تبسيط**: حجم الجزيئات أصغر (0.15-0.27 بدلاً من 0.28-0.5)
- **سرعة**: حركة أبطأ وأكثر سلاسة (22-40 ثانية)
- **دوران**: 360 درجة كاملة (بدلاً من 12-24 درجة)
- **الشفافية**: 20-35% (بدلاً من 18-35%)
- **إزالة**: تم إزالة debug note

### 3. src/index.css
**تحديثات GCCharacterShowcase:**
- جديد: `.gc-character-showcase` - الحاوية الأساسية
- جديد: `.gc-card-bg` و `.gc-card-image` - خلفية الكرت
- جديد: `.gc-floating-char` - حاوية الشخصية المتحركة
- جديد: `.gc-sprite-animated` - الشخصية نفسها مع الحركة
- جديد: `@keyframes gc-float-random` - حركة تحتية عشوائية (6 ثواني)
- جديد: `@keyframes gc-spin-gentle` - دوران لطيف على محور Y (8 ثواني)
- جديد: `@keyframes gc-bob` - حركة ارتفاع هابطة (4 ثواني)

**تحديثات FloatingCigarettesBackground:**
- تحديث: `@keyframes gc-sprite-float` - أبطأ وأسهل (ease-in-out بدلاً من linear)
- تحديث: `.gc-sprite` - أبسط بدون background-image
- جديد: `.gc-sprite-img` - لصورة الشخصية

**Responsive Design:**
- Desktop: كرت بحجم 360px مع شخصية متحركة
- Tablet (>1024px): 250px × 350px بـ opacity 72%
- Mobile (<640px): 178px × 250px مع جعلها في الأسفل و opacity 38%

## خطوات التشغيل

### الخطوة 1: نسخ الصور
```cmd
cd C:\Users\admin\Downloads\Web-Asset-Manager\
copy card.png "Web-Asset-Manager\artifacts\grove-street\public\card.png"
copy chargre.png "Web-Asset-Manager\artifacts\grove-street\public\chargre.png"
```

### الخطوة 2: تشغيل خادم التطوير
```cmd
cd C:\Users\admin\Downloads\Web-Asset-Manager\Web-Asset-Manager\artifacts\grove-street
npm run dev
```

### الخطوة 3: التحقق
افتح المتصفح على الرابط المعطى من npm (عادة `http://localhost:5173`) وتحقق من:
- ✅ ظهور كرت جنب Grove Street على الديسكتوب
- ✅ كرت على الأعلى للهاتف (أسفل صفحة)
- ✅ شخصية GC تطير وتدور داخل الكرت بسلاسة
- ✅ خلفية السجائر تتحرك كما هي
- ✅ الشخصيات GC الخفيفة تطير بدون الكرت في الخلفية
- ✅ عدم وجود أي أخطاء في console

## الفروقات

| الميزة | قبل | بعد |
|--------|------|------|
| صورة الشخصية | gc-character.png | chargre.png |
| حجم الجزيئات الخلفية | 0.28-0.5 | 0.15-0.27 |
| سرعة الحركة | 28-60s | 22-40s |
| طريقة التدوير | -12 إلى 24 درجة | 360 درجة كاملة |
| الشفافية | 18-35% | 20-35% |
| وظيفة التوقيت | linear | ease-in-out |

## ملاحظات

1. **الصور المفقودة**: إذا لم تظهر الصور، تأكد من نسخها إلى `public/` بالاسم الصحيح
2. **الأداء**: الحركات تستخدم CSS animations (GPU-accelerated) وليست JS
3. **الهاتف**: على الهاتف يظهر جزء واحد فقط من الشخصيات GC بدلاً من 3
4. **الخلفية**: يمكن تفعيل/تعطيل التأثيرات من الإعدادات
