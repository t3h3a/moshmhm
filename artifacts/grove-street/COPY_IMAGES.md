# Copy Images Instructions

يجب نسخ الصور التالية من `C:\Users\admin\Downloads\Web-Asset-Manager\` إلى `C:\Users\admin\Downloads\Web-Asset-Manager\Web-Asset-Manager\artifacts\grove-street\public\`:

1. **card.png** → `public/card.png`
2. **chargre.png** → `public/chargre.png`

## الطريقة الأولى: عبر VS Code
1. فتح مستكشف الملفات (Windows Explorer)
2. انتقل إلى `C:\Users\admin\Downloads\Web-Asset-Manager\`
3. اختر `card.png` و `chargre.png`
4. اضغط `Ctrl+C` (نسخ)
5. انتقل إلى `C:\Users\admin\Downloads\Web-Asset-Manager\Web-Asset-Manager\artifacts\grove-street\public\`
6. اضغط `Ctrl+V` (لصق)

## الطريقة الثانية: عبر Command Prompt
```cmd
cd C:\Users\admin\Downloads\Web-Asset-Manager\
copy card.png "Web-Asset-Manager\artifacts\grove-street\public\card.png"
copy chargre.png "Web-Asset-Manager\artifacts\grove-street\public\chargre.png"
```

بعد نسخ الملفات:
1. شغّل `npm run dev` من مجلد grove-street
2. افتح المتصفح على الرابط المعطى
3. تحقق من ظهور الصورتين وحركتهما
