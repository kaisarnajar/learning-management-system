import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { DELETE as removePhoto, POST as uploadPhoto } from "@/app/api/v1/auth/me/photo/route";
import { PUT as updateMe } from "@/app/api/v1/auth/me/route";
import { updateProfile } from "@/app/profile/actions";
import { updateStudentUserForm } from "@/app/admin/students/actions";
import { deleteOwnAccount } from "@/services/account-deletion";
import { createUser, resetDb, runAction, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, signedInStudent } from "../helpers/api";

// Every R2 call goes to this stand-in, so a test can see exactly what would
// have been deleted from the bucket.
const r2 = vi.hoisted(() => ({ send: vi.fn<(command: unknown) => Promise<object>>(async () => ({})) }));
vi.mock("@/utils/s3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/s3")>()),
  getR2Client: () => r2,
  R2_PUBLIC_URL: "https://files.example.org",
  R2_BUCKET_NAME: "public-bucket",
}));

const STORAGE = "https://files.example.org";
const upload = (userId: string) => `${STORAGE}/uploads/profiles/${userId}-1732400000000-k3j9x.jpg`;
const deletedKeys = () =>
  r2.send.mock.calls
    .map(([command]) => command)
    .filter((command): command is DeleteObjectCommand => command instanceof DeleteObjectCommand)
    .map((command) => command.input.Key);

// A 1x1 PNG, so the upload passes the content sniffing.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

describe.skipIf(SKIP_WITHOUT_DB)("profile photos: only the owner's own upload is replaced or deleted (H4)", () => {
  const previousR2 = process.env.R2_PUBLIC_URL;
  beforeAll(() => {
    // The profile image validators read the storage host at call time.
    process.env.R2_PUBLIC_URL = STORAGE;
  });
  afterAll(() => {
    process.env.R2_PUBLIC_URL = previousR2;
  });
  beforeEach(async () => {
    await resetDb();
    r2.send.mockClear();
  });

  /** Student A whose profile row was made to point at student B's upload. */
  async function hijackedProfile() {
    const victim = await createUser();
    await prisma.user.update({ where: { id: victim.id }, data: { image: upload(victim.id) } });
    const attacker = await signedInStudent({ gender: "MALE" });
    await prisma.user.update({ where: { id: attacker.user.id }, data: { image: upload(victim.id) } });
    return { victim, attacker };
  }

  it("the API accepts the profile's current image unchanged, so clients can echo it back", async () => {
    const student = await signedInStudent();
    await prisma.user.update({ where: { id: student.user.id }, data: { image: upload(student.user.id) } });

    const response = await updateMe(
      apiRequest("/api/v1/auth/me", { method: "PUT", headers: student.headers, json: { name: "Same Photo", image: upload(student.user.id) } }),
    );
    expect(response.status).toBe(200);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: student.user.id } })).toMatchObject({ name: "Same Photo", image: upload(student.user.id) });
  });

  it("uploading a new photo over a foreign URL leaves the other user's object alone", async () => {
    const { attacker } = await hijackedProfile();
    const form = new FormData();
    form.set("image", new File([PNG], "me.png", { type: "image/png" }));

    const response = await uploadPhoto(apiRequest("/api/v1/auth/me/photo", { method: "POST", headers: attacker.headers, body: form }));
    expect(response.status).toBe(200);
    expect(deletedKeys()).toEqual([]);
  });

  it("removing the photo over a foreign URL leaves the other user's object alone", async () => {
    const { attacker } = await hijackedProfile();

    expect((await removePhoto(apiRequest("/api/v1/auth/me/photo", { method: "DELETE", headers: attacker.headers }))).status).toBe(200);
    expect(deletedKeys()).toEqual([]);
  });

  it("removing one's own photo still deletes it", async () => {
    const student = await signedInStudent();
    await prisma.user.update({ where: { id: student.user.id }, data: { image: upload(student.user.id) } });

    expect((await removePhoto(apiRequest("/api/v1/auth/me/photo", { method: "DELETE", headers: student.headers }))).status).toBe(200);
    expect(deletedKeys()).toEqual([`uploads/profiles/${student.user.id}-1732400000000-k3j9x.jpg`]);
  });

  it("the website profile form leaves a foreign upload alone", async () => {
    const { attacker } = await hijackedProfile();
    vi.mocked(auth).mockResolvedValue(sessionFor(attacker.user, "STUDENT") as never);
    const form = new FormData();
    for (const [name, value] of Object.entries({
      name: "Attacker",
      fatherName: "Imran Khan",
      dateOfBirth: "2000-01-15",
      occupation: "STUDENT",
      address: "12 Main Street, Srinagar",
      country: "IN",
      whatsapp: "9876543210",
      gender: "FEMALE",
    })) form.set(name, value);

    expect((await runAction(() => updateProfile({}, form))).redirectedTo).toBe("/profile");
    expect(deletedKeys()).toEqual([]);
  });

  it("deleting one's account leaves a foreign upload alone", async () => {
    const { attacker } = await hijackedProfile();

    expect(await deleteOwnAccount(attacker.user.id, { confirm: "DELETE" })).toMatchObject({ ok: true });
    expect(deletedKeys()).toEqual([]);
  });

  it("an admin switching a student to the female avatar deletes only that student's own upload", async () => {
    const { attacker } = await hijackedProfile();
    const admin = await createUser({ email: process.env.ADMIN_EMAIL });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
    const form = new FormData();
    for (const [name, value] of Object.entries({
      name: "Attacker",
      fatherName: "Imran Khan",
      dateOfBirth: "2000-01-15",
      occupation: "STUDENT",
      address: "12 Main Street, Srinagar",
      whatsapp: "919876543210",
      gender: "FEMALE",
      confirmReplacePhoto: "on",
    })) form.set(name, value);

    await runAction(() => updateStudentUserForm(attacker.user.id, form));
    expect((await prisma.user.findUniqueOrThrow({ where: { id: attacker.user.id } })).image).toBe("/assets/female_icon.png");
    expect(deletedKeys()).toEqual([]);
  });
});
