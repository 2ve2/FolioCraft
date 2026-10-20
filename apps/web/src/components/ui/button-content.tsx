import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./button-content.module.css";

/** Keeps an action's dimensions and accessible name while showing only its pending spinner. */
export function ButtonContent({ loading, children }: { loading: boolean; children: ReactNode }) {
	return (
		<span className={styles.content} aria-busy={loading}>
			<span className={loading ? styles.pendingLabel : undefined}>{children}</span>
			{loading && (
				<LoaderCircle className={`spin ${styles.spinner}`} size={18} aria-hidden="true" />
			)}
		</span>
	);
}
