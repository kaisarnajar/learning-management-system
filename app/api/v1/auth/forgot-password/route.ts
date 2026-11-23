/**
 * POST { email } sends a password-reset e-mail (same endpoint as the website,
 * same generic answer whether or not the account exists). The e-mailed link
 * opens the website's reset page.
 */
export { POST } from "@/app/api/auth/forgot-password/route";
