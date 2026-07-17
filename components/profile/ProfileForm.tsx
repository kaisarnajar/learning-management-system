"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";
import Image from "next/image";
import type { Occupation, Gender } from "@prisma/client";
import type { ReactNode } from "react";
import { useActionState, useMemo, useState } from "react";
import { updateProfile, type ProfileUpdateState } from "@/app/profile/actions";
import { CountryFlag } from "@/components/profile/CountryFlag";
import { ProfileCountrySelect } from "@/components/profile/ProfileCountrySelect";
import {
  DEFAULT_PROFILE_COUNTRY_CODE,
  formatProfileDialCode,
  getProfileCountryOrDefault,
  parseStoredProfileWhatsApp,
  type ProfileCountryCode,
} from "@/services/countries";
import { inputClassName, labelClassName } from "@/utils/form";
import { OCCUPATION_OPTIONS } from "@/services/profile";
import { profileUpdateSchema } from "@/utils/validations";

type ProfileFormProps = {
  name: string | null;
  email: string;
  fatherName: string | null;
  dateOfBirth: string;
  occupation: Occupation | null;
  address: string | null;
  whatsapp: string | null;
  image: string | null;
  gender: Gender | null;
  onCancel?: () => void;
};

type ProfileFormValues = {
  name: string;
  fatherName: string;
  dateOfBirth: string;
  occupation: Occupation | "";
  address: string;
  country: ProfileCountryCode;
  whatsapp: string;
  gender: Gender | "";
};

type FormField = keyof ProfileFormValues;

const FORM_FIELDS: FormField[] = [
  "name",
  "fatherName",
  "dateOfBirth",
  "occupation",
  "address",
  "country",
  "whatsapp",
  "gender",
];

const initialState: ProfileUpdateState = {};

const errorTextClassName = "mt-1 text-sm text-destructive-text";

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function fieldInputClass(hasError: boolean) {
  return hasError
    ? `${inputClassName} border-red-500 focus:border-red-500 focus:ring-red-500`
    : inputClassName;
}

function getFieldError(field: FormField, values: ProfileFormValues): string | undefined {
  const result = profileUpdateSchema.safeParse(values);
  if (result.success) {
    return undefined;
  }
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

export function ProfileForm({
  name,
  email,
  fatherName,
  dateOfBirth,
  occupation,
  address,
  whatsapp,
  image,
  gender,
  onCancel,
}: ProfileFormProps) {
  const parsedWhatsApp = parseStoredProfileWhatsApp(whatsapp);
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  
  const defaultPreview = image || (gender === "FEMALE" ? "/assets/female_icon.jpeg" : gender === "MALE" ? "/assets/male_icon.png" : null);
  const [imagePreview, setImagePreview] = useState<string | null>(defaultPreview);
  
  const [values, setValues] = useState<ProfileFormValues>({
    name: name ?? "",
    fatherName: fatherName ?? "",
    dateOfBirth,
    occupation: occupation ?? "",
    address: address ?? "",
    country: parsedWhatsApp.countryCode ?? DEFAULT_PROFILE_COUNTRY_CODE,
    whatsapp: parsedWhatsApp.localNumber,
    gender: gender ?? "",
  });
  const [touched, setTouched] = useState<Partial<Record<FormField, boolean>>>({});

  const selectedCountry = getProfileCountryOrDefault(values.country);

  const errors = useMemo(() => {
    const next: Partial<Record<FormField, string>> = {};
    for (const field of FORM_FIELDS) {
      const message = getFieldError(field, values);
      if (message) {
        next[field] = message;
      }
    }
    return next;
  }, [values]);

  const isValid = useMemo(() => profileUpdateSchema.safeParse(values).success, [values]);

  function updateField<K extends FormField>(field: K, value: ProfileFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function updateCountry(countryCode: ProfileCountryCode) {
    const country = getProfileCountryOrDefault(countryCode);
    setValues((prev) => ({
      ...prev,
      country: countryCode,
      whatsapp: prev.whatsapp.slice(0, country.localNumberMaxLength),
    }));
  }

  function markTouched(field: FormField) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function showError(field: FormField) {
    return Boolean(touched[field] && errors[field]);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  }

  return (
    <form action={formAction} encType="multipart/form-data" className="card-elevated w-full space-y-8 p-6 sm:p-8">
      <div>
        <h2 className="font-serif text-xl font-semibold text-foreground">Registration details</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Keep your information up to date for course enrollment. Email is used to sign in and cannot
          be changed here.
        </p>
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-200 bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {state.error}
        </p>
      )}

      <FormSection title="Personal information">
        <div className="mb-4">
          <label htmlFor="image" className={labelClassName}>
            Profile Photo {values.gender === "FEMALE" ? "(Disabled for Female)" : values.gender === "" ? "(Select gender first)" : "(Optional)"}
          </label>
          <div className="mt-2 flex items-center gap-4">
            {imagePreview ? (
              <Image src={imagePreview} alt="Profile preview" width={64} height={64} className="w-16 h-16 rounded-full object-cover border border-border" unoptimized />
            ) : (
              <div className="w-16 h-16 rounded-full bg-surface-muted border border-border flex items-center justify-center">
                <span className="text-xs text-muted">No photo</span>
              </div>
            )}
            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
              disabled={values.gender !== "MALE"}
              className={`text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer ${
                values.gender !== "MALE" ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelClassName}>
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={() => markTouched("name")}
              aria-invalid={showError("name") || undefined}
              aria-describedby={showError("name") ? "name-error" : undefined}
              className={fieldInputClass(showError("name"))}
              autoComplete="name"
            />
            {showError("name") && (
              <p id="name-error" className={errorTextClassName} role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="fatherName" className={labelClassName}>
              Father&apos;s name
            </label>
            <input
              id="fatherName"
              name="fatherName"
              type="text"
              required
              value={values.fatherName}
              onChange={(e) => updateField("fatherName", e.target.value)}
              onBlur={() => markTouched("fatherName")}
              aria-invalid={showError("fatherName") || undefined}
              aria-describedby={showError("fatherName") ? "fatherName-error" : undefined}
              className={fieldInputClass(showError("fatherName"))}
              autoComplete="off"
            />
            {showError("fatherName") && (
              <p id="fatherName-error" className={errorTextClassName} role="alert">
                {errors.fatherName}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gender" className={labelClassName}>
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              required
              value={values.gender}
              onChange={(e) => {
                const newGender = e.target.value as "MALE" | "FEMALE";
                updateField("gender", newGender);
                markTouched("gender");
                if (newGender === "FEMALE") {
                  setImagePreview("/assets/female_icon.jpeg");
                } else if (newGender === "MALE") {
                  if (imagePreview === "/assets/female_icon.jpeg" || !imagePreview) {
                    setImagePreview("/assets/male_icon.png");
                  }
                }
              }}
              onBlur={() => markTouched("gender")}
              aria-invalid={showError("gender") || undefined}
              aria-describedby={showError("gender") ? "gender-error" : undefined}
              className={fieldInputClass(showError("gender"))}
            >
              <option value="" disabled>
                Select…
              </option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            {showError("gender") && (
              <p id="gender-error" className={errorTextClassName} role="alert">
                {errors.gender}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dateOfBirth" className={labelClassName}>
              Date of birth
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              required
              value={values.dateOfBirth}
              onChange={(e) => {
                updateField("dateOfBirth", e.target.value);
                markTouched("dateOfBirth");
              }}
              onBlur={() => markTouched("dateOfBirth")}
              aria-invalid={showError("dateOfBirth") || undefined}
              aria-describedby={showError("dateOfBirth") ? "dateOfBirth-error" : undefined}
              className={fieldInputClass(showError("dateOfBirth"))}
            />
            {showError("dateOfBirth") && (
              <p id="dateOfBirth-error" className={errorTextClassName} role="alert">
                {errors.dateOfBirth}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="occupation" className={labelClassName}>
              Occupation
            </label>
            <select
              id="occupation"
              name="occupation"
              required
              value={values.occupation}
              onChange={(e) => {
                updateField("occupation", e.target.value as ProfileFormValues["occupation"]);
                markTouched("occupation");
              }}
              onBlur={() => markTouched("occupation")}
              aria-invalid={showError("occupation") || undefined}
              aria-describedby={showError("occupation") ? "occupation-error" : undefined}
              className={fieldInputClass(showError("occupation"))}
            >
              <option value="" disabled>
                Select…
              </option>
              {OCCUPATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {showError("occupation") && (
              <p id="occupation-error" className={errorTextClassName} role="alert">
                {errors.occupation}
              </p>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection title="Contact information">
        <div>
          <label htmlFor="address" className={labelClassName}>
            Address
          </label>
          <textarea
            id="address"
            name="address"
            required
            rows={3}
            value={values.address}
            onChange={(e) => updateField("address", e.target.value)}
            onBlur={() => markTouched("address")}
            aria-invalid={showError("address") || undefined}
            aria-describedby={showError("address") ? "address-error" : undefined}
            className={fieldInputClass(showError("address"))}
            autoComplete="street-address"
          />
          {showError("address") && (
            <p id="address-error" className={errorTextClassName} role="alert">
              {errors.address}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="country" className={labelClassName}>
              Country
            </label>
            <ProfileCountrySelect
              id="country"
              name="country"
              required
              value={values.country}
              onChange={(code) => {
                updateCountry(code);
                markTouched("country");
              }}
              onBlur={() => markTouched("country")}
              hasError={showError("country")}
              errorId="country-error"
            />
            {showError("country") && (
              <p id="country-error" className={errorTextClassName} role="alert">
                {errors.country}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="whatsapp" className={labelClassName}>
              WhatsApp number
            </label>
            <div className="mt-1 flex">
              <div
                className={`flex shrink-0 items-center gap-1.5 rounded-l-md border border-r-0 px-3 py-2 text-sm ${
                  showError("whatsapp") ? "border-red-500" : "border-border"
                } bg-background`}
                aria-hidden="true"
              >
                <CountryFlag code={selectedCountry.code} size={20} />
                <span className="font-medium text-foreground">
                  {formatProfileDialCode(selectedCountry.dialCode)}
                </span>
              </div>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                required
                inputMode="numeric"
                maxLength={selectedCountry.localNumberMaxLength}
                value={values.whatsapp}
                onChange={(e) =>
                  updateField(
                    "whatsapp",
                    e.target.value.replace(/\D/g, "").slice(0, selectedCountry.localNumberMaxLength),
                  )
                }
                onBlur={() => markTouched("whatsapp")}
                aria-invalid={showError("whatsapp") || undefined}
                aria-describedby={showError("whatsapp") ? "whatsapp-error" : undefined}
                className={`${fieldInputClass(showError("whatsapp"))} rounded-l-none`}
                autoComplete="tel"
                placeholder="e.g. 9876543210"
              />
            </div>
            {showError("whatsapp") && (
              <p id="whatsapp-error" className={errorTextClassName} role="alert">
                {errors.whatsapp}
              </p>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection title="Account" description="Your sign-in email is managed by the academy.">
        <div className="max-w-md">
          <label htmlFor="email" className={labelClassName}>
            Email ID
          </label>
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            className={`${inputClassName} cursor-not-allowed bg-background text-muted`}
          />
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="min-h-11 rounded-full border border-border px-8 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-muted transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        )}
        <SubmitButton
          type="submit"
          disabled={!isValid || pending}
          className="min-h-11 rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save profile"}
        </SubmitButton>
      </div>
    </form>
  );
}
