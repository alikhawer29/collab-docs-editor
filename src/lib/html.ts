import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "h1", "h2", "h3", "ul", "ol", "li"];

export function sanitizeDocumentHtml(html: string) {
  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    allowedSchemes: [],
    disallowedTagsMode: "discard",
  }).trim();
  return clean || "<p></p>";
}
