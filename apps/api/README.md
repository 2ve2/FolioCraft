# FolioCraft API

باك مستقل يستخدم Bun، Hono، Better Auth، PostgreSQL وDrizzle. ابدأ من `src/server.ts` للتشغيل و`src/app.ts` لتركيب المسارات والحماية. قواعد البيانات داخل services، والتحقق من الطلب داخل routes، والمخطط والترحيلات داخل db.

خدمات الموقع منفصلة: `siteDraftService` للمسودة والملكية والمراجعات، `releaseService` للنشر وتاريخ الإصدارات، و`publicSiteService` للإصدار العام. ملف `siteService` واجهة توافق صغيرة؛ لا تضع تنفيذًا جديدًا داخله. إعداد المصادقة في `lib/auth.ts`، وقواعدها وتدقيقها في `lib/auth-hooks.ts`.

التشغيل من الجذر: `bun run dev:api`. إعداد البيئة في `.env.example`؛ الإعدادات الحقيقية تبقى في `.env` المحجوب. تشغيل الباك لا يحتاج تشغيل Next.js. اختبارات البيانات تمر عبر `bun run test` من الجذر، الذي يحمي قاعدة folio_test ويمنع استخدام Neon أو قواعد الإنتاج.

Fixture المتصفح في `tests/fixtures/browser-server.ts`، وليس ضمن كود التشغيل. يمر عبر wrapper المحمي ويستقبل إشارة الإغلاق لينظف حساباته المولدة فقط. لا تشغّل fixture بإعدادات تطوير موروثة.

راجع [دليل المصدر](../../docs/SOURCE_STRUCTURE.md)، [عقد API](../../docs/API.md)، [التشغيل](../../docs/OPERATIONS.md) و[الحالة الفعلية](../../docs/STATUS.md).
