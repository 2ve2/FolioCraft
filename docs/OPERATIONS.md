# التشغيل والتكاملات

آخر مراجعة: 2026-10-13، Asia/Riyadh. يصف هذا الملف إعدادات التنفيذ الحالي ومتطلبات التشغيل التي لم تختبر بعد. نتائج الفحوص الفعلية محفوظة في `STATUS.md`؛ هذه التعليمات لا تعني جاهزية الإنتاج أو نجاح البريد؛ إثبات R2 المحلي الفعلي مسجل أدناه وفي STATUS.

## المكونات والملفات

- `apps/api`: Bun + Hono، Better Auth، Drizzle و`pg`. `app.ts` يركب HTTP؛ `server.ts` يشغل Bun ويشتق عنوان العميل ويغلق pool عند الإنهاء.
- `apps/web`: تطبيق Next مستقل يستخدم API، دون اتصال بقاعدة البيانات. `NEXT_PUBLIC_API_URL` عنوان API المتاح للمتصفح، و`API_URL` للقراءة العامة من خادم الويب.
- `packages/contracts`: عقود محتوى Zod، الإصدار 1، مع إضافات اختيارية متوافقة مع المسودات القديمة.
- `packages/portfolio`: قالب العرض المشترك؛ محررات الأقسام والصور والتفاصيل العامة منفذة، وأدلة القبول وحدودها في STATUS.md.
- الأسرار في متغيرات تشغيل الباك أو ملف `.env` محلي متجاهل. أمثلة `apps/api/.env.example` تحتوي placeholders فقط. لا تطبع `DATABASE_URL` أو SMTP/R2 credentials أو كلمات المرور أو كوكي الجلسة أو روابط التوقيع في السجلات.

## التشغيل المحلي

من جذر المشروع، باستخدام Bun:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run check
```

انسخ مثال البيئة محليًا واملأه بإعدادات هذا المشروع. لا تستخدم حسابات أو قاعدة بيانات مشروع Sooqha المرجعي. طابق اسم المضيف: `localhost:3000` و`localhost:4000` يختلفان عن `127.0.0.1` في قواعد الأصل والكوكي.

بعد مراجعة migrations وقبل تشغيل API على قاعدة جديدة:

```sh
bun run db:migrate
bun run dev:api
```

وفي عملية أخرى:

```sh
bun run dev:web
```

`db:migrate` يطبق SQL الذي لم يطبق بعد على **DATABASE_URL الحالي**؛ تحقق من الهدف قبل تنفيذه. لا يستبدل نسخة احتياطية أو موافقة ترقية إنتاج. الأمر `db:generate` يولد ملفات مراجعة من schema؛ لا تستخدم `drizzle-kit push` أو reset/truncate للتشغيل.

للتحقق من البناء:

```sh
bun run build
```

حاوية API في `apps/api/Dockerfile`، build context جذر المستودع؛ Bun 1.4.2 مع تثبيت dependencies إنتاج مفلترة لـ`@folio/api`، مستخدم `bun`، و`NODE_ENV=production HOST=0.0.0.0`. `.dockerignore` يستبعد أسرار env وwork وnode_modules. مثال بناء محلي فقط:

```sh
docker build -f apps/api/Dockerfile -t foliocraft-api .
```

لا يطبق Docker migrations عند الإقلاع؛ وفر secrets في runtime، وطبق migrations بخطوة مستقلة مراجعة. لا يوجد ادعاء بناء image ناجح أو نشر حاوية من وجود Dockerfile. فحص Bun compile مستقل لا يثبت بناء الحاوية أو إعداد بيئة الإنتاج؛ نتيجة التنفيذ الدائمة في STATUS.

API يبدأ مستقلًا عبر `bun run --cwd apps/api start`. الويب يبنى ويبدأ مستقلًا عبر scripts تطبيقه. واجهات صحة التشغيل: `GET /health` لحياة العملية و`GET /ready` لاتصال PostgreSQL وحالة وجود إعدادات التكامل. حالة `configured` تعني اكتمال المتغيرات؛ لا تعني نجاح رفع أو إرسال.

## البيئة المطلوبة للإنتاج

| المتغير | الدلالة |
|---|---|
| `NODE_ENV=production` | يفعّل أصل HTTPS، secure cookies، وتأكيد البريد قبل استخدام العمليات الخاصة |
| `HOST=0.0.0.0` | الاستماع داخل حاوية/خادم خلف reverse proxy؛ لا تكشف منفذ API مباشرة للعامة عند الاعتماد على proxy |
| `PORT` | افتراضي 4000، 1–65535 |
| `API_URL` | أصل HTTPS للباك دون path أو trailing slash، مثال توضيحي `https://api.example.com` |
| `WEB_URL` | أصل HTTPS واحد مسموح للواجهة، مثال توضيحي `https://app.example.com`؛ ليس اسم نطاق تم شراؤه أو ربطه |
| `BETTER_AUTH_SECRET` | سر عشوائي طويل؛ الحد المطبق ≥32 حرفًا، مخصص للمشروع |
| `DATABASE_URL` | اتصال PostgreSQL مخصص؛ في الإنتاج استخدم TLS والتحقق من شهادة واسم المضيف مثل `sslmode=verify-full` مع إعداد CA الصحيح للمزود |
| `DB_POOL_MAX` | افتراضي 10، 1–100؛ خطط لمجموع pools عبر جميع النسخ ومحدودية مزود DB |
| `DB_CONNECT_TIMEOUT_MS` | افتراضي 5000، 100–60000 |
| `DB_STATEMENT_TIMEOUT_MS` | افتراضي 15000، 1000–120000 |
| `TRUSTED_PROXY_IPS` | قائمة مفصولة بفواصل لعناوين socket proxy الدقيقة فقط؛ افتراضي فارغ |
| SMTP الكامل | إلزامي لبدء الإنتاج؛ التفاصيل أدناه |
| R2 الكامل | اختياري؛ عند غيابه رفع/قراءة ملفات التخزين ترجع تعطيلًا واضحًا |

`DATABASE_URL` يتحقق حاليًا من بادئة `postgresql://`؛ اختيار TLS والتحقق الكامل مسؤولية إعداد الاتصال، وليس فحصًا مثبتًا في validator للإنتاج. `pg` يستعمل connection string وpool بمعاملات فعلية، وليس Neon HTTP driver. عند الجمع بين SSL options وconnection string، راجع [node-postgres SSL](https://node-postgres.com/features/ssl) لتجنب استبدال إعداد الشهادة بخيارات الرابط. لا تستخدم تعطيل التحقق من الشهادة كتكوين إنتاج.

توفير النطاقات، شهادة TLS، مزود التشغيل وإعداد الجدار الناري لم يتم في هذه الجلسة. لا يفترض هذا الدليل أن إعداد sibling domains والكوكي نجح في الإنتاج؛ يجب إثبات التسجيل والتأكيد والدخول والكتابة والنشر من الأصل النهائي.

## عنوان العميل والـreverse proxy

`server.ts` يأخذ عنوان socket الفعلي من Bun. يثق بـ`x-real-ip` فقط إذا كان عنوان socket ضمن `TRUSTED_PROXY_IPS` بالضبط، والقيمة عنوان IP صالح واحد. لا يعتمد على `x-forwarded-for` أو `cf-connecting-ip` من العميل. يستبدل `x-folio-client-ip` الوارد بقيمة مشتقة؛ Better Auth وحدود الاستفسارات تستخدم القيمة الناتجة.

أضف عناوين proxy الدقيقة بعد تحديد topology الفعلي؛ لا تستخدم CIDR أو wildcard أو أسماء مضيف في هذه القائمة. يجب أن **يستبدل** proxy رأس `x-real-ip` الوارد من العميل بعنوانه الذي رآه، لا يمرره كما هو. مثال Nginx توضيحي داخل server HTTPS قائم:

```nginx
location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

هذا المثال لا يهيئ TLS ولا يثبت صحة سلسلة proxy إضافية. عند تعدد proxies أو CDN، وثق السلسلة وعزل الوصول واختبر spoofing. الطلبات المباشرة إلى Hono في الاختبار لا تملك طبقة socket؛ لا تعتبر header مقدمًا منها إثباتًا لعنوان عميل إنتاج.

## البريد وتأكيد الحساب

المجموعة مطلوبة كاملة أو تترك كاملة فارغة في التطوير:

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=project-smtp-user
SMTP_PASSWORD=replace-in-secret-store
MAIL_FROM=hello@example.com
```

الأمثلة placeholders. لا يوجد حساب SMTP أو نطاق إرسال مهيأ حاليًا. `SMTP_SECURE=true` يعني TLS من بداية الاتصال، وغالبًا يناسب 465؛ `false` يفرض STARTTLS في النقل الحالي. النقل يستخدم مهلات اتصال/تحية 10 ثوانٍ وsocket 15 ثانية ويمنع الوصول إلى ملفات أو URLs عبر Nodemailer.

في الإنتاج: `requireEmailVerification=true`, إرسال عند التسجيل والدخول، و`autoSignInAfterVerification=false`. ينبغي للواجهة عرض التحقق من صندوق البريد بعد التسجيل ثم طلب الدخول بعد التأكيد؛ هذا تكامل واجهة مطلوب ولم يثبت إنتاجيًا. التطوير يسمح بالمسار المحلي دون التأكيد، ولا يمثل سياسة إطلاق.

طلب إعادة تعيين كلمة المرور وإعادة إرسال التأكيد مع SMTP غير مهيأ يرجع `503 MAIL_UNAVAILABLE`؛ فشل النقل يرجع `MAIL_DELIVERY_FAILED`. إعادة التعيين الناجحة تلغي الجلسات السابقة. الرسائل تحتوي نصًا عربيًا/إنجليزيًا؛ URL الرسالة يتحقق أنه من أصل API نفسه. لا تطبع رابط التوكن ولا تعلن نجاح تسليم دون دليل مزود. بريد الاستفسارات غير منفذ؛ الاستفسارات تخزن داخل صندوق الموقع فقط.

قبل إعلان جاهزية البريد، يلزم نطاق sender موثق لدى المزود، إعداد SPF/DKIM/DMARC المناسب لذلك المزود، وإثبات إرسال واستلام وتأكيد وإعادة تعيين من البيئة النهائية. هذه خطوات معلقة، وليست تغييرات أجريت على DNS. تفاصيل البروتوكول في [Better Auth Email & Password](https://better-auth.com/docs/authentication/email-password).

## R2 ورفع الصور

أبق bucket **خاصًا**؛ لا تفعّل `r2.dev` العام أو custom domain عام يتجاوز التحقق من الإصدار. مجموعة التشغيل الكاملة:

```dotenv
R2_ACCOUNT_ID=replace-with-32-lowercase-hex-characters
R2_BUCKET=portfolio-assets
R2_ACCESS_KEY_ID=replace-in-secret-store
R2_SECRET_ACCESS_KEY=replace-in-secret-store
R2_ENDPOINT=
```

عند ترك endpoint فارغًا يستعمل `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` عبر HTTPS. endpoint الاختياري مقيد لحسابك وفي نطاقات R2 الرسمية العامة/الأوروبية/FedRAMP، دون port أو path أو query أو credentials. SDK region `auto`؛ credentials لا ترسل للمتصفح. امنح مفتاح R2 صلاحيات قراءة وكتابة وحذف ونسخ في bucket المخصص فقط وفق سياسة المزود، دون حساب إنتاج مرجعي.

اضبط CORS للرفع من **قيمة WEB_URL الدقيقة**. مثال لوحة R2، استبدل الأصل بالمقرر:

```json
[
 {
  "AllowedOrigins":["https://app.example.com"],
  "AllowedMethods":["PUT"],
  "AllowedHeaders":["Content-Type"],
  "ExposeHeaders":["ETag"],
  "MaxAgeSeconds":3600
 }
]
```

للرفع المحلي استخدم `http://localhost:3000` في bucket اختبار مخصص. لا تستخدم wildcard. التحميل كصورة عبر URL موقع لا يحتاج طلب fetch مخصصًا؛ إذا أضفت fetch عبر المتصفح لاحقًا، اضبط GET/HEAD والرؤوس المطلوبة تحديدًا بعد مراجعة الاستخدام. هذه سياسة إعداد موصى بها للمسار الحالي وليست سياسة applied في حساب R2. [Cloudflare R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/) يوضح أن صحة التوقيع لا تغني عن CORS في المتصفح.

نافذة PUT 600 ثانية. يقيد الباك الرفع لـ5 MiB، PNG/JPEG/WebP، ≤4096 لكل ضلع، صورة واحدة دون animation متعدد الصفحات. تحقق الإكمال يفحص metadata والحجم ثم يحمل stream محدودًا ويفك الصورة فعليًا عبر Sharp؛ copy بشرط ETag يحفظ البايتات التي فحصت إلى `verified/` ويمنع تبديلها بإعادة PUT إلى `staging/`. لا تربط asset قبل `ready`.

الحفظ والنشر يقفلان مراجع الملفات ويتحققان من الملكية والحالة. الحذف يمنع الملفات المشار إليها في المسودة **أو أي إصدار تاريخي محفوظ**؛ لا توجد سياسة حذف إصدارات تاريخية حاليًا. أخطاء المزود ترجع `502 STORAGE_PROVIDER_ERROR`؛ غياب الإعداد `503 STORAGE_UNAVAILABLE`.

تحميل خاص أو عام مصرح ينتج signed GET لمدة 60 ثانية. الرابط يحمل الصلاحية لمن يعرفه حتى انتهاء وقته؛ إلغاء النشر يمنع إصدار روابط جديدة لكنه لا يبطل رابطًا سابقًا فورًا. headers تطلب `private,no-store`، والـredirect العام `no-referrer`. لا تعتمد على انتهاء التوقيع لمحو ملف خزنه زائر مسبقًا.

`POST /api/sites/:id/assets/cleanup` تنظيف صريح محدود 100 عنصر. يحتفظ الحذف بحالة `deleting` حتى انتهاء signed PUT + دقيقة؛ فشل المزود يبقي العملية قابلة لإعادة المحاولة. الملفات الجاهزة تنظف staging فقط، لا verified. لا توجد مهمة cleanup مجدولة تلقائيًا في التنفيذ الحالي؛ يلزم ترتيب تشغيلها في خدمة مصرح بها بعد تحديد المضيف. توجد كذلك خدمة لتنظيف rate buckets القديمة، دون scheduler موثق يعمل حاليًا.

في 2026-10-13 نجح اختبار R2 الحقيقي للرفع الموقع وفك الصورة والنسخ المشروط والتحميل المطابق وحماية verified من إعادة staging والحذف. ضبطت CORS للأصل http://localhost:3000 فقط ونجح الرفع من متصفح فعلي مع ETag. مفاتيح المشروع محفوظة في env محجوب فقط. هذا لا يثبت مسار محرر الصور المصادق كاملًا أو CORS أصل الإنتاج النهائي.

## الاختبارات المعزولة

الأمر الآمن من الجذر:

```sh
bun run test
```

يشغل `scripts/test-api.ts`: يحدد `NODE_ENV=test` وsecret اختبار وأصول localhost، ويزيل إعداد SMTP/R2 من بيئة الابن. الافتراضي `postgresql://folio@127.0.0.1:55432/folio_test`. يطبق migrations على **قاعدة الاختبار** ثم `bun test tests` داخل API.

يجب إعداد cluster/قاعدة اختبار منفصلة `folio_test` وrole محلي محدود، ولا تضع Neon المشروع أو أي DATABASE_URL إنتاج في `TEST_DATABASE_URL`. لا تستعمل `bun run --cwd apps/api test` مباشرة مع ملف `.env` للعمل لأنه يتجاوز wrapper المعزول. إعداد cluster المحلي عملية مستقلة؛ الدليل لا ينشئه ضمنيًا. الـwrapper يرفض أي TEST_DATABASE_URL ليس على `localhost` أو `127.0.0.1` أو `[::1]` وباسم قاعدة `folio_test` بالضبط، حتى لو مرر صراحة. يسمح ذلك بتغيير port/role المحلي، ولا يسمح بقاعدة Neon أو إنتاج.

للفحوص دون قاعدة أو مزود: `bun run typecheck` و`bun run check`. قاعدة الاختبار لا تثبت قدرات SMTP/R2 الفعلية ولا cookie policy لنطاقات الإنتاج. انسخ **نتائج التنفيذ الفعلية** إلى `STATUS.md` ولا تحول أمثلة هذا الملف إلى سجل نجاح.

## migrations والنسخ الاحتياطي والاستعادة

راجع SQL في `apps/api/src/db/migrations/` وschema قبل التطبيق. الملفات الحالية `0000` تنشئ auth/sites/releases، و`0001` تضيف assets/inquiries/rate limits، و`0002_release_integrity.sql` تضيف FK مؤجلًا لضمان أن الإصدار المنشور لنفس الموقع، وFK لملكية asset/site/uploader، وtrigger يمنع UPDATE للإصدارات، و0003 تضيف حقول Better Auth Admin وتعليق المواقع وجدول admin_audit؛ محتوى الموقع الإضافي JSONB في aggregate بمراجعة، لذلك لم ينشأ جدول لكل خبرة أو مقال. لا تستخدم push إنتاجي أو reset. قبل أي migration إنتاج: نسخة احتياطية، تحديد الهدف الصحيح، وفحص ملاءمة النسخة السابقة من التطبيق وrollback المتوقع.

الهدف التشغيلي للنسخ: dump PostgreSQL بصيغة custom مع restore إلى **قاعدة مستقلة جديدة**، ثم فحص migrations، أعداد السجلات/العلاقات، وتسجيل الدخول وsnapshot عام وعزل المسودات. لا تثبت رؤية ملف dump وحدها نجاح الاستعادة. لا تشغل restore بـ`--clean` على قاعدة العمل. PostgreSQL backup لا يحفظ بايتات R2؛ يلزم إجراء مستقل لحماية الملفات وربطها بمراجع الإصدارات.

يجب تحديد جدول النسخ ومدة الاحتفاظ وتشفير النسخ ومكانها، وهدفَي RPO/RTO وفق المضيف المختار. المساعد الحالي `scripts/backup-db.ts`:

```sh
# من جذر المشروع؛ يقرأ env تطبيق API. راجع قاعدة الهدف والتفويض أولًا.
bun run db:backup
```

لا يضع URI أو كلمة المرور ضمن args الأدوات؛ يمرر الاتصال عبر متغيرات PostgreSQL. يحتاج `pg_dump` متاحًا، ويستخدم جذور شهادات النظام عند اختيار `sslmode=verify-full` (يمكن تحديد `PGSSLROOTCERT` لمسار موثوق)، ويكتب custom dump `--no-owner` إلى `work/backups/portfolio-<timestamp>.dump`، بصلاحية ملف 0600 ومجلد 0700. لا يعلن `backup_created` عند فشل pg_dump. افحص أي ملف جزئي خلفه الفشل قبل الاعتماد عليه.

فحص restore المعزول فقط، من جذر المشروع:

```sh
bun run db:verify-restore
```

هذا النمط يرفض كل قاعدة غير local `folio_test`، ينشئ قاعدة مؤقتة `folio_restore_<random>`، يشغل `pg_restore --exit-on-error --no-owner`، ويقارن counts أحد عشر جدولًا، ومحتوى نبذة عربية والمسودة والإصدار ومؤشر النشر لبيانات اختبار مؤقتة، ويتحقق من وجود `release_snapshot_immutable`، ثم يحذف **القاعدة المؤقتة التي أنشأها فقط** وينظف مستخدم الاختبار المحدد من مصدر الاختبار. يحتاج `createdb,pg_restore,psql,dropdb` ودور اختبار يستطيع إنشاء قاعدة. هذا دليل بنيوي محدود؛ لا يستبدل اختبار الدخول والملفات والـsnapshots على نسخة مستعادة. سجل نتيجة التنفيذ الفعلية في STATUS؛ وجود helper وحده لا يثبت نجاح restore أو نسخة إنتاج. مرجع رسمي: [PostgreSQL SQL Dump](https://www.postgresql.org/docs/current/backup-dump.html).

## السجلات والإغلاق والحدود الحالية

السجلات structured للطلب تحتوي request ID والطريقة والحالة والمدة، دون جسم الطلب أو cookie. خطأ داخلي يسجل اسم الخطأ ومسار الطلب ورمز DB؛ العميل يرى code عامًا. الإغلاق بـSIGINT/SIGTERM يوقف قبول الطلبات وpool، مع حد 15 ثانية قبل إيقاف قسري؛ لم يثبت rolling deployment على مضيف إنتاج.

حدود الإطلاق المعلقة: SMTP ونطاق sender، R2 خاص وCORS ورفع فعلي، مضيف API/web ونطاقات HTTPS وقواعد proxy، تجربة كوكي نهائية، قياس rate limit تحت عدة نسخ، مراقبة وتنبيه/نسخ واستعادة مثبتة، تنظيف مجدول، والقبول الشامل للواجهة والإدارة. تكوين env أو Docker وحده لا يحقق هذه الشروط. لا شراء خدمات أو نشر إنتاجي ضمن هذا الدليل.


## Administrative operations and limits

There is no seeded administrator or public bootstrap endpoint. An initial grant requires a separately authorized exact existing account and a reviewed operator change; none has been selected/promoted. Use the official Better Auth Admin client/protocol for subsequent identity administration. Platform resource/moderation routes are documented in API.md. Production administration also requires verified email; impersonated identities cannot perform native or platform administration until valid original-session restoration.

Investigate `attempted` native audit events rather than treating them as success or failure. Better Auth's native transaction cannot include the supported hook's final audit update; an interrupted update can leave the mutation completed with an attempted record. Platform suspension/resumption and its audit share one transaction. There is no audit retention scheduler, export sink or tamper-proof database policy in this scope; API absence of audit edits does not prove resistance to a privileged database operator.

Current UUIDs and stored timestamp representations remain unchanged. Drizzle auth timestamp-without-time-zone Date values are UTC; public ban expiry explicitly compares against database UTC time regardless of session timezone. Existing Date-based auth behavior is preserved. ID/timezone schema conversion requires a separate reviewed migration with instant/reference preservation proof.

Restore verification now checks eleven tables including admin_audit, and compares fixture suspension/reason and audit action/reason in addition to draft/snapshot/pointer and immutable release trigger. This is isolated folio_test structural proof, not a restore of the production Neon backup or proof of R2/mail.

## Frontend and public assets — 2026-10-14
Authenticated owned upload/complete/save/private preview and real published project cover/gallery decoding passed. Keep public image gateway302 CORP cross-origin scoped to the successful matched public asset route; private/default routes remain same-origin. Preserve current-release checks/no-store and avoid logging signed URLs. Synthetic QA draft/asset/inquiry and additional immutable QA release are retained; original published pointer/snapshot restored exactly.

## Typography, SEO and latest checks — 2026-10-14
Self-hosted fonts live in web dependencies/lockfile; no runtime CDN credentials. Configure NEXT_PUBLIC_WEB_URL to real web origin for canonical/robots/sitemaps. Sitemap index limit50,000 entries requires sharding beyond that; discovery pages100. SEO uses published snapshots, existing available cover images; generated fallback artwork and real social-crawler fetch acceptance remain unverified. Database deadlines: connection5s, server statement15s, client read16s; client deadline does not prove cancellation of server work. Actual transient network stall recovered after API restart, no data reset. Current11 HTTP checks and17 isolated tests passed; see STATUS.

## Current source layout and browser fixture

Source ownership is documented in SOURCE_STRUCTURE.md. The reusable browser seed server lives under apps/api/tests/fixtures/browser-server.ts; scripts/admin-browser-fixture.ts is its thin entry point. Always use the guarded root command `bun run test --admin-browser`, not an inherited development/Neon environment. It uses local folio_test and API127.0.0.1:4400 with web127.0.0.1:4300, uniquely generated users and private0600 temporary credentials. Closing the process cleans only that run's fixture users/audit rows.

During an observed local Neon connection delay, a read-only connection took7857ms against a5000ms deadline. The ongoing local API session was restarted with `DB_CONNECT_TIMEOUT_MS=20000` as a temporary runtime override; source defaults, hidden environment files and production policy were not changed. Recheck connectivity and choose deployment deadlines from real measurements, not this one sample.
