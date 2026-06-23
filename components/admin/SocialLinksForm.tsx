"use client";

import { useCallback } from "react";
import {
  type SocialLinksFormValues,
  validateSocialLinksForm,
} from "@/lib/admin-form-validation";
import type { SocialLinksSettingsData } from "@/lib/social-links";
import { formatWhatsAppForDisplay, normalizeWhatsAppNumber } from "@/lib/social-links";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import { useZodForm } from "@/lib/use-zod-form";

type SocialLinksFormProps = {
  settings: SocialLinksSettingsData;
  action: (formData: FormData) => Promise<void>;
};

const SOCIAL_FIELDS: (keyof SocialLinksFormValues)[] = [
  "contactEmail",
  "whatsappNumber",
  "whatsappDefaultMessage",
  "facebookUrl",
  "instagramUrl",
  "youtubeUrl",
];

const WHATSAPP_MAX_DIGITS = 15;

export function SocialLinksForm({ settings, action }: SocialLinksFormProps) {
  const validate = useCallback(
    (values: SocialLinksFormValues) => validateSocialLinksForm(values),
    [],
  );

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      contactEmail: settings.contactEmail,
      whatsappNumber: normalizeWhatsAppNumber(settings.whatsappNumber),
      whatsappDefaultMessage: settings.whatsappDefaultMessage,
      facebookUrl: settings.facebookUrl,
      instagramUrl: settings.instagramUrl,
      youtubeUrl: settings.youtubeUrl,
    },
    fields: SOCIAL_FIELDS,
    validate,
  });

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-4 rounded-lg border border-border bg-background/40 p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground">Contact email</h2>
        <p className="text-sm text-muted">
          Shown in the footer Contact section (homepage #contact) and on About Us → Contact Us.
        </p>
        <div>
          <label htmlFor="contactEmail" className={labelClassName}>
            Academy email
          </label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            required
            value={values.contactEmail}
            onChange={(e) => updateField("contactEmail", e.target.value)}
            onBlur={() => markTouched("contactEmail")}
            aria-invalid={showError("contactEmail") || undefined}
            placeholder="info@darsequranacademy.org"
            className={formFieldInputClass(showError("contactEmail"))}
          />
          {showError("contactEmail") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.contactEmail}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-background/40 p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground">WhatsApp</h2>
        <p className="text-sm text-muted">
          Used for the floating chat button, footer contact, and About page. Enter digits only with
          country code (e.g. 919622966911).
        </p>
        <div>
          <label htmlFor="whatsappNumber" className={labelClassName}>
            WhatsApp number
          </label>
          <input
            id="whatsappNumber"
            name="whatsappNumber"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            value={values.whatsappNumber}
            onChange={(e) =>
              updateField(
                "whatsappNumber",
                e.target.value.replace(/\D/g, "").slice(0, WHATSAPP_MAX_DIGITS),
              )
            }
            onBlur={() => markTouched("whatsappNumber")}
            aria-invalid={showError("whatsappNumber") || undefined}
            placeholder="919622966911"
            className={formFieldInputClass(showError("whatsappNumber"))}
          />
          {values.whatsappNumber && !showError("whatsappNumber") && (
            <p className="mt-1.5 text-xs text-muted">
              Displayed as {formatWhatsAppForDisplay(values.whatsappNumber)}
            </p>
          )}
          {showError("whatsappNumber") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.whatsappNumber}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="whatsappDefaultMessage" className={labelClassName}>
            Default chat message
          </label>
          <textarea
            id="whatsappDefaultMessage"
            name="whatsappDefaultMessage"
            rows={3}
            value={values.whatsappDefaultMessage}
            onChange={(e) => updateField("whatsappDefaultMessage", e.target.value)}
            onBlur={() => markTouched("whatsappDefaultMessage")}
            aria-invalid={showError("whatsappDefaultMessage") || undefined}
            className={formFieldInputClass(showError("whatsappDefaultMessage"))}
          />
          {showError("whatsappDefaultMessage") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.whatsappDefaultMessage}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted">Pre-filled when someone opens WhatsApp from the site.</p>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-background/40 p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground">Social networks</h2>
        <p className="text-sm text-muted">
          Shown in the top bar and footer. Leave a field blank to hide that network on the public site.
        </p>
        <div>
          <label htmlFor="facebookUrl" className={labelClassName}>
            Facebook URL
          </label>
          <input
            id="facebookUrl"
            name="facebookUrl"
            type="url"
            value={values.facebookUrl}
            onChange={(e) => updateField("facebookUrl", e.target.value)}
            onBlur={() => markTouched("facebookUrl")}
            aria-invalid={showError("facebookUrl") || undefined}
            placeholder="https://facebook.com/yourpage"
            className={formFieldInputClass(showError("facebookUrl"))}
          />
          {showError("facebookUrl") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.facebookUrl}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="instagramUrl" className={labelClassName}>
            Instagram URL
          </label>
          <input
            id="instagramUrl"
            name="instagramUrl"
            type="url"
            value={values.instagramUrl}
            onChange={(e) => updateField("instagramUrl", e.target.value)}
            onBlur={() => markTouched("instagramUrl")}
            aria-invalid={showError("instagramUrl") || undefined}
            placeholder="https://instagram.com/yourpage"
            className={formFieldInputClass(showError("instagramUrl"))}
          />
          {showError("instagramUrl") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.instagramUrl}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="youtubeUrl" className={labelClassName}>
            YouTube URL
          </label>
          <input
            id="youtubeUrl"
            name="youtubeUrl"
            type="url"
            value={values.youtubeUrl}
            onChange={(e) => updateField("youtubeUrl", e.target.value)}
            onBlur={() => markTouched("youtubeUrl")}
            aria-invalid={showError("youtubeUrl") || undefined}
            placeholder="https://youtube.com/@yourchannel"
            className={formFieldInputClass(showError("youtubeUrl"))}
          />
          {showError("youtubeUrl") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.youtubeUrl}
            </p>
          )}
        </div>
      </section>

      <button
        type="submit"
        disabled={!isValid}
        className="min-h-11 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        Save social links
      </button>
    </form>
  );
}
