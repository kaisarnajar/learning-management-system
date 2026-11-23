import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { deleteOwnAccount } from "@/services/account-deletion";
import { buildStoredProfileWhatsApp, parseStoredProfileWhatsApp } from "@/services/countries";
import { isProfileComplete } from "@/services/profile";
import { applyStudentProfileChanges, type StudentProfileChanges } from "@/services/profile-update";
import { prisma } from "@/utils/prisma";
import { apiProfileUpdateSchema } from "@/utils/validations";
import { apiError, apiServerError, readJson } from "@/utils/api-response";

const profileSelect = {
  id: true,
  name: true,
  email: true,
  fatherName: true,
  dateOfBirth: true,
  occupation: true,
  address: true,
  whatsapp: true,
  gender: true,
  registrationNumber: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  password: true,
} as const;

type ProfileRow = NonNullable<Awaited<ReturnType<typeof loadProfile>>>;

function loadProfile(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
}

/**
 * The profile as the app shows it. `whatsappCountry` / `whatsappLocal` are the
 * stored number split the way the web form shows it; `profileComplete` says
 * whether enrolment is possible; `hasPassword` tells the app whether to offer
 * "change password" (Google-only accounts have none).
 */
function toProfileResponse(row: ProfileRow, role: string) {
  const { password, ...profile } = row;
  const whatsapp = profile.whatsapp ? parseStoredProfileWhatsApp(profile.whatsapp) : null;
  return {
    ...profile,
    role,
    whatsappCountry: whatsapp?.countryCode ?? null,
    whatsappLocal: whatsapp?.localNumber ?? null,
    profileComplete: isProfileComplete(profile),
    hasPassword: Boolean(password),
  };
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const row = await loadProfile(user.id);
    if (!row) return apiError("User profile not found.", 404);
    return NextResponse.json({ success: true, user: toProfileResponse(row, user.role) });
  } catch (error) {
    return apiServerError("api/v1/auth/me GET", error, "Failed to fetch user profile.");
  }
}

/**
 * Updates any subset of the profile fields. Completing the profile allocates
 * the registration number, exactly as the web form does. Photos are uploaded
 * through POST /api/v1/auth/me/photo; a female profile always uses the
 * default avatar (same rule as the website).
 */
export async function PUT(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const parsed = apiProfileUpdateSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid profile data.", 400);
    }

    const { country, whatsapp, dateOfBirth, image, ...rest } = parsed.data;
    const changes: StudentProfileChanges = { ...rest };
    if (dateOfBirth !== undefined) changes.dateOfBirth = new Date(dateOfBirth);
    if (whatsapp !== undefined) {
      changes.whatsapp = country ? buildStoredProfileWhatsApp(country, whatsapp) : whatsapp.replace(/\D/g, "");
    }
    if (image !== undefined) changes.image = image;
    if (rest.gender === "FEMALE") changes.image = "/assets/female_icon.png";

    await applyStudentProfileChanges(user.id, changes);
    const row = await loadProfile(user.id);
    return NextResponse.json({ success: true, user: toProfileResponse(row!, user.role) });
  } catch (error) {
    return apiServerError("api/v1/auth/me PUT", error, "Failed to update profile.");
  }
}

/**
 * Deletes the caller's account: `{ password }` for password accounts, or
 * `{ confirm: "DELETE" }` for Google-only ones. Receipts and fee history are
 * kept anonymised; every session and token ends immediately.
 */
export async function DELETE(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = (await readJson(request)) ?? {};
    const result = await deleteOwnAccount(user.id, { password: body.password, confirm: body.confirm });
    if (!result.ok) return apiError(result.error, result.status);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiServerError("api/v1/auth/me DELETE", error, "Failed to delete the account.");
  }
}
