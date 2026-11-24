import { NextRequest } from "next/server";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";

export const dynamic = "force-dynamic";

/** Reports are a few hundred bytes; anything far larger is not a browser report. */
const MAX_REPORT_BYTES = 16 * 1024;
const MAX_REPORTS_PER_REQUEST = 10;

type Violation = { directive: string; blocked: string; page: string; disposition: string };

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * The origin (or keyword such as "inline" / "eval") of a URL, never its path
 * or query: blocked URLs and page URLs can carry tokens or personal data.
 */
function originOnly(value: unknown): string {
  const text = asString(value).slice(0, 500);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.origin === "null" ? `${url.protocol}` : url.origin;
  } catch {
    return text.split(/[/?#\s]/)[0]!.slice(0, 40);
  }
}

/** The path of the page the violation happened on, without the query string. */
function pathOnly(value: unknown): string {
  try {
    return new URL(asString(value)).pathname.slice(0, 200);
  } catch {
    return "";
  }
}

/**
 * Both report formats: the legacy `report-uri` body (application/csp-report,
 * `{ "csp-report": { ... } }` with kebab-case keys) and the Reporting API body
 * (application/reports+json, an array of `{ type: "csp-violation", body }`
 * with camelCase keys).
 */
function violationsOf(payload: unknown): Violation[] {
  const reports: Record<string, unknown>[] = [];
  if (Array.isArray(payload)) {
    for (const entry of payload.slice(0, MAX_REPORTS_PER_REQUEST)) {
      if (entry && typeof entry === "object" && (entry as { type?: unknown }).type === "csp-violation") {
        const body = (entry as { body?: unknown }).body;
        if (body && typeof body === "object") reports.push(body as Record<string, unknown>);
      }
    }
  } else if (payload && typeof payload === "object") {
    const legacy = (payload as Record<string, unknown>)["csp-report"];
    if (legacy && typeof legacy === "object") reports.push(legacy as Record<string, unknown>);
  }
  return reports.map((report) => ({
    directive: asString(report.effectiveDirective ?? report["effective-directive"] ?? report["violated-directive"]).slice(0, 60),
    blocked: originOnly(report.blockedURL ?? report["blocked-uri"]),
    page: pathOnly(report.documentURL ?? report["document-uri"]),
    disposition: asString(report.disposition).slice(0, 20),
  }));
}

/**
 * Receives Content-Security-Policy violation reports. It only logs a short
 * summary (directive, blocked origin, page path) for watching the policy
 * before it is enforced; nothing is stored. Always 204 (429 when one network
 * sends too many), and a malformed body is ignored rather than refused.
 */
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(RATE_LIMITS.CSP_REPORT_IP, getClientIp(request.headers), {});
  if (limited) return limited;

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_REPORT_BYTES) return new Response(null, { status: 204 });

  try {
    const text = await request.text();
    if (text.length <= MAX_REPORT_BYTES) {
      for (const violation of violationsOf(JSON.parse(text))) {
        console.warn("[csp-report]", JSON.stringify(violation));
      }
    }
  } catch {
    // Not JSON: nothing to log.
  }
  return new Response(null, { status: 204 });
}
