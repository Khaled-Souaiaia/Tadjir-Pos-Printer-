# 🇩🇿 TADJIR - منظومة إدارة ومحاسبة نقاط البيع الجزائر
## TADJIR Accounting & POS Software & Developer License Manager Suite

برنامج مكتبي احترافي متكامل لإدارة المبيعات، المحاسبة، المخزون، ونقاط البيع (POS) للمحلات التجارية والأنشطة في الجزائر. يعمل بالكامل دون اتصال بالإنترنت (**100% Offline**) وقابل للتثبيت كبرنامج مكتبي مستقل (`.exe`) على نظام Windows.

المشروع مقسم إلى تطبيقين منفصلين ومحميين بالكامل:
1. **TADJIR (`TADJIR-Setup.exe`)**: برنامج العملاء ونقاط البيع (نظيف 100% وخالٍ من أية مفاتيح خاصة أو أدوات مطور).
2. **TADJIR LICENCE MANAGER (`TADJIR-Licence-Manager-Setup.exe`)**: برنامج المطور المستقل لتوليد وتوقيع تراخيص التفعيل الرقمية عبر المفتاح الخاص Ed25519.

---

## 🚀 ملخص مخرجات التثبيت (Release Artifacts)

يتم توليد كل تطبيق داخل مجلد مستقل في `release/`:

```text
release/
├── tadjir/
│   ├── TADJIR-Setup.exe
│   └── win-unpacked/TADJIR.exe
└── license-manager/
    ├── TADJIR-Licence-Manager-Setup.exe
    └── win-unpacked/TADJIR-Licence-Manager.exe
```

### 1. TADJIR (`TADJIR-Setup.exe`)
- **اسم المنتج:** `TADJIR`
- **الإصدار:** `1.0.0`
- **المطور / الناشر:** `KhaLed Souaiaia`
- **الوصف:** `TADJIR Accounting & POS Software`
- **معالج التثبيت:** معالج احترافي متعدد الخطوات (NSIS / Inno Setup).
- **إمكانية اختيار مسار التثبيت:** نعم (مسار افتراضي: `C:\Program Files\TADJIR`).
- **الاختصارات:** إنشاء اختصار في قائمة ابدأ (Start Menu) وسطح المكتب (Desktop).
- **برنامج إلغاء التثبيت:** مرفق (`Uninstall TADJIR.exe`).
- **حماية بيانات وقاعدة بيانات العميل:** عند التحديث أو إلغاء التثبيت، يتم الاحتفاظ تلقائياً بقاعدة بيانات المحل والفواتير (`%APPDATA%\TADJIR\database.db`) دون حذفها.
- **الأمان:** خالٍ بنسبة 100% من المفتاح الخاص ومن أدوات المطور (تم فحص الحزمة أمنياً واجتياز تدقيق الأمان بنجاح).

### 2. TADJIR LICENCE MANAGER (`TADJIR-Licence-Manager-Setup.exe`)
- **اسم المنتج:** `TADJIR LICENCE MANAGER`
- **الإصدار:** `1.0.0`
- **المطور / الناشر:** `KhaLed Souaiaia`
- **الوصف:** `TADJIR License Management Tool`
- **معالج التثبيت:** معالج احترافي خاص بالمطور فقط.
- **التشفير والتوقيع:** يحتوي حصرياً على المفتاح الخاص للتوقيع الرقمي (Ed25519 Private Key) وتوليد رموز وسيريال التفعيل الرسمية (`TADJIR-LIC-...`).

---

## 🛠️ أوامر تجميع وبناء ملفات التثبيت (Build Scripts)

### عبر سطر الأوامر (NPM):
```bash
# بناء برنامج العميل وفحص النسخة غير المثبتة والمثبتة
npm run build:tadjir

# بناء برنامج إدارة التراخيص المستقل وفحص النسخة غير المثبتة والمثبتة
npm run build:license-manager

# بناء التطبيقين بشكل مستقل
npm run build:all
```

تتضمن أوامر البناء فحصاً لتشغيل كل نسخة غير مثبتة، ثم تثبيت صامت وتشغيل النسخة المثبتة. يفشل الأمر ويعرض الخطأ عند فشل أي خطوة.

يستخدم التطبيقان خدمة التراخيص على `http://localhost:3000` افتراضياً. شغّل خدمة `server.ts` على الجهاز الذي يستضيف واجهة API، أو عيّن `TADJIR_LICENSE_API_URL` لعملية التطبيق إلى أصل الخدمة الصحيح. اختبارات البناء تشغّل خادماً مؤقتاً بقاعدة بيانات مؤقتة، ولا تعدّل `data/central-licenses.json`.

### عبر ملفات Batch المباشرة (Windows 1-Click):
1. **`build-tadjir.bat`**: يبني ويختبر `release/tadjir/TADJIR-Setup.exe`.
2. **`build-license-manager.bat`**: يبني ويختبر `release/license-manager/TADJIR-Licence-Manager-Setup.exe`.
3. **`build-all.bat`**: يبني ويختبر ملفي التثبيت المستقلين بضغطة زر واحدة.

---

## 🛡️ بنية الأمان وحماية المفتاح الخاص (Private Key Protection)

- **العزل المعماري:** كود توليد التراخيص والمفتاح الخاص (`MASTER_PRIVATE_KEY_JWK`) معزولان حصرياً داخل مجلد `license-manager/`.
- **حزمة العميل:** عند تنفيذ `build:tadjir`، يتم توجيه Vite لتجميع واجهة العميل فقط (`dist-tadjir/`). لا تحتوي ملفات العميل إلا على المفتاح العام المعتمد للتحقق فقط (`MASTER_PUBLIC_KEY_JWK`).
- **الفحص الأمني الآلي (Automated Security Audit):** يتضمن سكربت البناء `scripts/build-installers.cjs` مرحلة فحص إجباري تفحص نصياً كل ملف من ملفات العميل للتحقق من عدم وجود المفتاح الخاص أو كلمات مرور المطور قبل الشروع في التجميع.

---

## 📑 دعم Inno Setup (Inno Setup Scripts)

إلى جانب تقنية NSIS المدمجة في Electron-Builder، تم تجهيز وتوفير سكربتات Inno Setup قياسية داخل مجلد `installers/`:
- `installers/inno-tadjir.iss`: لتجميع `TADJIR-Setup.exe` عبر مترجم Inno Setup Compiler (`iscc`).
- `installers/inno-license-manager.iss`: لتجميع `TADJIR-License-Manager-Setup.exe`.

كلا السكربتين يدعمان:
- اختيار مسار التثبيت
- إضافة اختصار سطح المكتب وقائمة ابدأ
- لغات المعالج (العربية والإنجليزية والفرنسية)
- كود حماية قاعدة البيانات وتنبيه المستخدم عند الرغبة في إبقاء بيانات وفواتير المحل.

---

## 🏷️ إدارة الإصدارات والترقية (Versioning)

ملف التكوين المركزي للإصدار متوفر في:
`version.json`

لتغيير رقم الإصدار المعبأ، حدّث حقل `version` في `version.json`. يستخدمه سكربت البناء لإنشاء بيانات التطبيقين المرحلية قبل التغليف.

---

## 🔑 بيانات الدخول الافتراضية

- **مدير المحل (Admin):** اسم المستخدم: `admin` | كلمة المرور: `password`
- **أمين الصندوق (Cashier):** اسم المستخدم: `cashier` | كلمة المرور: `cashier123`
- **المطور (License Manager):** كلمة المرور: `Admin@Tajir2026!`
