# FolioCraft Web

فرونت Next.js مستقل عن الباك. `src/app` للمسارات والـlayout والـmetadata. مكونات التطبيق موزعة في `src/features` حسب studio/content/assets/management/portfolio، والعناصر العامة في `src/components/ui`.

الاستوديو يجمع الشاشات، و`features/studio/use-studio-controller.ts` ينسق تحميل المسودة واستعادتها وحفظها ونشرها وتغيير الجلسة. كل محرر محتوى له ملف واضح ويستخدم دالة التحديث المشتركة؛ لا تكتب طلب حفظ منفصلًا يتجاوز مراجعات المسودة أو قفل العمليات.

القالب العام والمعاينة يستخدمان `@folio/portfolio` نفسه، والعقود تستخدم `@folio/contracts`. لا يستورد هذا التطبيق كود قاعدة البيانات أو أسرار API. عميل Better Auth في `lib/auth-client.ts` وطلبات المجال في `lib/api.ts`.

`src/app/globals.css` مدخل imports مرتب. ترتيب ملفات `src/styles` جزء من cascade، وليس ترتيبًا أبجديًا. CSS Modules تبقى بجوار الميزة. الستايل الخاص بالقالب العام في `packages/portfolio/src/styles.ts`.

التشغيل من الجذر: `bun run dev:web`. اضبط API origin العام في `.env.local` وفق `.env.example`. راجع [دليل المصدر](../../docs/SOURCE_STRUCTURE.md) و[نظام التصميم](../../docs/DESIGN_SYSTEM.md). أدلة الاختبارات وحدودها في [STATUS](../../docs/STATUS.md).
