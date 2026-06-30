import type { Occupation } from "@prisma/client";
import { CountryFlag } from "./CountryFlag";
import {
  getProfileCountryOrDefault,
  parseStoredProfileWhatsApp,
  formatProfileDialCode,
} from "@/lib/countries";
import { occupationLabel, formatDateOfBirthDisplay } from "@/lib/profile";

type ProfileDetailsCardProps = {
  name: string | null;
  email: string;
  fatherName: string | null;
  dateOfBirth: Date | null;
  occupation: Occupation | null;
  address: string | null;
  whatsapp: string | null;
  image: string | null;
  onEdit: () => void;
};

type DetailRowProps = {
  label: string;
  value: React.ReactNode;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/50 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted sm:w-40 shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground break-words">
        {value || <span className="text-muted font-normal italic">Not provided</span>}
      </span>
    </div>
  );
}

export function ProfileDetailsCard({
  name,
  email,
  fatherName,
  dateOfBirth,
  occupation,
  address,
  whatsapp,
  image,
  onEdit,
}: ProfileDetailsCardProps) {
  const parsedWhatsApp = parseStoredProfileWhatsApp(whatsapp);
  const selectedCountry = getProfileCountryOrDefault(parsedWhatsApp.countryCode);

  const formattedWhatsApp = whatsapp ? (
    <span className="inline-flex items-center gap-2">
      <CountryFlag code={selectedCountry.code} size={20} />
      <span>
        {formatProfileDialCode(selectedCountry.dialCode)} {parsedWhatsApp.localNumber}
      </span>
    </span>
  ) : null;

  return (
    <div className="card-elevated w-full space-y-8 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-foreground">Registration details</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            These are your official details used for course enrollment.
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors cursor-pointer shrink-0 self-start"
        >
          Update Profile
        </button>
      </div>

      <div className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-1">
            Personal Information
          </h3>
          <div className="space-y-3">
            <DetailRow label="Photo" value={image ? <img src={image} alt="Profile photo" className="w-16 h-16 rounded-full object-cover border border-border" /> : null} />
            <DetailRow label="Full name" value={name} />
            <DetailRow label="Father's name" value={fatherName} />
            <DetailRow label="Date of birth" value={formatDateOfBirthDisplay(dateOfBirth)} />
            <DetailRow label="Occupation" value={occupation ? occupationLabel(occupation) : null} />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-1">
            Contact & Account
          </h3>
          <div className="space-y-3">
            <DetailRow label="WhatsApp number" value={formattedWhatsApp} />
            <DetailRow label="Address" value={address} />
            <DetailRow label="Email ID" value={email} />
          </div>
        </section>
      </div>
    </div>
  );
}
