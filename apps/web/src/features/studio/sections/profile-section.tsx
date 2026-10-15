import { collectAssetIds, type Draft } from "@folio/contracts";
import { FileText } from "lucide-react";
import { Field } from "../../../components/ui/field";
import { AssetPicker } from "../../assets/asset-picker";
import { copy } from "../copy";
import type { EditorSectionProps } from "../types";

/** Edits profile fields and social links through the shared draft updater. */
export function ProfileSection({ draft, site, locale, update }: EditorSectionProps) {
	const t = copy[locale];
	const profile = draft.profile;

	/** Changes one profile field while retaining the remaining draft. */
	const updateProfile = (key: keyof Draft["profile"], value: string | boolean) =>
		update({ ...draft, profile: { ...profile, [key]: value } });

	return (
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
	);
}
