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
