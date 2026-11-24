import { beforeEach, describe, expect, it, vi } from "vitest";
import { hash } from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/utils/prisma";
import { DELETE as deleteMe, GET as me, PUT as updateMe } from "@/app/api/v1/auth/me/route";
import { DELETE as removePhoto, POST as uploadPhoto } from "@/app/api/v1/auth/me/photo/route";
import { POST as changePassword } from "@/app/api/v1/auth/change-password/route";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { createCourse, createEnrollment, createUser, resetDb, setPaymentSettings, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, bearer, jsonOf, signedInStudent } from "../helpers/api";

// Object storage is not available under test: uploads get a fake public URL.
vi.mock("@/services/uploads", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/uploads")>()),
  validatePendingUpload: (_kind: string, file: File | null) => (file && file.type.startsWith("image/") ? {} : { error: "Upload a JPEG, PNG or WebP image." }),
  saveUpload: vi.fn(async (_kind: string, userId: string) => `https://files.example.org/uploads/profiles/${userId}-${Math.random().toString(36).slice(2, 8)}.png`),
  deleteOwnedProfileImage: vi.fn(async () => undefined),
}));

const FULL_PROFILE = {
  name: "Bilal Ahmad",
  fatherName: "Ahmad Khan",
  dateOfBirth: "2001-05-20",
  occupation: "STUDENT",
  address: "12 Main Street, Srinagar",
  country: "IN",
  whatsapp: "9876543210",
  gender: "MALE",
};

async function newStudentWithPassword(password = "first-password-1") {
  const user = await createUser({ password: await hash(password, 4), fatherName: null, dateOfBirth: null, occupation: null, address: null, whatsapp: null, gender: null });
  return { user, password };
}

describe.skipIf(SKIP_WITHOUT_DB)("mobile API: account", () => {
  beforeEach(async () => {
    await resetDb();
    await setPaymentSettings();
  });

  describe("profile", () => {
    it("completing the profile allocates a registration number, as on the website", async () => {
      const student = await signedInStudent({ fatherName: null, dateOfBirth: null, occupation: null, address: null, whatsapp: null, gender: null, registrationNumber: null });

      const before = await jsonOf(await me(apiRequest("/api/v1/auth/me", { headers: student.headers })));
      expect(before.user).toMatchObject({ profileComplete: false, registrationNumber: null });

      const response = await updateMe(apiRequest("/api/v1/auth/me", { method: "PUT", headers: student.headers, json: FULL_PROFILE }));
      expect(response.status).toBe(200);
      const { user } = await jsonOf(response);
      expect(user).toMatchObject({ profileComplete: true, whatsapp: "919876543210", whatsappCountry: "IN", whatsappLocal: "9876543210" });
      expect(user.registrationNumber).toMatch(/\d{4}-\d+$/);
      expect(user).not.toHaveProperty("password");
    });

    it("keeps partial updates working and the registration number unchanged", async () => {
      const student = await signedInStudent({ registrationNumber: "DQA2026-00007" });
      const response = await updateMe(apiRequest("/api/v1/auth/me", { method: "PUT", headers: student.headers, json: { address: "99 New Road" } }));
      expect((await jsonOf(response)).user).toMatchObject({ address: "99 New Road", registrationNumber: "DQA2026-00007" });
    });

    it("validates the WhatsApp number against the chosen country", async () => {
      const student = await signedInStudent();
      const bad = await updateMe(apiRequest("/api/v1/auth/me", { method: "PUT", headers: student.headers, json: { country: "IN", whatsapp: "12345" } }));
      expect(bad.status).toBe(400);
      expect((await jsonOf(bad)).error).toContain("10 digits");
    });

    it("uploads and removes a photo; female profiles keep the avatar", async () => {
      const male = await signedInStudent({ gender: "MALE" });
      const form = new FormData();
      form.set("image", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "me.png", { type: "image/png" }));
      const uploaded = await uploadPhoto(apiRequest("/api/v1/auth/me/photo", { method: "POST", headers: male.headers, body: form }));
      expect(uploaded.status).toBe(200);
      const { image } = await jsonOf(uploaded);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: male.user.id } })).image).toBe(image);

      const removed = await jsonOf(await removePhoto(apiRequest("/api/v1/auth/me/photo", { method: "DELETE", headers: male.headers })));
      expect(removed.image).toBe("/assets/male_icon.png");

      const female = await signedInStudent({ gender: "FEMALE" });
      const refused = await uploadPhoto(apiRequest("/api/v1/auth/me/photo", { method: "POST", headers: female.headers, body: form }));
      expect(refused.status).toBe(400);
    });

    it("answers 413 for an oversize Content-Length without reading the body", async () => {
      const male = await signedInStudent({ gender: "MALE" });
      let pulled = false;
      const body = new ReadableStream({ pull(controller) { pulled = true; controller.close(); } }, { highWaterMark: 0 });
      const request = new NextRequest(new URL("/api/v1/auth/me/photo", "http://localhost:3000"), {
        method: "POST",
        headers: { ...male.headers, "content-type": "multipart/form-data; boundary=x", "content-length": String(50 * 1024 * 1024), "x-forwarded-for": "10.9.9.9" },
        body,
        duplex: "half",
      } as unknown as ConstructorParameters<typeof NextRequest>[1]);

      const response = await uploadPhoto(request);
      expect(response.status).toBe(413);
      expect((await jsonOf(response)).error).toMatch(/2 MB or smaller/);
      expect(pulled).toBe(false);
      expect(request.bodyUsed).toBe(false);
    });
  });

  describe("change password", () => {
    it("changes it, signs out the other app sessions and keeps this one", async () => {
      const { user, password } = await newStudentWithPassword();
      const here = await (await import("@/services/api-auth")).issueApiSession({ id: user.id, email: user.email, role: "USER" });
      const elsewhere = await (await import("@/services/api-auth")).issueApiSession({ id: user.id, email: user.email, role: "USER" });

      const wrong = await changePassword(apiRequest("/x", { method: "POST", headers: bearer(here.accessToken), json: { currentPassword: "nope-nope-1", newPassword: "second-password-2" } }));
      expect(wrong.status).toBe(403);

      const ok = await changePassword(apiRequest("/x", { method: "POST", headers: bearer(here.accessToken), json: { currentPassword: password, newPassword: "second-password-2" } }));
      expect(ok.status).toBe(200);

      expect((await me(apiRequest("/x", { headers: bearer(here.accessToken) }))).status).toBe(200);
      expect((await me(apiRequest("/x", { headers: bearer(elsewhere.accessToken) }))).status).toBe(401);

      const oldLogin = await login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email: user.email, password } }));
      expect(oldLogin.status).toBe(401);
      const newLogin = await login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email: user.email, password: "second-password-2" } }));
      expect(newLogin.status).toBe(200);
    });

    it("removes the account's other push registrations and keeps the calling device's", async () => {
      const { user, password } = await newStudentWithPassword();
      const here = await (await import("@/services/api-auth")).issueApiSession({ id: user.id, email: user.email, role: "USER" });
      await prisma.deviceToken.createMany({ data: [{ userId: user.id, token: "this-phone" }, { userId: user.id, token: "lost-phone" }] });

      const ok = await changePassword(apiRequest("/x", {
        method: "POST",
        headers: bearer(here.accessToken),
        json: { currentPassword: password, newPassword: "second-password-2", deviceToken: "this-phone" },
      }));
      expect(ok.status).toBe(200);

      expect((await prisma.deviceToken.findMany({ where: { userId: user.id }, select: { token: true } })).map((d) => d.token)).toEqual(["this-phone"]);
    });

    it("tells Google-only accounts there is no password to change", async () => {
      const student = await signedInStudent({ password: null });
      const response = await changePassword(apiRequest("/x", { method: "POST", headers: student.headers, json: { currentPassword: "anything", newPassword: "second-password-2" } }));
      expect(response.status).toBe(400);
    });
  });

  describe("delete account", () => {
    it("needs the password, then anonymises the account, keeps the money history and ends every session", async () => {
      const { user, password } = await newStudentWithPassword();
      const session = await (await import("@/services/api-auth")).issueApiSession({ id: user.id, email: user.email, role: "USER" });
      const course = await createCourse();
      await createEnrollment(user.id, course.id);
      await prisma.paymentRecord.create({ data: { userId: user.id, courseId: course.id, amountInrPaise: 34900, paidAt: new Date() } });
      await prisma.deviceToken.create({ data: { userId: user.id, token: "fcm-token-1" } });

      const refused = await deleteMe(apiRequest("/x", { method: "DELETE", headers: bearer(session.accessToken), json: { password: "wrong-password" } }));
      expect(refused.status).toBe(403);

      const ok = await deleteMe(apiRequest("/x", { method: "DELETE", headers: bearer(session.accessToken), json: { password } }));
      expect(ok.status).toBe(200);

      const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(row).toMatchObject({ name: "Deleted user", password: null, address: null, whatsapp: null, email: `deleted+${user.id}@invalid.local` });
      expect(row.deletedAt).not.toBeNull();
      expect(await prisma.paymentRecord.count({ where: { userId: user.id } })).toBe(1);
      expect(await prisma.deviceToken.count({ where: { userId: user.id } })).toBe(0);
      expect((await me(apiRequest("/x", { headers: bearer(session.accessToken) }))).status).toBe(401);
      expect(await prisma.auditLog.count({ where: { entity: "User", entityId: user.id } })).toBe(1);

      // The address can be used to register again.
      expect(await prisma.user.count({ where: { email: user.email } })).toBe(0);
    });

    it("Google-only accounts confirm by typing DELETE", async () => {
      const student = await signedInStudent({ password: null });
      expect((await deleteMe(apiRequest("/x", { method: "DELETE", headers: student.headers, json: {} }))).status).toBe(400);
      expect((await deleteMe(apiRequest("/x", { method: "DELETE", headers: student.headers, json: { confirm: "DELETE" } }))).status).toBe(200);
    });

    it("waits while a fee payment is being verified, and refuses staff accounts", async () => {
      const student = await signedInStudent({ password: null });
      const course = await createCourse();
      await prisma.coursePaymentSubmission.create({
        data: { userId: student.user.id, courseId: course.id, label: "Fee", amountInrPaise: 100, status: "pending_verification", statusEnum: "PENDING_VERIFICATION" },
      });
      const pending = await deleteMe(apiRequest("/x", { method: "DELETE", headers: student.headers, json: { confirm: "DELETE" } }));
      expect(pending.status).toBe(409);

      const admin = await signedInStudent({ email: "admin@example.test", password: null });
      const staff = await deleteMe(apiRequest("/x", { method: "DELETE", headers: admin.headers, json: { confirm: "DELETE" } }));
      expect(staff.status).toBe(403);
    });
  });
});
