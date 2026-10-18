export function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, " ");
}

export function titleError(title: string) {
  const normalized = normalizeTitle(title);
  if (!normalized) return "Give the document a title.";
  if (normalized.length > 120) return "Titles can be at most 120 characters.";
  return null;
}

export function filenameFromTitle(title: string) {
  const slug = normalizeTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "document"}.md`;
}
