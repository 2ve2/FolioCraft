import type { Locale } from "@ichnara/contracts";

export type LegalDocument = "privacy" | "terms" | "content-policy";
type Section = { heading: string; paragraphs?: string[]; items?: string[] };
type LegalText = { title: string; summary: string; sections: Section[] };

/** Date of the current draft wording; update together with any substantive change. */
export const legalDraftDate = "2026-10-20";

/**
 * Draft legal texts. They describe only what the code does today and are not reviewed
 * by counsel; the page shows a visible draft notice until the owner approves them.
 */
export const legalCopy: Record<
	Locale,
	{
		draftNotice: string;
		updated: string;
		nav: Record<LegalDocument, string>;
		documents: Record<LegalDocument, LegalText>;
	}
> = {
	ar: {
		draftNotice:
			"مسودة قيد المراجعة: هذه الصفحة تصف طريقة عمل المنصة حاليًا خلال فترة التجربة، ولم تُعتمد قانونيًا بعد. سنعلن النسخة المعتمدة وبيانات التواصل الرسمية قبل الإطلاق العام.",
		updated: "آخر تحديث للمسودة",
		nav: {
			privacy: "الخصوصية",
			terms: "شروط الاستخدام",
			"content-policy": "سياسة المحتوى",
		},
		documents: {
			privacy: {
				title: "إشعار الخصوصية",
				summary:
					"نجمع ما يلزم فقط لتشغيل حسابك ونشر ما تختاره. لا إعلانات، ولا بيع للبيانات، ولا أدوات تتبّع.",
				sections: [
					{
						heading: "ما الذي نحفظه",
						items: [
							"بيانات الحساب: الاسم، والبريد الإلكتروني، وكلمة المرور محفوظة بصيغة مشفّرة لا يمكن استرجاعها، وحالة تأكيد البريد.",
							"بيانات الجلسة: رمز الجلسة في ملف تعريف ارتباط ضروري، مع عنوان IP ونوع المتصفح لكل جلسة لأغراض الأمان.",
							"محتوى معرض أعمالك: المسودات، وكل نسخة تنشرها، والصور التي ترفعها.",
							"رسائل الزوار عبر نموذج التواصل في موقعك: الاسم والبريد ونص الرسالة، وتظهر لك وحدك.",
							"البلاغات عن المحتوى: التصنيف والرسالة وبريد المُبلِّغ إن أضافه، وبصمة أحادية الاتجاه لعنوان IP بدل العنوان نفسه.",
							"سجلات الحماية: عدّادات مُجزّأة للحد من الإساءة، وسجل بإجراءات فريق الإدارة.",
						],
					},
					{
						heading: "كيف نستخدمها",
						paragraphs: [
							"لتشغيل حسابك وحفظ عملك، ونشر ما تختار نشره فقط، وإرسال رسائل التأكيد واستعادة كلمة المرور، وحماية المنصة من الإساءة. لا نستخدم بياناتك للإعلانات ولا نبيعها.",
						],
					},
					{
						heading: "ملفات تعريف الارتباط والتتبّع",
						paragraphs: [
							"نستخدم ملفات تعريف ارتباط ضرورية لتسجيل الدخول فقط. لا توجد ملفات تتبّع أو تحليلات أو إعلانات. لغة الواجهة تُحفظ في رابط الصفحة.",
						],
					},
					{
						heading: "ما يراه الآخرون",
						paragraphs: [
							"المسودات خاصة بك. عند النشر يصبح معرض أعمالك متاحًا لأي شخص، وقد تفهرسه محركات البحث. يمكنك إلغاء النشر في أي وقت.",
						],
					},
					{
						heading: "مزوّدو الخدمة",
						paragraphs: [
							"نعتمد على Cloudflare للاستضافة وتخزين الصور والتحقق منها، وعلى Neon لقاعدة البيانات، وعلى Resend لإرسال رسائل البريد. قد تُعالَج البيانات خارج بلدك.",
						],
					},
					{
						heading: "مدة الاحتفاظ",
						paragraphs: [
							"لم تُحدَّد مدد الاحتفاظ النهائية بعد. حاليًا تبقى بياناتك ما دام حسابك قائمًا، وتُحفظ نسخ النشر السابقة لتتمكن من استعادتها. سنحدد المدد بوضوح قبل الإطلاق العام.",
						],
					},
					{
						heading: "حقوقك",
						paragraphs: [
							"يمكنك طلب نسخة من بياناتك أو تصحيحها أو حذف حسابك. تُعالَج الطلبات حاليًا عبر فريق المنصة، وسننشر قناة التواصل الرسمية قبل الإطلاق العام.",
						],
					},
				],
			},
			terms: {
				title: "شروط الاستخدام",
				summary: "قواعد بسيطة لاستخدام إيكنارا خلال فترة التجربة الحالية.",
				sections: [
					{
						heading: "الخدمة",
						paragraphs: [
							"إيكنارا منصة لإنشاء معرض أعمال بقالب ثابت ونشره برابط عام. الخدمة في مرحلة تجريبية وتُقدَّم كما هي، وقد تتغير أو تتوقف أجزاء منها.",
						],
					},
					{
						heading: "حسابك",
						paragraphs: [
							"أنت مسؤول عن صحة بياناتك وعن سرية كلمة المرور وعن كل ما يتم من خلال حسابك. حساب واحد لكل شخص، ومعرض أعمال واحد لكل حساب.",
						],
					},
					{
						heading: "محتواك",
						paragraphs: [
							"يبقى محتواك ملكًا لك. بنشره تمنحنا إذنًا محدودًا باستضافته وعرضه للعامة بالشكل الذي اخترته، وينتهي هذا الإذن عند إلغاء النشر أو حذف الحساب، باستثناء ما يلزم حفظه أمنيًا أو قانونيًا.",
						],
					},
					{
						heading: "الاستخدام المقبول",
						paragraphs: [
							"يجب أن يلتزم المحتوى بسياسة المحتوى. يحق لنا تعليق موقع أو حساب يخالفها، مع حفظ سجل بالإجراء.",
						],
					},
					{
						heading: "حدود المسؤولية",
						paragraphs: [
							"لا نضمن توفر الخدمة دون انقطاع خلال فترة التجربة. احتفظ بنسخة من محتواك المهم؛ يتيح الاستوديو تصدير مسودتك.",
						],
					},
					{
						heading: "التعديلات",
						paragraphs: [
							"قد نحدّث هذه الشروط، وسنوضح تاريخ آخر تحديث في هذه الصفحة. القانون الواجب التطبيق سيُحدَّد في النسخة المعتمدة.",
						],
					},
				],
			},
			"content-policy": {
				title: "سياسة المحتوى",
				summary: "إيكنارا مساحة لعرض عملك الحقيقي. هذه أنواع المحتوى غير المسموح بها.",
				sections: [
					{
						heading: "غير مسموح",
						items: [
							"انتحال شخصية أو جهة أخرى، أو ادعاء أعمال ليست لك.",
							"المحتوى غير القانوني أو ما يروّج له.",
							"التحرش أو التهديد أو خطاب الكراهية.",
							"المحتوى الجنسي الصريح.",
							"الرسائل المزعجة، أو روابط الاحتيال أو التصيّد أو البرمجيات الضارة.",
							"انتهاك حقوق النشر أو الملكية الفكرية.",
							"نشر بيانات شخصية لغيرك دون إذنه.",
						],
					},
					{
						heading: "الإبلاغ",
						paragraphs: [
							"يحتوي كل معرض أعمال منشور على خيار «الإبلاغ عن هذا الموقع». تُراجَع البلاغات من فريق الإدارة، ولا نخزّن عنوان IP للمبلِّغ.",
						],
					},
					{
						heading: "الإجراءات",
						paragraphs: ["قد نعلّق الموقع المخالف أو الحساب، ويُسجَّل كل إجراء إداري مع سببه."],
					},
				],
			},
		},
	},
	en: {
		draftNotice:
			"Draft under review: this page describes how the platform works today during the trial and has not been legally approved. The approved version and official contact details will be published before the public launch.",
		updated: "Draft last updated",
		nav: {
			privacy: "Privacy",
			terms: "Terms of use",
			"content-policy": "Content policy",
		},
		documents: {
			privacy: {
				title: "Privacy notice",
				summary:
					"We keep only what is needed to run your account and publish what you choose. No ads, no data sales, no trackers.",
				sections: [
					{
						heading: "What we store",
						items: [
							"Account data: your name, email address, a one-way hash of your password, and whether your email is verified.",
							"Session data: a session token in an essential cookie, with the IP address and browser user agent recorded for each session for security.",
							"Your portfolio content: drafts, every version you publish, and the images you upload.",
							"Messages visitors send through your contact form: their name, email and message, visible only to you.",
							"Content reports: the category, message, an optional reporter email, and a one-way hash of the reporter's IP address instead of the address itself.",
							"Protection records: hashed abuse-limit counters and an audit log of staff actions.",
						],
					},
					{
						heading: "How we use it",
						paragraphs: [
							"To run your account and keep your work, publish only what you choose to publish, send verification and password-reset emails, and protect the platform from abuse. We do not use your data for advertising and we do not sell it.",
						],
					},
					{
						heading: "Cookies and tracking",
						paragraphs: [
							"We use only the essential cookies needed to keep you signed in. There are no tracking, analytics or advertising cookies. The interface language is kept in the page address.",
						],
					},
					{
						heading: "What others can see",
						paragraphs: [
							"Drafts are private to you. Once published, your portfolio is visible to anyone and may be indexed by search engines. You can unpublish at any time.",
						],
					},
					{
						heading: "Service providers",
						paragraphs: [
							"We rely on Cloudflare for hosting and for storing and checking images, Neon for the database, and Resend for sending email. Data may be processed outside your country.",
						],
					},
					{
						heading: "How long we keep data",
						paragraphs: [
							"Final retention periods have not been set yet. Today your data is kept while your account exists, and previous published versions are kept so you can restore them. We will define clear periods before the public launch.",
						],
					},
					{
						heading: "Your rights",
						paragraphs: [
							"You can ask for a copy of your data, for corrections, or for your account to be deleted. Requests are currently handled by the platform team; the official contact channel will be published before the public launch.",
						],
					},
				],
			},
			terms: {
				title: "Terms of use",
				summary: "Simple rules for using Ichnara during the current trial.",
				sections: [
					{
						heading: "The service",
						paragraphs: [
							"Ichnara lets you build a portfolio on one considered layout and publish it at a public link. The service is in a trial phase and is provided as is; parts of it may change or stop.",
						],
					},
					{
						heading: "Your account",
						paragraphs: [
							"You are responsible for accurate details, for keeping your password secret, and for everything done through your account. One account per person and one portfolio per account.",
						],
					},
					{
						heading: "Your content",
						paragraphs: [
							"Your content stays yours. By publishing it you give us a limited permission to host it and show it publicly as you arranged it. That permission ends when you unpublish or delete your account, except for what must be kept for security or legal reasons.",
						],
					},
					{
						heading: "Acceptable use",
						paragraphs: [
							"Content must follow the content policy. We may suspend a portfolio or account that breaks it, and every such action is logged.",
						],
					},
					{
						heading: "Limits of liability",
						paragraphs: [
							"We do not guarantee uninterrupted availability during the trial. Keep a copy of important content; the Studio lets you export your draft.",
						],
					},
					{
						heading: "Changes",
						paragraphs: [
							"We may update these terms and will show the latest update date on this page. The governing law will be set out in the approved version.",
						],
					},
				],
			},
			"content-policy": {
				title: "Content policy",
				summary:
					"Ichnara is a place to show your real work. These kinds of content are not allowed.",
				sections: [
					{
						heading: "Not allowed",
						items: [
							"Impersonating another person or organization, or claiming work that is not yours.",
							"Illegal content, or content that promotes illegal activity.",
							"Harassment, threats or hate speech.",
							"Sexually explicit content.",
							"Spam, or links to scams, phishing or malware.",
							"Infringing copyright or other intellectual property.",
							"Publishing other people's personal data without their consent.",
						],
					},
					{
						heading: "Reporting",
						paragraphs: [
							"Every published portfolio has a “Report this portfolio” option. Reports are reviewed by the platform team, and we do not store the reporter's IP address.",
						],
					},
					{
						heading: "Enforcement",
						paragraphs: [
							"We may suspend the offending portfolio or account; every staff action is recorded with its reason.",
						],
					},
				],
			},
		},
	},
};
