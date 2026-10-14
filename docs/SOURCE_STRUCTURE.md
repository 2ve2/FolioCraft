# دليل تنظيم الكود

آخر تحديث: 2026-10-14. هذا الدليل يصف التنفيذ الفعلي، وليس قائمة مكتبات مقترحة.

## حدود المشروع

`apps/api` هو الباك المستقل، و`apps/web` هو الفرونت المستقل. لا يستورد الفرونت قاعدة البيانات أو إعدادات الباك أو أسراره. تشترك التطبيقات في عقود البيانات داخل `packages/contracts`، ويشترك العرض العام والمعاينة الخاصة في `packages/portfolio`.

## الباك: أين أضع التغيير؟

```text
apps/api/src/
  server.ts                    تشغيل Bun وحدود الإغلاق والاتصالات
  app.ts                       تجميع middleware والمسارات فقط
  config/env.ts                قراءة الإعدادات والتحقق منها
  middleware/                  المصادقة والإدارة والحماية وأخطاء HTTP
  routes/                      التحقق من الطلب وتفويضه للخدمة المناسبة
  services/
    siteDraftService.ts        المسودات والملكية والمراجعات وتعديل إعدادات الموقع
    releaseService.ts          النشر والإلغاء والتاريخ وتفعيل إصدار سابق
    publicSiteService.ts       قراءة الإصدار العام المتاح فقط
    siteService.ts             واجهة تجميع صغيرة تحافظ على المستهلكين السابقين
    contentService.ts          تحديث مجموعات المحتوى وترتيبها
    assetService.ts            دورة الملفات المملوكة والربط والتحقق
    inquiryService.ts          الرسائل وصندوق الاستفسارات
    adminService.ts            موارد الإدارة والإيقاف والاستئناف
    auditService.ts            تسجيل إجراءات الإدارة
    publicAccess.ts            شرط الإتاحة العام المشترك
    rateLimitService.ts        حدود الطلبات الذرية في PostgreSQL
  lib/
    auth.ts                    إعداد Better Auth ومحول قاعدة البيانات
    auth-hooks.ts              قواعد البريد وصلاحيات الإدارة وتدقيق بروتوكولها
    mail.ts                    نقل البريد الحقيقي عند تهيئته
    storage-client.ts          إعداد عميل التخزين
    storage.ts                 عمليات التخزين وفحص الصور
    response-helpers.ts        عقد النجاح والخطأ الآمن
    validation.ts              معرفات الموارد وترقيم الصفحات
  db/
    index.ts                   PostgreSQL/Drizzle ومهل الاتصالات
    schema/                    جداول فعلية حسب المجال
    migrations/                ترحيلات صريحة محفوظة مع بيانات Drizzle
apps/api/tests/
  *.test.ts                    اختبارات القاعدة والبروتوكول والصلاحيات
  test-guard.ts                رفض الإنتاج والقواعد البعيدة
  fixtures/browser-server.ts  حسابات وخدمة متصفح مؤقتة على folio_test فقط
```

المسارات الخاصة بالمحتوى في `routes/content.ts` تجمع profile/projects/appearance/experiences/education/skills/articles/sections. `collection-router.ts` و`content-validation.ts` هما مساعدا هذا المجال؛ بقية ملفات المسارات واضحة بالاسم: `account`, `sites`, `releases`, `assets`, `inquiries`, `admin`, `public-*`, `runtime`.

ابدأ تغيير الطلب في route، وطبّق قواعد البيانات والمعاملة في service. لا تجعل route يكتب مباشرة إلى قاعدة البيانات. تمرّ عمليات المسودة عبر قفل الموقع والملكية ومراجعة المسودة والتحقق من الملفات. النشر يحتفظ بمعاملته الذرية ونسخته غير القابلة للتعديل. Better Auth يملك بروتوكوله؛ لا تلف استجاباته بعقد domain API.

واجهة `siteService.ts` محفوظة للتوافق مع الاختبارات والمستهلكين السابقين. كود التشغيل الداخلي يستورد الخدمة المحددة حسب مسؤوليته. لا تضف منطقًا جديدًا إلى ملف التجميع.

## الفرونت: مسارات رفيعة ومزايا مستقلة

```text
apps/web/src/
  app/                         مسارات Next والـlayout والـmetadata وrobots/sitemap
  components/ui/               Brand وField وLanguageSwitch وSelectControl
  features/
    studio/
      studio.tsx               جمع حالة الشاشة وأقسام مساحة العمل
      use-studio-controller.ts تحميل/استعادة/حفظ المسودة وعمليات الموقع
      welcome-screen.tsx       شاشتا الدخول وإنشاء الحساب
      onboarding-screen.tsx    إنشاء الموقع الأول
      loading-screen.tsx       التحميل والأخطاء القابلة للاستعادة
      workspace-sidebar.tsx    تنقل مساحة العمل والحساب
      workspace-header.tsx     اللغة وحالة الحفظ وأداة النشر
      workspace-preview.tsx    إطار المعاينة والجهاز والتكبير
      site-address.tsx         تعديل عنوان الموقع
      sections/                content/appearance/settings
      copy.ts, types.ts        النصوص والعقود الداخلية لهذه الميزة
    content/
      content-editors.tsx      ترتيب محررات الأقسام فقط
      experiences-editor.tsx   الخبرات
      education-editor.tsx     التعليم والشهادات
      skills-editor.tsx        مجموعات المهارات
      articles-editor.tsx      المقالات
      visibility-editor.tsx    إظهار الأقسام
      project-extras.tsx       بيانات المشروع الإضافية والغلاف والمعرض
      rich-editor.tsx          كتل النص المقيدة
      collection-actions.tsx   الترتيب والحذف مع التأكيد
      input.tsx, reorder.ts    حقل المحتوى وترتيب المصفوفات دون تغيير المعرفات
      copy.ts, types.ts        النصوص والخصائص المشتركة
    assets/
      asset-picker.tsx         الرفع والمكتبة وحالات الصور
      use-asset-urls.ts         تجديد روابط الملفات الخاصة بحسب الحساب والجلسة
      copy.ts, types.ts        النصوص والعقود الداخلية
      asset-picker.module.css  ستايل المكتبة المحلي
    management/
      site-operations.tsx      الرسائل وتاريخ النشر
      admin-panel.tsx          واجهة الإدارة المستقلة أو المضمنة
      shared.tsx               ترقيم الصفحات وطلبها ورسائل الخطأ والتواريخ
      copy.ts, types.ts        النصوص وعقود موارد الإدارة والعمليات
      management.module.css    الستايل المشترك لإدارة الموارد
    portfolio/
      portfolio-preview.tsx    أبعاد المعاينة والتنقل الخاص والمودال
      inquiry-form.tsx         نموذج الرسائل؛ إرسال المعاينة معطل
  lib/
    api-origin.ts              أصل الباك المسموح للمتصفح
    auth-client.ts             عميل Better Auth الرسمي
    api.ts                     طلبات domain API وعقد ApiError
    public-metadata.ts         بيانات وصفية من الإصدار المنشور فقط
  styles/                      tokens وملفات الستايل العامة ذات ترتيب صريح
```

يبقى `use-studio-controller.ts` مسؤولًا واحدًا عن تنسيق الحفظ، مراجعة البيانات، استعادة التعديلات، وتغيير الجلسة. فصل هذه الحالة إلى مخازن مستقلة قد يخلق سباقًا بين حفظ المسودة والنشر أو تبديل الحساب؛ لذلك لم نغيّر خوارزميتها خلال تنظيم الملفات. أقسام التحرير تستقبل `draft` ودالة `update`، وتعرض حقولًا مضبوطة بالحالة. لا تتجاوز قفل العملية أو مراجعة الموقع بكتابة API أخرى.

المكونات العامة القابلة لإعادة الاستخدام مكانها `components/ui`. المكون الخاص بميزة يبقى داخل `features/<name>`، مع نصوصه وأنواعه وCSS Module إن كان محليًا. لا تستورد ميزة ملفات تنفيذ داخل `app`: اتجاه الاعتماد من route إلى feature، وليس العكس.

## الستايل والقالب المشترك

`app/globals.css` مدخل CSS فقط. ترتيب imports مقصود ويحافظ على cascade السابق: tokens، foundation، welcome، workspace، responsive، editor-groups، loading، select-control، readability، workspace-preview، workspace-scroll، scrollbars. لا ترتب هذه imports أبجديًا؛ ملفات readability وبعض قواعد responsive هي تحسينات مرتبة فوق قواعد الأساس.

```text
packages/portfolio/src/
  index.tsx           صادرات الحزمة الثابتة
  portfolio.tsx       القالب العام نفسه للمعاينة والإصدار المنشور
  portfolio-detail.tsx تفاصيل المشروع والمقال
  appearance.ts       الثيمات والخطوط وأحجام النص وتوليد CSS variables
  copy.ts             نصوص القالب العربية والإنجليزية
  format.ts           الروابط المسموحة والمفاتيح ومدة القراءة
  section-elements.tsx العناوين ونطاقات التواريخ
  rich-content.tsx    كتل React الآمنة ومعرض الصور
  styles.ts           قواعد القالب المقروءة؛ لا تضم ستايل الاستوديو
  types.ts            خصائص العرض الداخلية
```

صادرات `@folio/portfolio` بقيت كما هي: `Portfolio`, `PortfolioDetail`, `RichContent`, `portfolioFontNames`, `portfolioTextSizes`. أما `packages/contracts/src/index.ts` فهو عقد البيانات الموحد: Zod، النسخ، حدود المحتوى، الإسقاط المنشور وحساب مدة القراءة. بقي دون تغيير في هذه الجولة.

## إضافة قسم أو تطوير وظيفة

1. حدّد عقد البيانات في contracts واختبر حدود المدخلات والإسقاط المنشور.
2. أضف route وخدمة تستعمل حارس الملكية والمراجعة الموجودين، مع معاملة إن كانت العملية متعددة الخطوات.
3. أضف المحرر في feature المناسبة، باستخدام دالة التحديث المشتركة وأسماء الحقول المترجمة.
4. أضف العرض إلى portfolio المشترك ونصوصه وRTL؛ لا تنشئ قالبًا ثانيًا للمعاينة.
5. تحقّق من الحفظ والنشر والعزل بين الحسابات، والعرض على الهاتف والدسكتوب.

## التحقق والتشغيل

شغّل API والويب في طرفيتين مستقلتين، وفق README وOPERATIONS. استخدم `bun run check`, `bun run typecheck`, `bun run test` و`bun run build`. اختبارات القاعدة تمر عبر wrapper الجذر وتعمل على folio_test فقط؛ لا تشغّلها بإعدادات Neon.

للبناء المحلي المعزول أثناء تشغيل واجهة المستخدم: `FOLIO_QA_BUILD=1 bun run --cwd apps/web build --webpack`. ولتجربة الإدارة المعزولة: `bun run test --admin-browser` يشغّل fixture على4400، مع واجهة4300 تضبط API origin إلى127.0.0.1:4400. بيانات الدخول المؤقتة تحفظ داخل work بصلاحية0600 وتنظّف عند الإغلاق؛ لا تنقلها إلى التوثيق.

مواد المقارنة والنسخ المؤقتة في `work/structure-refactor` دليل لهذه الجولة فقط، وليست ملفات منتج أو مكتبات يجب استيرادها. أدلة التحقق الدقيقة وحدودها في STATUS وCHANGELOG؛ نجاح البناء لا يعني إثبات نشر الإنتاج أو تغطية كل متصفح وقارئ شاشة.
