import { Sparkles } from "lucide-react";

/** Renders the shared FolioCraft identity mark. */
export function Brand() {
	return (
		<span className="brand">
			<span className="brand-mark">
				<Sparkles size={19} />
			</span>
			<span>
				Folio<span className="brand-light">Craft</span>
				<small>PORTFOLIO STUDIO</small>
			</span>
		</span>
	);
}
