export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

export function uniqueSlug(base: string, suffix?: string | number | null): string {
  const slug = slugify(base);
  if (!suffix) return slug;
  return `${slug}-${String(suffix).toLowerCase()}`;
}
