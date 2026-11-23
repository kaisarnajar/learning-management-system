/**
 * POST { email } re-sends the verification e-mail to an unverified password
 * account (same endpoint as the website; always the same generic answer).
 */
export { POST } from "@/app/api/auth/resend-verification/route";
