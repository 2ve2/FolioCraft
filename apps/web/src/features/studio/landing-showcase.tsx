import { type Draft, emptyDraft, type Locale } from "@folio/contracts";
import Link from "next/link";
import { useState } from "react";
import { ExpandedPortfolioPreview, PortfolioPreview } from "../portfolio/portfolio-preview";

/** Demonstrates real shared rendering with explicitly fictional, browser-local content. */
export function LandingShowcase({
	locale,
	expanded,
	device,
	onClose,
}: {
	locale: Locale;
	expanded: boolean;
	device: "desktop" | "mobile";
	onClose: () => void;
}) {
	const ar = locale === "ar";
	const [theme, setTheme] = useState<Draft["appearance"]["theme"]>("light");
	const draft = emptyDraft(locale);
	draft.appearance.theme = theme;
	draft.profile = {
		...draft.profile,
		name: ar ? "نور أحمد" : "Noor Ahmed",
		role: ar ? "مصممة منتجات رقمية" : "Digital product designer",
		bio: ar
			? "أحوّل الأفكار المعقدة إلى تجارب بسيطة وواضحة. هنا مساحة أشارك فيها عملي وطريقتي في التفكير."
			: "I turn complex ideas into clear, thoughtful experiences. A space for my work and the thinking behind it.",
	};
	draft.projects = [
		{
			id: "landing-sample-project",
			title: ar ? "مساحة للقراءة" : "A space for reading",
			summary: ar
				? "تصوّر تصميمي لمكتبة رقمية هادئة، من الفكرة إلى الواجهات."
				: "A concept for a calm digital library, from first sketches to interface design.",
			body: ar
				? "هذا مشروع توضيحي خيالي. استخدم مشاريعك الحقيقية لشرح المشكلة ودورك وما تعلمته."
				: "This is a fictional example. Use your real projects to explain the problem, your role and what you learned.",
			tools: "Research, Design",
			role: "",
			year: "",
			url: "",
			featured: true,
		},
	];
	return (
		<section
			className="landing-showcase"
			id="example"
			aria-label={ar ? "مثال تفاعلي" : "Interactive example"}
		>
			{expanded && (
				<ExpandedPortfolioPreview
					locale={locale}
					draft={draft}
					slug="illustrative-example"
					assetUrls={{}}
					device={device}
					onClose={onClose}
				/>
			)}
			<div className="showcase-bar">
				<span className="showcase-dots" aria-hidden="true">
					● ● ●
				</span>
				<span>{ar ? "مثال خيالي · القالب الفعلي" : "Fictional example · real template"}</span>
			</div>
			<div className="portfolio-viewport landing-viewport">
				<PortfolioPreview
					draft={draft}
					slug="illustrative-example"
					assetUrls={{}}
					device="desktop"
				/>
			</div>
			<fieldset className="showcase-themes" aria-label={ar ? "جرّب المظهر" : "Try a theme"}>
				<span>{ar ? "نفس العمل، لمستك." : "Same work. Your expression."}</span>
				{(["light", "dark", "editorial"] as const).map((value, i) => (
					<button
						type="button"
						key={value}
						aria-pressed={theme === value}
						onClick={() => setTheme(value)}
					>
						{(ar ? ["فاتح", "داكن", "تحريري"] : ["Light", "Dark", "Editorial"])[i]}
					</button>
				))}
			</fieldset>
		</section>
	);
}

/** Explains implemented product benefits and the real draft-to-release workflow. */
export function LandingDetails({
	locale,
	authenticated = false,
}: {
	locale: Locale;
	authenticated?: boolean;
}) {
	const ar = locale === "ar";
	const features = ar
		? [
				[
					"عملك، في صورة متكاملة",
					"اجمع مشاريعك وخبراتك ومهاراتك وتعليمك ومقالاتك في رابط واحد. الأقسام الفارغة تختفي تلقائيًا.",
				],
				[
					"هوية لك، دون تعقيد التصميم",
					"ابدأ بقالب واحد مدروس، ثم اختر المظهر والألوان والخط وحجم النص. غيّر الأسلوب مع الاحتفاظ بمحتواك.",
				],
				[
					"اكتب براحتك. انشر بقرارك.",
					"تُحفظ تعديلاتك في المسودة. تظل النسخة العامة كما هي حتى تنشر تحديثًا، ويمكنك العودة إلى إصدار محفوظ.",
				],
			]
		: [
				[
					"Your work, connected",
					"Bring projects, experience, skills, education and writing together at one address. Empty sections stay out of the way.",
				],
				[
					"Personal, without the layout work",
					"Start with one considered template. Choose a theme, colors, fonts and text size while keeping your content intact.",
				],
				[
					"Room to draft. Control to publish.",
					"Edits save to your draft. Your public page stays on its published version until you release an update, with saved releases to return to.",
				],
			];
	const steps = ar
		? [
				["ابدأ بمساحتك", "أنشئ حسابًا، واختر عنوان البورتفوليو ولغة محتواه: العربية أو الإنجليزية."],
				["احكِ قصتك", "أضف نبذتك وأعمالك، ثم اختر المظهر وراجع معاينة الهاتف والحاسوب."],
				[
					"انشر وشارك",
					"انشر النسخة التي ترضى عنها وشارك رابطك. ارجع لتطويرها عندما يكون لديك جديد.",
				],
			]
		: [
				[
					"Make it yours",
					"Create an account. Choose your portfolio address and its content language: English or Arabic.",
				],
				[
					"Tell your story",
					"Add your introduction and work, choose your appearance, and review desktop and phone previews.",
				],
				[
					"Publish and share",
					"Publish when you are ready and share your address. Come back to develop it as your work grows.",
				],
			];
	return (
		<div className="landing-details">
			<section className="landing-benefits" aria-labelledby="benefits-title">
				<div className="landing-section-title">
					<span className="eyebrow">{ar ? "مساحة لما تصنعه" : "Built around your work"}</span>
					<h2 id="benefits-title">
						{ar
							? "أقل انشغالًا بالقالب. مساحة أكبر لقصتك."
							: "Less layout work. More room for your story."}
					</h2>
					<p>
						{ar
							? "للمصممين والمطورين والكتّاب وكل من لديه عمل يريد مشاركته، بدعم حقيقي للعربية والإنجليزية."
							: "For designers, developers, writers and anyone with work to share. With English and Arabic support, including right-to-left layouts."}
					</p>
				</div>
				<div className="landing-feature-list">
					{features.map(([title, text], i) => (
						<article key={title}>
							<span aria-hidden="true">0{i + 1}</span>
							<div>
								<h3>{title}</h3>
								<p>{text}</p>
							</div>
						</article>
					))}
				</div>
			</section>
			<section className="landing-process" id="how-it-works" aria-labelledby="process-title">
				<span className="eyebrow">
					{ar ? "من الفكرة إلى رابطك" : "From first draft to your own address"}
				</span>
				<h2 id="process-title">
					{ar ? "ثلاث خطوات، ومساحة تتطور معك." : "Three steps. A home that grows with you."}
				</h2>
				<div className="landing-steps">
					{steps.map(([title, text], i) => (
						<article key={title}>
							<b>0{i + 1}</b>
							<h3>{title}</h3>
							<p>{text}</p>
						</article>
					))}
				</div>
			</section>
			<section className="landing-invitation">
				<div>
					<span className="eyebrow">FolioCraft</span>
					<h2>
						{ar ? "ابدأ بما لديك. وطوّره بطريقتك." : "Start with what you have. Make it your own."}
					</h2>
					<p>
						{ar
							? "مسودتك لك. وقرار النشر لك أيضًا."
							: "Your draft is yours. So is the decision to publish."}
					</p>
				</div>
				<Link className="primary" href={`/${authenticated ? "studio" : "signup"}?lang=${locale}`}>
					{authenticated
						? ar
							? "فتح الاستوديو"
							: "Open studio"
						: ar
							? "إنشاء حساب"
							: "Create an account"}
				</Link>
			</section>
		</div>
	);
}
