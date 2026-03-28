import type { ViewMode } from "@/lib/view-mode";

export function withViewModeHref(href: string, mode?: ViewMode | null) {
  if (!mode) return href;

  const [pathname, hash = ""] = href.split("#");
  const [basePath, query = ""] = pathname.split("?");
  const params = new URLSearchParams(query);
  params.set("view", mode);
  const nextHref = `${basePath}?${params.toString()}`;

  return hash ? `${nextHref}#${hash}` : nextHref;
}
