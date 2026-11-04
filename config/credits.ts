export type Contributor = {
  name: string;
  role: string;
  email: string;
  whatsapp: string;
  linkedIn: string;
};

export type CreditsConfig = {
  developer: Contributor;
  supporter: Contributor;
};

export const CREDITS_CONFIG: CreditsConfig = {
  developer: {
    name: "Kaisar Ahmad Najar",
    role: "Developed & Maintained by",
    email: "kaisarnajar11114@gmail.com",
    whatsapp: "917006025120",
    linkedIn: "https://www.linkedin.com/in/kaisarnajar/",
  },
  supporter: {
    name: "Barkat Bashir Malik",
    role: "Supported by",
    email: "barkatbashir4@gmail.com",
    whatsapp: "917006079324",
    linkedIn: "https://www.linkedin.com/in/barkat-bashir-070a68178/",
  },
};

/**
 * Developer and supporter credits (footer, About page) are shown by default,
 * as they always have been. A white-label deployment that must not carry
 * another team's contact details sets SHOW_DEVELOPER_CREDITS="false".
 * Read on the server only (the footer and About page are server components).
 */
export function shouldShowDeveloperCredits(): boolean {
  return process.env.SHOW_DEVELOPER_CREDITS !== "false";
}
