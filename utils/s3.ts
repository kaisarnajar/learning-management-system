import { S3Client } from "@aws-sdk/client-s3";

/** Thrown when a required setting is missing in production; the message names the variable. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** A production deployment, where a storage misconfiguration must fail instead of warn. */
function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
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
  if (isProductionRuntime()) throw new ConfigError(message);
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
    // Without this the SDK adds a CRC32 of the (empty) request body to
    // presigned PUT URLs, and R2 then refuses the browser's upload.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return client;
}

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

let warnedPrivateFallback = false;

/**
 * The bucket for objects served only through /api/files: payment screenshots,
 * course attachments, receipts and certificates. It must have no public
 * access, so in production a missing R2_PRIVATE_BUCKET_NAME, or one equal to
 * R2_BUCKET_NAME, throws at first use instead of quietly putting private files
 * in the public bucket. Outside production it falls back to the main bucket
 * (with a warning) so development and tests run without a second bucket.
 */
export function getPrivateBucketName(): string {
  const privateBucket = process.env.R2_PRIVATE_BUCKET_NAME?.trim() ?? "";
  const publicBucket = process.env.R2_BUCKET_NAME?.trim() ?? "";
  if (privateBucket && privateBucket !== publicBucket) return privateBucket;
  const message = privateBucket
    ? "R2_PRIVATE_BUCKET_NAME must differ from R2_BUCKET_NAME: private files would be publicly readable (see .env.example)."
    : "R2_PRIVATE_BUCKET_NAME is not set: private files would go to the public bucket (see .env.example).";
  if (isProductionRuntime()) throw new ConfigError(message);
  if (!warnedPrivateFallback) {
    warnedPrivateFallback = true;
    console.warn(`[storage] ${message} Using R2_BUCKET_NAME outside production.`);
  }
  return privateBucket || publicBucket;
}
