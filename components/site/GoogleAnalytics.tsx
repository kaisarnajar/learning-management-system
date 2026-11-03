import Script from "next/script";
import { headers } from "next/headers";

export async function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!gaId) return null;

  // Nonce issued by the middleware so the inline bootstrap passes the CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const safeGaId = gaId.replace(/[^A-Za-z0-9_-]/g, "");

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${safeGaId}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${safeGaId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
