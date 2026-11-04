import { vi } from "vitest";

// Several service modules import the Prisma client at load time. Unit tests
// never touch the database, so replace it with an empty stand-in; tests that
// need specific queries override the methods they use.
vi.mock("@/utils/prisma", () => ({ prisma: {} }));
