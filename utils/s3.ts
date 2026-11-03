import { S3Client } from "@aws-sdk/client-s3";

/** Thrown when a required setting is missing in production; the message names the variable. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const REQUIRED_R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"] as const;

/**
 * Checks the R2 settings once, at first use. In production a missing value
 * is a deployment mistake and must fail loudly instead of producing uploads
 * that go nowhere; in development it only warns so the rest of the app runs.
 */
function assertStorageConfigured(): void {
  const missing = REQUIRED_R2_VARS.filter((name) => !process.env[name]?.trim());
  if (missing.length === 0) return;
  const message = `Storage is not configured: set ${missing.join(", ")} (see .env.example).`;
  if (process.env.NODE_ENV === "production") throw new ConfigError(message);
  console.warn(`[storage] ${message}`);
}

let client: S3Client | null = null;

/** The R2 client, created on first use after the configuration check. */
export function getR2Client(): S3Client {
  if (client) return client;
  assertStorageConfigured();
  const accountId = process.env.R2_ACCOUNT_ID || "";
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
    forcePathStyle: true,
  });
  return client;
}

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
/** Bucket for objects served only through /api/files (no public access). Falls back to the main bucket. */
export const R2_PRIVATE_BUCKET_NAME = process.env.R2_PRIVATE_BUCKET_NAME || R2_BUCKET_NAME;
