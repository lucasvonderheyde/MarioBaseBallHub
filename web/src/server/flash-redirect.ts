import "server-only";

import { redirect } from "next/navigation";

/** Redirects with a query-string error message for server-action form flows. */
export function redirectWithFormError(path: string, message: string): never {
  redirect(`${path}?e=${encodeURIComponent(message)}`);
}
