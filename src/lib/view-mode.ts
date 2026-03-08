import { cookies } from "next/headers";

/**
 * S8: View mode type used throughout the application.
 * "fan" = Plain English labels, story callouts, hidden controls, prominent copilot
 * "org" = Technical labels, numerical benchmarks, visible controls, compact copilot
 */
export type ViewMode = "fan" | "org";

const COOKIE_NAME = "aibs_view_mode";

/**
 * Resolve the active view mode on the server.
 *
 * Precedence:
 * 1. Valid URL param `?view=fan|org` overrides everything
 * 2. Otherwise read cookie `aibs_view_mode`
 * 3. Otherwise default to `fan`
 */
export async function resolveViewMode(
    searchParams?: Record<string, string | string[] | undefined>,
): Promise<ViewMode> {
    // 1. URL param override
    const viewParam = searchParams?.view;
    const paramValue = Array.isArray(viewParam) ? viewParam[0] : viewParam;
    if (paramValue === "fan" || paramValue === "org") return paramValue;

    // 2. Cookie (wrapped in try/catch for test environments)
    try {
        const jar = await cookies();
        const cookieValue = jar.get(COOKIE_NAME)?.value;
        if (cookieValue === "fan" || cookieValue === "org") return cookieValue;
    } catch {
        // cookies() is unavailable outside a request context (e.g. tests)
    }

    // 3. Default
    return "fan";
}
