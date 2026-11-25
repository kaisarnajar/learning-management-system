/**
 * Prints, or applies, the R2 CORS rule that lets the website PUT direct
 * uploads (services/direct-upload.ts) to the bucket holding staging/ objects:
 * R2_PRIVATE_BUCKET_NAME, or R2_BUCKET_NAME when no separate bucket is set,
 * as the app does. Until the rule exists, browsers cannot
 * upload directly and files up to 4 MB fall back to the form upload.
 *
 * Usage:
 *   npx tsx scripts/configure-r2-cors.ts                         # dry run: print the rule
 *   npx tsx scripts/configure-r2-cors.ts --apply                 # apply it (replaces the bucket's CORS rules)
 *   npx tsx scripts/configure-r2-cors.ts --origin=https://example.org [--origin=…] [--bucket=name] [--apply]
 *
 * Origins default to AUTH_URL and NEXT_PUBLIC_APP_URL. Applying replaces any
 * CORS configuration the bucket already has; the current one is saved to
 * scripts/out/ first.
 */
import { GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";
import { corsOrigins, directUploadCorsConfiguration } from "./lib/r2-cors";
import { getPrivateBucketName, getR2Client } from "../utils/s3";

async function main() {
  const apply = isApplyMode();
  printMode("configure-r2-cors", apply);

  const origins = corsOrigins(process.argv, process.env);
  if (origins.length === 0) {
    console.error("No origin: set AUTH_URL (or NEXT_PUBLIC_APP_URL), or pass --origin=https://your-site.");
    process.exitCode = 1;
    return;
  }
  const bucketArg = process.argv.find((arg) => arg.startsWith("--bucket="));
  const bucket = bucketArg ? bucketArg.slice("--bucket=".length) : getPrivateBucketName();
  if (!bucket) {
    console.error("No bucket: set R2_BUCKET_NAME (or R2_PRIVATE_BUCKET_NAME), or pass --bucket=name.");
    process.exitCode = 1;
    return;
  }

  const configuration = directUploadCorsConfiguration(origins);
  console.log(`Bucket: ${bucket}`);
  console.log(JSON.stringify(configuration, null, 2));
  if (!apply) {
    console.log("Dry run: nothing was changed. Pass --apply to set this rule.");
    return;
  }

  const client = getR2Client();
  const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket })).catch((error: { name?: string }) => {
    if (error?.name === "NoSuchCORSConfiguration") return { CORSRules: [] };
    throw error;
  });
  console.log(`Saved the current rules to ${writeSnapshot("r2-cors", current.CORSRules ?? [])}`);
  await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: configuration }));
  console.log("Applied.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
