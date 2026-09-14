import sanitizeHtml from "sanitize-html";

/**
 * Strips all markup, for fields that must be plain text (titles, names,
 * alt text, SEO fields, tags, site settings). None of these are meant to
 * contain HTML at all, so this closes stored-XSS via them even though the
 * risk was already low (they're editor/admin-authored, not public input).
 */
export function sanitizePlainText(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

/**
 * Allows a small, safe set of formatting tags for article body content
 * (stored as markdown/HTML, see content.ts's schema comments). Strips
 * script/style/iframe/object/embed, every event handler attribute, and any
 * non-http(s)/mailto URI scheme in href (blocks javascript:/data: links).
 */
export function sanitizeRichText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "code", "pre"],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }, true),
    },
  });
}
