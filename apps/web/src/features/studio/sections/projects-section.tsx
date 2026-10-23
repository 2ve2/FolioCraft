import { collectAssetIds, newId, type Project } from "@ichnara/contracts";
import { LayoutGrid, Plus, Trash2 } from "lucide-react";
import { Field } from "../../../components/ui/field";
import { TooltipButton } from "../../../components/ui/tooltip-button";
import { withHttps } from "../../../lib/web-address";
import { ProjectExtras } from "../../content/project-extras";
import { moveItem } from "../../content/reorder";
import { copy } from "../copy";
import type { EditorSectionProps } from "../types";

/** Edits, orders and removes project drafts without touching published releases. */
export function ProjectsSection({
	draft,
	site,
	locale,
	update,
	setError,
}: EditorSectionProps & { setError: (error: string) => void }) {
	const t = copy[locale];

	/** Changes one project field without replacing other projects. */
	const changeProject = (id: string, key: keyof Project, value: string) =>
		update({
			...draft,
			projects: draft.projects.map((project) =>
				project.id === id ? { ...project, [key]: value } : project,
			),
		});

	/** Appends a blank project only while the collection is below its limit. */
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
					id: newId(),
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
						<TooltipButton
							className="icon-button danger"
							aria-label={t.remove}
							hint={t.remove}
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
						</TooltipButton>
					</div>
					<Field label={`${t.projectTitle} · ${t.required}`}>
						<input
							dir="auto"
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
								dir="auto"
								maxLength={140}
								value={project.role}
								onChange={(e) => changeProject(project.id, "role", e.target.value)}
							/>
						</Field>
						<Field label={t.year}>
							<input
								dir="auto"
								maxLength={20}
								value={project.year}
								onChange={(e) => changeProject(project.id, "year", e.target.value)}
							/>
						</Field>
					</div>
					<Field label={t.tools}>
						<input
							dir="auto"
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
							onBlur={(e) => {
								const url = withHttps(e.target.value);
								if (url !== e.target.value) changeProject(project.id, "url", url);
							}}
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
		</>
	);
}
