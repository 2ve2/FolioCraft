import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { apiOrigin } from "./api-origin";
export const authClient = createAuthClient({ baseURL: apiOrigin, plugins: [adminClient()] });
