import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Demo credentials are generated per seed run and written to a local,
 * git-ignored file instead of being hardcoded in the repository or printed
 * to build logs.
 */
export type DemoCredentials = {
  adminPassword: string;
  teacherPassword: string;
  studentPassword: string;
};

export const DEMO_CREDENTIALS_FILE = ".seed-credentials.local.json";

export function generateDemoPassword(): string {
  // 12 bytes -> 16 url-safe characters; satisfies the 8-char minimum.
  return randomBytes(12).toString("base64url");
}

export function generateDemoCredentials(): DemoCredentials {
  return {
    adminPassword: generateDemoPassword(),
    teacherPassword: generateDemoPassword(),
    studentPassword: generateDemoPassword(),
  };
}

export function writeDemoCredentialsFile(
  credentials: DemoCredentials,
  accounts: { admins: string[]; teachers: string[]; students: string[] },
): string {
  const file = path.join(process.cwd(), DEMO_CREDENTIALS_FILE);
  fs.writeFileSync(
    file,
    JSON.stringify({ generatedAt: new Date().toISOString(), ...credentials, accounts }, null, 2),
    { mode: 0o600 },
  );
  return file;
}
