import { Sparkles } from "lucide-react";

/** Renders the shared Ichnara identity mark. */
export function Brand() {
	return (
		<span className="brand">
			<span className="brand-mark">
				<Sparkles size={19} />
			</span>
			<span>
				Ichnara
				<small>PORTFOLIO STUDIO</small>
			</span>
		</span>
	);
}
