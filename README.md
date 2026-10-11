# 🛋️ View Interior Design - 3D Architectural & Interior SaaS Platform

منصة سحابية متكاملة للتصميم الداخلي والعمارة ثلاثية الأبعاد (3D Interior Design SaaS Platform) تتيح للمهندسين والمصممين تصدير أعمالهم من برنامج **Autodesk 3ds Max** مباشرة إلى الويب، ومعاينتها بواقعية فائقة في المتصفح، وتعديلها عبر محرر 3D متقدم، مع نظام دفع واشتراكات مدعوم بواسطة **Paddle Billing** وتخزين سحابي عبر **Supabase**.

---

## 🌟 المزايا الرئيسية (Key Features)

1. **محرر ويب احترافي ثلاثي الأبعاد (Pro 3D Web Editor):**
   - مبني بواسطة **Three.js** و **React Three Fiber (@react-three/fiber)** و **Drei**.
   - أداة تحويل وتعديل الكائنات **TransformControls** (نقل `W`، تدوير `E`، تحجيم `R`).
   - تراجع وإعادة متكاملة **Undo / Redo** (50 خطوة عبر اختصارات `Ctrl+Z` و `Ctrl+Shift+Z`).
   - محرر مواد فيزيائية واقعية **PBR Materials** (اللون، الخشونة Roughness، اللمعان المعدني Metalness).
   - لوحة تحكم تفصيلية في إحداثيات ومقاييس الكائنات (Position, Rotation, Scale).
   - حفظ تلقائي دوري كل 30 ثانية في Supabase مع إشعار مرئي.
   - إمكانية تصدير المشهد مباشرة كملف **GLB** بنقرة واحدة عبر المتصفح.

2. **نظام إضاءة HDR سينمائي واقعي (Photorealistic HDR Lighting):**
   - دعم خرائط البيئة HDR ببيئات متعددة (Studio, Apartment, City, Sunset, Dawn, Warehouse, Night).
   - تحكم كامل في شدة الإضاءة (0 إلى 5) وتدوير البيئة (0 إلى 360 درجة).
   - خيار إظهار أو إخفاء خلفية الـ HDR.
   - خوارزمية ألوان سينمائية **ACESFilmicToneMapping** وظلال ناعمة **PCFSoftShadowMap**.

3. **تجول من منظور الشخص الأول (First-Person Walkthrough):**
   - محاكاة حركة واقعية بنظام WASD وحركة الماوس (PointerLockControls).
   - تثبيت الكاميرا عند ارتفاع عين الإنسان الطبيعي (1.7 متر).

4. **تكامل Supabase الكامل (Auth + PostgreSQL + Storage + RLS):**
   - عزل بيانات المشاريع عبر سياسات أمان مستوى الصف (Row Level Security).
   - مسار التخزين المخصص للنماذج: `models/{user_id}/{project_id}/scene.glb`.
   - روابط مشاركة عامة مشفرة عبر `share_token`.

5. **بوابة الدفع والاشتراكات Paddle Billing:**
   - تكامل رسمي عبر `@paddle/paddle-node-sdk` و `Paddle.js` (Overlay Checkout).
   - معالجة الـ Webhooks مع التحقق من توقيع HMAC SHA-256 لحماية المعاملات.
   - دعم الخطط (Free, Basic, Pro, Enterprise) وتحديث صلاحيات المستخدم تلقائياً.

6. **إضافة 3ds Max الأصلية (C# / .NET Plugin):**
   - تقع في مجلد `max-plugin/`.
   - واجهة مستخدم رسومية (WinForms) لتصدير المشهد بضغطة زر.
   - رفع مباشر عبر HTTP Multipart إلى API المنصة مع شريط تقدم حي ورابط مشاركة فوري.

---

## 🏗️ البنية المعمارية (System Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 (App Router)                │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Supabase Auth│  │ Dashboard    │  │ Three.js 3D Editor│  │
│  │ & Paddle Pay │  │ & Uploads    │  │ + R3F + Drei      │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │ HTTP / WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase (Cloud BaaS)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ PostgreSQL   │  │ Storage      │  │ Realtime & Auth   │  │
│  │ RLS Tables   │  │ (models/glb) │  │ Session & Tokens  │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │ HTTP API
┌──────────────────────────────┴──────────────────────────────┐
│            Autodesk 3ds Max Plugin (C# / .NET 4.8)          │
│       Scene Traversal  →  Khronos glTF  →  Cloud Upload     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 التثبيت والتشغيل المحلي (Local Setup)

### 1. تثبيت الحزم:
```bash
npm install
```

### 2. إعداد المتغيرات البيئية:
انسخ الملف `.env.example` إلى `.env.local` وأدخل مفاتيحك الخاصة:
```bash
cp .env.example .env.local
```

المتغيرات المطلوبة:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key

NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_client_token
PADDLE_API_KEY=test_api_key
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...

NEXT_PUBLIC_PADDLE_PRICE_BASIC_MONTHLY=pri_...
NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY=pri_...
NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE_MONTHLY=pri_...
```

### 3. تطبيق قاعدة البيانات:
قم بتنفيذ ملف الهجرة SQL الموجود في:
`supabase/migrations/20261011_init_platform.sql`
داخل الـ **SQL Editor** في لوحة تحكم Supabase.

### 4. تشغيل خادم التطوير:
```bash
npm run dev
```
افتح المتصفح على [http://localhost:3000](http://localhost:3000).

---

## 🚢 الرفع إلى GitHub والربط مع Vercel (Deployment)

### أولاً: الرفع إلى مستودع GitHub
```bash
git add .
git commit -m "feat: complete View Interior Design platform with 3D editor, Supabase, 3ds Max plugin and Paddle billing"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### ثانياً: النشر على Vercel
1. سجّل الدخول إلى [Vercel](https://vercel.com).
2. اختر **Add New...** ثم **Project**.
3. قم باستيراد مستودع GitHub الخاص بالمشروع.
4. في شاشة **Environment Variables**، أضف المتغيرات الموضحة في `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_PADDLE_ENVIRONMENT` (production أو sandbox)
   - `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
   - `PADDLE_API_KEY`
   - `PADDLE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_PADDLE_PRICE_*`
5. اضغط **Deploy**.

### ثالثاً: تهيئة Paddle Webhook
داخل لوحة تحكم Paddle:
1. توجّه إلى **Notifications** ثم **Webhooks**.
2. أضف وجهة جديدة (Destination):
   `https://YOUR_DOMAIN.vercel.app/api/paddle/webhook`
3. حدد الأحداث التالية:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`
   - `transaction.completed`
4. انسخ الـ **Webhook Secret Key** وضعه في Vercel تحت `PADDLE_WEBHOOK_SECRET`.

---

## 🔌 إضافة 3ds Max (Plugin)
للحصول على شرح تفصيلي حول كيفية بناء واستخدام إضافة 3ds Max، راجع:
[max-plugin/README.md](./max-plugin/README.md)
