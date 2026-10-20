import { pool } from "./db";
import { maintenanceService } from "./services/maintenance";

// Runs scheduled maintenance once against the configured DATABASE_URL (local/manual use).
try {
	console.info(
		JSON.stringify({ event: "maintenance_completed", ...(await maintenanceService.run()) }),
	);
} finally {
	await pool.end();
}
