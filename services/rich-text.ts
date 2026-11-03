import sanitizeHtml from "sanitize-html";

/**
 * Allow-list sanitiser for rich text authored in the in-app editor
 * (blog bodies, fatwa answers). Everything not listed here is stripped:
 * script/style/iframe/svg/object, every `on*` handler, `javascript:` and
 * `data:` URLs, inline styles other than text colour.
 *
 * Call it on write (before persisting) and again on read (before
 * `dangerouslySetInnerHTML`) so rows stored before this sanitiser existed
 * are safe too. It is isomorphic: the client editor uses it as well.
 */
const ALLOWED_TAGS = [
  "p", "br", "h1", "h2", "h3", "h4",
  "ul", "ol", "li", "blockquote",
  "strong", "b", "em", "i", "u", "s", "sub", "sup",
  "a", "span", "div", "font", "hr",
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "target", "rel"],
    span: ["dir", "style"],
    div: ["dir", "style"],
    p: ["dir", "style"],
    h1: ["dir"], h2: ["dir"], h3: ["dir"], h4: ["dir"],
    li: ["dir"], blockquote: ["dir"],
    font: ["color"],
  },
  allowedStyles: {
    "*": {
      color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/, /^[a-z]{3,20}$/],
      "text-align": [/^(left|right|center|justify)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: "noopener noreferrer nofollow",
        ...(attribs.target === "_blank" ? { target: "_blank" } : {}),
      },
    }),
  },
};

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/** True when the editor should accept this link target. */
export function isAllowedLinkUrl(url: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(url.trim());
}
