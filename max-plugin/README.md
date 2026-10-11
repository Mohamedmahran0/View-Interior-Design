# View Interior Design - 3ds Max Exporter Plugin (.NET / C#)

هذه الإضافة الرسمية لبرنامج Autodesk 3ds Max تتيح للمهندسين والمصممين تصدير المشاهد المعمارية ثلاثية الأبعاد مباشرة كملف GLB ورفعها سحابياً إلى منصة View Interior Design عبر API ومزامنتها في Supabase Storage.

---

## 🛠 المتطلبات (Prerequisites)
1. **Autodesk 3ds Max** (الإصدار 2020 أو أحدث - 2024/2025 مُفضّل).
2. **.NET Framework 4.8 SDK** أو Visual Studio 2022.
3. إضافة **Khronos glTF 2.0 Exporter** لـ 3ds Max (مدمجة افتراضياً في 3ds Max 2023+ أو قابلة للتثبيت من مستودع Khronos الرسمي).

---

## 📦 التجميع (Compilation)
يمكنك تجميع المشروع باستخدام .NET CLI أو Visual Studio:

```bash
cd max-plugin
dotnet build -c Release
```

سيتم إنشاء ملف المكتبة في:
`bin/Release/net48/ViewInteriorDesignMaxPlugin.dll`

---

## 🚀 التشغيل داخل 3ds Max

### الطريقة 1: عبر MAXScript
داخل نافذة MAXScript Listener في 3ds Max:

```maxscript
dotnet.loadAssembly @"C:\Path\To\ViewInteriorDesignMaxPlugin.dll"
(dotnetclass "ViewInteriorDesign.MaxPlugin.PluginEntry").OpenExporterWindow()
```

### الطريقة 2: إنشاء زر شريط الأدوات (MacroScript)
احفظ الكود التالي كملف `.mcr` في مجلد `stdplugs` أو `usermacros`:

```maxscript
macroScript ViewInteriorDesignExport
category:"View Interior Design"
tooltip:"Export & Upload to View Cloud"
buttonText:"View Cloud"
(
    dotnet.loadAssembly (getDir #maxroot + "\\bin\\assemblies\\ViewInteriorDesignMaxPlugin.dll")
    (dotnetclass "ViewInteriorDesign.MaxPlugin.PluginEntry").OpenExporterWindow()
)
```

---

## 🔒 المصادقة والرفع (Authentication & Upload)
1. افتح نافذة الإضافة من 3ds Max.
2. أدخل عنوان المنصة: `https://viewinteriordesign.com` (أو الرابط الخاص بك على Vercel).
3. أدخل رمز Supabase JWT الخاص بحسابك (يمكن نسخه من إعدادات حسابك في المنصة).
4. اكتب اسم المشروع واضغط **Export & Upload**.
5. بمجرد اكتمال الرفع بنسبة 100%، سيظهر رابط المعاينة المباشر لمشاركته مع العميل أو فتحه في محرر الويب!
