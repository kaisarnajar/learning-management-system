import type { Occupation } from "@prisma/client";
import { getInitialsFromName } from "@/lib/student-reviews";
import { occupationLabel, formatDateOfBirthDisplay } from "@/lib/profile";
import {
  getProfileCountryOrDefault,
  parseStoredProfileWhatsApp,
  formatProfileDialCode,
} from "@/lib/countries";
import { Mail, Phone, MapPin, Calendar, Briefcase, User } from "lucide-react";

type ProfileDetailsCardProps = {
  name: string | null;
  email: string;
  fatherName: string | null;
  dateOfBirth: Date | null;
  occupation: Occupation | null;
  address: string | null;
  whatsapp: string | null;
  image: string | null;
  registrationNumber?: string | null;
  onEdit: () => void;
};

export function ProfileDetailsCard({
  name,
  email,
  fatherName,
  dateOfBirth,
  occupation,
  address,
  whatsapp,
  image,
  registrationNumber,
  onEdit,
}: ProfileDetailsCardProps) {
  const displayName = name?.trim() || "Student";
  const initials = getInitialsFromName(displayName);

  const parsedWhatsApp = parseStoredProfileWhatsApp(whatsapp);
  const selectedCountry = getProfileCountryOrDefault(parsedWhatsApp.countryCode);

  const formattedWhatsApp = whatsapp
    ? `${formatProfileDialCode(selectedCountry.dialCode)} ${parsedWhatsApp.localNumber}`
    : "Not provided";

  return (
    <div className="w-full space-y-6">
      {/* Top User Card */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="shrink-0">
            {image ? (
              <img
                src={image}
                alt="Profile"
                className="h-28 w-28 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div
                className="flex h-28 w-28 items-center justify-center rounded-xl bg-primary text-3xl font-bold text-white shadow-sm"
                aria-hidden
              >
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl font-bold text-primary">{displayName}</h1>
              {/* <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                Premium Member
              </span> */}
            </div>
            {registrationNumber && (
              <p className="text-sm font-medium text-muted">
                Student ID: <span className="text-foreground">{registrationNumber}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl font-bold text-primary">Personal Information</h2>
          </div>
          <button
            onClick={onEdit}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Edit Details
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Email */}
          <div className="flex items-start gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="mt-0.5 rounded-lg border border-border p-2 text-muted">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Email Address</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground break-all">{email}</p>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="flex items-start gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="mt-0.5 rounded-lg border border-border p-2 text-muted">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Phone Number</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{formattedWhatsApp}</p>
            </div>
          </div>

          {/* Father's Name */}
          <div className="flex items-start gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="mt-0.5 rounded-lg border border-border p-2 text-muted">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Father&apos;s Name</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{fatherName || "Not provided"}</p>
            </div>
          </div>

          {/* DOB */}
          <div className="flex items-start gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="mt-0.5 rounded-lg border border-border p-2 text-muted">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Date of Birth</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {formatDateOfBirthDisplay(dateOfBirth) || "Not provided"}
              </p>
            </div>
          </div>

          {/* Occupation */}
          <div className="flex items-start gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="mt-0.5 rounded-lg border border-border p-2 text-muted">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Occupation</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {occupation ? occupationLabel(occupation) : "Not provided"}
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="mt-0.5 rounded-lg border border-border p-2 text-muted">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Address</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{address || "Not provided"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
