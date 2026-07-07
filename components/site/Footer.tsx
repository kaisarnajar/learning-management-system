import Link from "next/link";
import { SiteLogo } from "@/components/site/SiteLogo";
import {
  EmailIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from "@/components/site/SocialIcons";
import {
  buildWhatsAppHref,
  formatWhatsAppForDisplay,
  getConfiguredSocialNetworkLinks,
  getSocialLinksSettings,
} from "@/lib/social-links";
import { BRAND_CONFIG } from "@/config/brand";
import { CREDITS_CONFIG } from "@/config/credits";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/courses", label: "Courses" },
  { href: "/announcements", label: "Announcements" },
  { href: "/library", label: "Library" },
  { href: "/fatwa", label: "Fatwa" },
  { href: "/teachers", label: "Teachers" },
];

const developerWhatsAppHref = buildWhatsAppHref(CREDITS_CONFIG.developer.whatsapp);
const developerWhatsAppDisplay = formatWhatsAppForDisplay(CREDITS_CONFIG.developer.whatsapp);

const supporterWhatsAppHref = buildWhatsAppHref(CREDITS_CONFIG.supporter.whatsapp);
const supporterWhatsAppDisplay = formatWhatsAppForDisplay(CREDITS_CONFIG.supporter.whatsapp);

type FooterCreditBlockProps = {
  title: string;
  name: string;
  email: string;
  emailHref: string;
  whatsappHref: string;
  whatsappLabel: string;
  linkedInHref: string;
};

const footerIconLinkClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-brand-gold-alt hover:text-brand-gold-alt";

function FooterCreditBlock({
  title,
  name,
  email,
  emailHref,
  whatsappHref,
  whatsappLabel,
  linkedInHref,
}: FooterCreditBlockProps) {
  return (
    <div className="text-center sm:text-right">
      <p className="font-medium text-white/90">{title}</p>
      <p className="mt-1 text-brand-gold-alt font-medium">{name}</p>
      <div className="mt-3 flex items-center justify-center gap-2 sm:justify-end">
        <a href={emailHref} className={footerIconLinkClassName} aria-label={`Email ${email}`}>
          <EmailIcon className="h-4 w-4" />
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={footerIconLinkClassName}
          aria-label={`WhatsApp ${whatsappLabel}`}
        >
          <WhatsAppIcon className="h-4 w-4" />
        </a>
        <a
          href={linkedInHref}
          target="_blank"
          rel="noopener noreferrer"
          className={footerIconLinkClassName}
          aria-label="LinkedIn profile"
        >
          <LinkedInIcon className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export async function Footer() {
  const settings = await getSocialLinksSettings();
  const whatsappHref = buildWhatsAppHref(settings.whatsappNumber, settings.whatsappDefaultMessage);
  const whatsappDisplay = formatWhatsAppForDisplay(settings.whatsappNumber);
  const socialLinks = getConfiguredSocialNetworkLinks(settings);

  return (
    <footer className="mt-auto relative bg-accent-muted/30 border-t border-border overflow-hidden text-foreground">
      {/* Top Gold Accent Line */}
      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50"></div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
          
          {/* Brand Column */}
          <div>
            <SiteLogo href="/" className="h-14 sm:h-16 mix-blend-multiply" />
            <p className="mt-6 text-sm leading-relaxed text-muted">
              {BRAND_CONFIG.footer.description}
            </p>
          </div>

          {/* Quick Links Column */}
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-gold-alt">Quick Links</p>
            <ul className="mt-6 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-brand-gold-alt"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div id="contact">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-gold-alt">Contact</p>
            <ul className="mt-6 space-y-4 text-sm text-muted">
              <li>
                <Link 
                  href="/contact" 
                  className="inline-block rounded-full border border-border px-5 py-2 font-medium text-foreground transition-colors hover:border-brand-gold-alt hover:text-brand-gold-alt"
                >
                  Send us a message
                </Link>
              </li>
              {settings.contactEmail && (
                <li>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="inline-flex items-center gap-3 hover:text-brand-gold-alt transition-colors"
                    aria-label={`Email ${settings.contactEmail}`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted/50 text-foreground">
                      <EmailIcon className="h-4 w-4" />
                    </div>
                    <span>{settings.contactEmail}</span>
                  </a>
                </li>
              )}
              {settings.whatsappNumber && (
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 hover:text-brand-gold-alt transition-colors"
                    aria-label={`WhatsApp ${whatsappDisplay}`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted/50 text-foreground">
                      <WhatsAppIcon className="h-4 w-4" />
                    </div>
                    <span>{whatsappDisplay}</span>
                  </a>
                </li>
              )}
              <li className="flex items-center gap-3 pt-2">
                <div className="h-px w-8 bg-border"></div>
                <span className="text-muted text-xs uppercase tracking-wider">{BRAND_CONFIG.footer.text}</span>
              </li>
            </ul>

            {socialLinks.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-brand-gold-alt hover:bg-brand-gold-alt/10 hover:text-brand-gold-alt"
                  >
                    {link.label === "Facebook" && <FacebookIcon className="h-3.5 w-3.5" />}
                    {link.label === "Instagram" && <InstagramIcon className="h-3.5 w-3.5" />}
                    {link.label === "YouTube" && <YouTubeIcon className="h-3.5 w-3.5" />}
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-footer / Credits */}
      <div className="relative z-10 bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] px-4 py-10 text-xs text-white/60 sm:px-6 shadow-inner">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
          <p className="text-center sm:text-left mt-2">
            {BRAND_CONFIG.footer.copyrightText}
          </p>
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:gap-12 lg:gap-16">
            <FooterCreditBlock
              title={CREDITS_CONFIG.developer.role}
              name={CREDITS_CONFIG.developer.name}
              email={CREDITS_CONFIG.developer.email}
              emailHref={`mailto:${CREDITS_CONFIG.developer.email}`}
              whatsappHref={developerWhatsAppHref}
              whatsappLabel={developerWhatsAppDisplay}
              linkedInHref={CREDITS_CONFIG.developer.linkedIn}
            />
            <FooterCreditBlock
              title={CREDITS_CONFIG.supporter.role}
              name={CREDITS_CONFIG.supporter.name}
              email={CREDITS_CONFIG.supporter.email}
              emailHref={`mailto:${CREDITS_CONFIG.supporter.email}`}
              whatsappHref={supporterWhatsAppHref}
              whatsappLabel={supporterWhatsAppDisplay}
              linkedInHref={CREDITS_CONFIG.supporter.linkedIn}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
