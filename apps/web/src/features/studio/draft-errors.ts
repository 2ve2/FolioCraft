/** Translates validation paths without changing schema errors or save/revision behavior. */
export function formatDraftIssues(issues: { path: PropertyKey[] }[], ar: boolean): string {
	const groups = ar
		? {
				experiences: "الخبرات",
				education: "التعليم",
				skills: "المهارات",
				articles: "المقالات",
				projects: "المشاريع",
				profile: "النبذة",
				startDate: "تاريخ البداية",
				endDate: "تاريخ النهاية",
				title: "العنوان",
				slug: "عنوان الرابط",
				organization: "الجهة",
				role: "المسمى",
				items: "العناصر",
				category: "المجموعة",
				qualification: "المؤهل",
				description: "الوصف",
				accomplishments: "الإنجازات",
				richBody: "كتل المحتوى",
				text: "النص",
				level: "مستوى العنوان",
				summary: "الملخص",
				body: "النص",
				verificationUrl: "رابط التحقق",
				socialLinks: "روابط التواصل",
				label: "اسم الرابط",
				url: "الرابط",
				email: "البريد",
				website: "الموقع",
				galleryAssetIds: "صور المعرض",
				results: "النتائج",
			}
		: {
				experiences: "Experience",
				education: "Education",
				skills: "Skills",
				articles: "Articles",
				projects: "Projects",
				profile: "Profile",
				startDate: "Start date",
				endDate: "End date",
				title: "Title",
				slug: "URL slug",
				organization: "Organization",
				role: "Role",
				items: "Items",
				category: "Skill group",
				qualification: "Qualification",
				description: "Description",
				accomplishments: "Accomplishments",
				richBody: "Content blocks",
				text: "Text",
				level: "Heading level",
				summary: "Summary",
				body: "Text",
				verificationUrl: "Verification link",
				socialLinks: "Social links",
				label: "Link label",
				url: "Link",
				email: "Email",
				website: "Website",
				galleryAssetIds: "Gallery images",
				results: "Results",
			};
	return issues
		.slice(0, 3)
		.map((issue) =>
			issue.path
				.map((key) =>
					typeof key === "number" ? key + 1 : (groups[key as keyof typeof groups] ?? key),
				)
				.join(" / "),
		)
		.join("؛ ");
}
