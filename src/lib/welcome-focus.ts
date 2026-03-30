export type WelcomeFocusId = "games" | "teams" | "umpires" | "articles" | "about" | "community";
export type WelcomeFocusOption = { id: WelcomeFocusId };

export type WelcomeFocusInput = {
  path?: string | null;
  preferredFocus?: string | null;
  favoriteTeamHref?: string | null;
  publicProfileHref?: string | null;
};

const VALID_FOCUS: WelcomeFocusId[] = ["games", "teams", "umpires", "articles", "about", "community"];

export function resolveWelcomeFocusOption(input: WelcomeFocusInput, preferred?: string | null): WelcomeFocusOption {
  if (preferred && VALID_FOCUS.includes(preferred as WelcomeFocusId)) {
    return { id: preferred as WelcomeFocusId };
  }

  const path = input.path ?? "";
  if (path.startsWith("/teams")) return { id: "teams" };
  if (path.startsWith("/umpires")) return { id: "umpires" };
  if (path.startsWith("/articles")) return { id: "articles" };
  if (path.startsWith("/about")) return { id: "about" };
  if (path.startsWith("/profile") || path.startsWith("/u/") || path.startsWith("/welcome")) return { id: "community" };
  return { id: "games" };
}
