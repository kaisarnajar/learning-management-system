import { NextResponse } from "next/server";
import { BRAND_CONFIG } from "@/config/brand";
import { CURRENT_POLICIES_VERSION } from "@/config/constants/policies";
import { MAX_ORDER_QTY } from "@/config/constants/business";
import { FATWA_CATEGORIES } from "@/services/fatwa";
import { OCCUPATION_OPTIONS } from "@/services/occupations";
import { DEFAULT_PROFILE_COUNTRY_CODE, PROFILE_COUNTRIES } from "@/services/countries";
import { getPaymentSettings, isUpiConfiguredFromSettings } from "@/services/payment-settings";
import { getSocialLinksSettings } from "@/services/social-links";
import { apiServerError } from "@/utils/api-response";

/**
 * Static configuration the app needs before (or without) signing in: the
 * academy's branding and contact details, policy links and version, form
 * lookups (countries, occupations, fatwa categories), feature switches and
 * limits. Safe to cache on the device for a day.
 */
export async function GET() {
  try {
    const [paymentSettings, social] = await Promise.all([getPaymentSettings(), getSocialLinksSettings()]);
    const site = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");

    return NextResponse.json({
      success: true,
      brand: {
        name: BRAND_CONFIG.name,
        arabicName: BRAND_CONFIG.arabicName ?? null,
        shortName: BRAND_CONFIG.shortName,
        websiteUrl: site,
        logoUrl: BRAND_CONFIG.assets.logoUrl,
        colors: BRAND_CONFIG.colors,
        contact: BRAND_CONFIG.contact,
        social,
      },
      policies: {
        version: CURRENT_POLICIES_VERSION,
        privacyPolicyUrl: `${site}/privacy-policy`,
        termsUrl: `${site}/terms-and-conditions`,
      },
      links: {
        // Password resets finish on the website: the e-mailed link opens it.
        forgotPasswordUrl: `${site}/forgot-password`,
        contactUrl: `${site}/contact`,
      },
      lookups: {
        countries: PROFILE_COUNTRIES.map(({ code, name, dialCode, flag, localNumberMinLength, localNumberMaxLength }) => ({
          code,
          name,
          dialCode,
          flag,
          localNumberMinLength,
          localNumberMaxLength,
        })),
        defaultCountryCode: DEFAULT_PROFILE_COUNTRY_CODE,
        occupations: OCCUPATION_OPTIONS,
        fatwaCategories: FATWA_CATEGORIES,
      },
      features: {
        googleSignIn: Boolean(process.env.AUTH_GOOGLE_ID),
        onlinePayments: isUpiConfiguredFromSettings(paymentSettings),
        feeWaiverRequests: paymentSettings.feeWaiverEnabled,
      },
      limits: {
        maxBookQuantityPerOrder: MAX_ORDER_QTY,
      },
    });
  } catch (error) {
    return apiServerError("api/v1/app-config", error, "Failed to load the app configuration.");
  }
}
