import type { Draft, Project } from "@folio/contracts";
import { collectAssetIds } from "@folio/contracts";
import { FileText, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { Field } from "../../../components/ui/field";
import { AssetPicker } from "../../assets/asset-picker";
import { ContentEditors } from "../../content/content-editors";
import { ProjectExtras } from "../../content/project-extras";
import { moveItem } from "../../content/reorder";
import { copy } from "../copy";
import type { EditorSectionProps } from "../types";
export function ContentSection({
	draft,
	site,
	locale,
	update,
	setError,
}: EditorSectionProps & { setError: (error: string) => void }) {
	const t = copy[locale];
	const profile = draft.profile;
	const updateProfile = (key: keyof Draft["profile"], value: string | boolean) =>
		update({ ...draft, profile: { ...profile, [key]: value } });
	const changeProject = (id: string, key: keyof Project, value: string) =>
		update({
			...draft,
			projects: draft.projects.map((project) =>
				project.id === id ? { ...project, [key]: value } : project,
			),
		});
	const addProject = () => {
		if (draft.projects.length >= 30) {
			setError(t.projectsLimit);
			return;
		}
		update({
			...draft,
			projects: [
				...draft.projects,
				{
					id: crypto.randomUUID(),
					title: "",
					summary: "",
					body: "",
					role: "",
					year: "",
					tools: "",
					url: "",
				},
			],
		});
	};
	return (
		<>
			<div className="section-heading">
				<span className="eyebrow">01 / {t.content}</span>
				<h1>{t.profile}</h1>
				<p>{t.profileDesc}</p>
			</div>
			<nav
				className="content-jump-nav"
				aria-label={locale === "ar" ? "أقسام المحتوى" : "Content sections"}
			>
				{[
					{ id: "profile", ar: "النبذة", en: "Profile" },
					{ id: "projects", ar: "المشاريع", en: "Projects" },
					{ id: "experiences", ar: "الخبرات", en: "Experience" },
					{ id: "education", ar: "التعليم", en: "Education" },
					{ id: "skills", ar: "المهارات", en: "Skills" },
					{ id: "articles", ar: "المقالات", en: "Articles" },
				].map((item) => (
					<a key={item.id} href={`#studio-${item.id}`}>
						{locale === "ar" ? item.ar : item.en}
					</a>
				))}
			</nav>
			<section className="editor-card" id="studio-profile">
				<div className="card-heading">
					<span className="card-icon">
						<FileText size={18} />
					</span>
					<h2>{t.profile}</h2>
				</div>
				<Field label={t.name}>
					<input
						value={profile.name}
						maxLength={100}
						required
						onChange={(e) => updateProfile("name", e.target.value)}
					/>
				</Field>
				<Field label={t.role}>
					<input
						value={profile.role}
						maxLength={140}
						onChange={(e) => updateProfile("role", e.target.value)}
					/>
				</Field>
				<Field label={t.bio}>
					<textarea
						dir="auto"
						rows={5}
						maxLength={3000}
						value={profile.bio}
						onChange={(e) => updateProfile("bio", e.target.value)}
					/>
				</Field>
				<Field label={t.location}>
					<input
						maxLength={100}
						value={profile.location}
						onChange={(e) => updateProfile("location", e.target.value)}
					/>
				</Field>
				<div className="two-fields">
					<Field label={t.contactEmail} hint={t.publicContact}>
						<input
							type="email"
							dir="ltr"
							value={profile.email}
							onChange={(e) => updateProfile("email", e.target.value)}
						/>
					</Field>
					<Field label={t.website}>
						<input
							type="url"
							dir="ltr"
							placeholder="https://"
							value={profile.website}
							onChange={(e) => updateProfile("website", e.target.value)}
						/>
					</Field>
				</div>
				<label className="switch-row">
					<input
						type="checkbox"
						checked={profile.available}
						onChange={(e) => updateProfile("available", e.target.checked)}
					/>
					<span>{t.available}</span>
				</label>
				<AssetPicker
					protectedIds={collectAssetIds(draft)}
					siteId={site.id}
					locale={locale}
					label={locale === "ar" ? "الصورة الشخصية" : "Profile image"}
					value={profile.imageAssetId}
					onChange={(imageAssetId) =>
						update((d) => ({ ...d, profile: { ...d.profile, imageAssetId } }))
					}
				/>
				<h3>{locale === "ar" ? "روابط التواصل" : "Social links"}</h3>
				{(profile.socialLinks ?? []).map((link, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Social-link contract has no ID; rows contain only controlled fields.
					<div className="collection-item" key={index}>
						<Field label={locale === "ar" ? "اسم الرابط" : "Link label"}>
							<input
								maxLength={50}
								value={link.label}
								onChange={(e) => {
									const label = e.target.value;
									update((d) => ({
										...d,
										profile: {
											...d.profile,
											socialLinks: d.profile.socialLinks?.map((x, i) =>
												i === index ? { ...x, label } : x,
											),
										},
									}));
								}}
							/>
						</Field>
						<Field label={t.website}>
							<input
								dir="ltr"
								type="url"
								value={link.url}
								onChange={(e) => {
									const url = e.target.value;
									update((d) => ({
										...d,
										profile: {
											...d.profile,
											socialLinks: d.profile.socialLinks?.map((x, i) =>
												i === index ? { ...x, url } : x,
											),
										},
									}));
								}}
							/>
						</Field>
						<button
							type="button"
							className="danger-button"
							onClick={() =>
								update((d) => ({
									...d,
									profile: {
										...d.profile,
										socialLinks: d.profile.socialLinks?.filter((_, i) => i !== index),
									},
								}))
							}
						>
							{locale === "ar" ? "إزالة الرابط" : "Remove link"}
						</button>
					</div>
				))}
				<button
					type="button"
					className="secondary"
					disabled={(profile.socialLinks?.length ?? 0) >= 10}
					onClick={() =>
						update((d) => ({
							...d,
							profile: {
								...d.profile,
								socialLinks: [...(d.profile.socialLinks ?? []), { label: "", url: "" }],
							},
						}))
					}
				>
					{locale === "ar" ? "إضافة رابط" : "Add link"}
				</button>
			</section>
			<section className="projects-heading" id="studio-projects">
				<div>
					<h2>{t.projects}</h2>
					<p>{t.projectDesc}</p>
				</div>
				<button className="secondary small" type="button" onClick={addProject}>
					<Plus size={16} />
					{t.addProject}
				</button>
			</section>
			{!draft.projects.length && (
				<div className="empty-card">
					<LayoutGrid size={28} />
					<h3>{t.emptyProjects}</h3>
					<p>{t.emptyProjectsText}</p>
					<button className="primary small" type="button" onClick={addProject}>
						<Plus size={16} />
						{t.addProject}
					</button>
				</div>
			)}
			{draft.projects.map((project, index) => (
				<section className="editor-card project-editor" key={project.id}>
					<div className="card-heading">
						<span className="project-number">{String(index + 1).padStart(2, "0")}</span>
						<h2>{project.title || t.projectTitle}</h2>
						<button
							className="icon-button danger"
							aria-label={t.remove}
							title={t.remove}
							type="button"
							onClick={() => {
								if (window.confirm(t.removeConfirm))
									update({
										...draft,
										projects: draft.projects.filter((p) => p.id !== project.id),
									});
							}}
						>
							<Trash2 size={17} />
						</button>
					</div>
					<Field label={`${t.projectTitle} · ${t.required}`}>
						<input
							required
							maxLength={120}
							value={project.title}
							onChange={(e) => changeProject(project.id, "title", e.target.value)}
						/>
					</Field>
					<Field label={t.summary}>
						<textarea
							dir="auto"
							rows={3}
							maxLength={700}
							value={project.summary}
							onChange={(e) => changeProject(project.id, "summary", e.target.value)}
						/>
					</Field>
					<Field label={t.body}>
						<textarea
							dir="auto"
							rows={6}
							maxLength={12000}
							value={project.body}
							onChange={(e) => changeProject(project.id, "body", e.target.value)}
						/>
					</Field>
					<div className="two-fields">
						<Field label={t.projectRole}>
							<input
								maxLength={140}
								value={project.role}
								onChange={(e) => changeProject(project.id, "role", e.target.value)}
							/>
						</Field>
						<Field label={t.year}>
							<input
								maxLength={20}
								value={project.year}
								onChange={(e) => changeProject(project.id, "year", e.target.value)}
							/>
						</Field>
					</div>
					<Field label={t.tools}>
						<input
							maxLength={300}
							value={project.tools}
							onChange={(e) => changeProject(project.id, "tools", e.target.value)}
						/>
					</Field>
					<Field label={t.projectLink}>
						<input
							type="url"
							dir="ltr"
							placeholder="https://"
							value={project.url}
							onChange={(e) => changeProject(project.id, "url", e.target.value)}
						/>
					</Field>
					<div className="content-actions">
						<button
							type="button"
							className="text-button"
							disabled={index === 0}
							onClick={() => update((d) => ({ ...d, projects: moveItem(d.projects, index, -1) }))}
						>
							{locale === "ar" ? "تحريك للأعلى" : "Move up"}
						</button>
						<button
							type="button"
							className="text-button"
							disabled={index === draft.projects.length - 1}
							onClick={() => update((d) => ({ ...d, projects: moveItem(d.projects, index, 1) }))}
						>
							{locale === "ar" ? "تحريك للأسفل" : "Move down"}
						</button>
					</div>
					<ProjectExtras
						protectedIds={collectAssetIds(draft)}
						project={project}
						siteId={site.id}
						locale={locale}
						onChange={(patch) =>
							update((d) => ({
								...d,
								projects: d.projects.map((x) =>
									x.id === project.id
										? { ...x, ...(typeof patch === "function" ? patch(x) : patch) }
										: x,
								),
							}))
						}
					/>
				</section>
			))}
			<ContentEditors draft={draft} siteId={site.id} locale={locale} update={update} />
		</>
	);
}
