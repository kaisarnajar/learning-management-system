import type { OccupationValue } from '../services/occupations';
import { courses } from "./courses";

/** Shared password for all demo student accounts (local / QA only). */
export const DEMO_STUDENT_PASSWORD = "Demo@2026";

/** Shared password for admin accounts seeded from `ADMIN_EMAIL` (local / QA only). */
export const DEMO_ADMIN_PASSWORD = "Admin@2026";

/** Total demo student accounts created by the seed script. */
export const DEMO_STUDENT_COUNT = 50;

export type DemoPaymentStatus = "approved" | "pending" | "declined";

export type DemoPaymentType = "monthly" | "enrollment";

export type DemoPayment = {
  status: DemoPaymentStatus;
  paymentType?: DemoPaymentType;
  month?: string;
  year?: string;
};

export type DemoEnrollmentStatus =
  | "pending_approval"
  | "awaiting_enrollment_fee"
  | "active"
  | "completed";

export type DemoEnrollment = {
  courseId: string;
  status: DemoEnrollmentStatus;
  payments?: DemoPayment[];
  completedAt?: string;
};

export type DemoStudent = {
  id: string;
  name: string;
  fatherName: string;
  occupation: OccupationValue;
  address: string;
  whatsapp: string;
  dateOfBirth: string;
  enrollments: DemoEnrollment[];
};

const jk = (district: string) => `${district}, J&K`;

const FREE_COURSE_IDS = new Set(
  courses.filter((course) => course.priceInrPaise === 0).map((course) => course.id),
);

const PAID_COURSE_IDS = courses
  .filter((course) => course.priceInrPaise > 0)
  .map((course) => course.id);

const DISTRICTS = [
  "Srinagar",
  "Baramulla",
  "Anantnag",
  "Pulwama",
  "Shopian",
  "Budgam",
  "Seattle",
  "Kupwara",
  "Bandipora",
  "Ganderbal",
];

const OCCUPATIONS: OccupationValue[] = [
  "STUDENT",
  "WORKING",
  "GOVERNMENT_EMPLOYEE",
  "SELF_EMPLOYED",
  "TEACHER",
  "HEALTHCARE_WORKER",
  "ENGINEER",
  "IT_PROFESSIONAL",
  "HOMEMAKER",
  "RETIRED",
  "FARMER",
  "SHOPKEEPER",
];

const GENERATED_NAMES: { name: string; fatherName: string }[] = [
  { name: "Rafiq Ahmad", fatherName: "Ghulam Ahmad" },
  { name: "Shazia Akhtar", fatherName: "Mohammad Akhtar" },
  { name: "Naveed Hussain", fatherName: "Abdul Hussain" },
  { name: "Rubina Begum", fatherName: "Ali Mohammad" },
  { name: "Yasin Dar", fatherName: "Abdul Gani Dar" },
  { name: "Parveena Jan", fatherName: "Ghulam Nabi" },
  { name: "Sajad Lone", fatherName: "Mohammad Sultan Lone" },
  { name: "Uzma Shah", fatherName: "Abdul Shah" },
  { name: "Arshid Mir", fatherName: "Ghulam Qadir Mir" },
  { name: "Nasreen Khatoon", fatherName: "Mohammad Ramzan" },
  { name: "Waseem Rather", fatherName: "Abdul Rather" },
  { name: "Nazia Bano", fatherName: "Ghulam Hassan" },
  { name: "Tanveer Ahmad", fatherName: "Mohammad Yousuf" },
  { name: "Riffat Jan", fatherName: "Abdul Rashid" },
  { name: "Khurshid Bhat", fatherName: "Ghulam Rasool Bhat" },
  { name: "Saima Gul", fatherName: "Mohammad Gul" },
  { name: "Altaf Wani", fatherName: "Abdul Wani" },
  { name: "Mubeena Akhter", fatherName: "Ghulam Mohammad" },
  { name: "Javed Khan", fatherName: "Abdul Hamid Khan" },
  { name: "Shabnam Farooq", fatherName: "Farooq Ahmad" },
  { name: "Iqbal Najar", fatherName: "Ghulam Mohammad Najar" },
  { name: "Rukhsar Bhat", fatherName: "Mohammad Ashraf Bhat" },
  { name: "Showkat Ahmad", fatherName: "Abdul Ahad" },
  { name: "Aabida Mir", fatherName: "Ghulam Nabi Mir" },
  { name: "Fayaz Sheikh", fatherName: "Mohammad Ramzan Sheikh" },
];

function enrollmentPayment(
  status: DemoPaymentStatus,
  paymentType: DemoPaymentType = "monthly",
  month = "03",
  year = "2026",
): DemoPayment {
  if (paymentType === "enrollment") {
    return { status, paymentType: "enrollment" };
  }
  return { status, paymentType: "monthly", month, year };
}

function buildGeneratedDemoStudents(): DemoStudent[] {
  const freeCourses = [...FREE_COURSE_IDS];
  const paidCourses = PAID_COURSE_IDS;

  return GENERATED_NAMES.map((profile, index) => {
    const id = String(26 + index).padStart(2, "0");
    const district = DISTRICTS[index % DISTRICTS.length] ?? "Srinagar";
    const occupation = OCCUPATIONS[index % OCCUPATIONS.length] ?? "STUDENT";
    const yearOfBirth = 1978 + (index % 28);
    const month = String((index % 12) + 1).padStart(2, "0");
    const day = String((index % 27) + 1).padStart(2, "0");

    let enrollments: DemoEnrollment[];

    if (index < 3) {
      enrollments = [
        {
          courseId: freeCourses[index % freeCourses.length] ?? "seerah-youth",
          status: "pending_approval",
        },
      ];
    } else if (index < 6) {
      enrollments = [
        {
          courseId: paidCourses[index % paidCourses.length] ?? "quran-nazira",
          status: "awaiting_enrollment_fee",
        },
      ];
    } else if (index < 10) {
      enrollments = [
        {
          courseId: paidCourses[(index + 2) % paidCourses.length] ?? "hifz-foundation",
          status: "awaiting_enrollment_fee",
          payments: [enrollmentPayment("pending", "enrollment")],
        },
      ];
    } else if (index < 16) {
      enrollments = [
        {
          courseId: paidCourses[index % paidCourses.length] ?? "quran-nazira",
          status: "active",
          payments: [
            enrollmentPayment("approved", "enrollment"),
            enrollmentPayment("approved", "monthly", "01", "2026"),
            ...(index % 2 === 0 ? [enrollmentPayment("approved", "monthly", "02", "2026")] : []),
          ],
        },
      ];
    } else if (index < 19) {
      enrollments = [
        {
          courseId: freeCourses[index % freeCourses.length] ?? "maktab-foundation",
          status: "active",
        },
      ];
    } else if (index < 22) {
      enrollments = [
        {
          courseId: paidCourses[(index + 4) % paidCourses.length] ?? "tajweed-intensive",
          status: "completed",
          completedAt: "2026-03-15T12:00:00.000Z",
          payments: [
            enrollmentPayment("approved", "enrollment"),
            enrollmentPayment("approved", "monthly", "01", "2026"),
            enrollmentPayment("approved", "monthly", "02", "2026"),
            enrollmentPayment("approved", "monthly", "03", "2026"),
          ],
        },
      ];
    } else if (index < 24) {
      enrollments = [
        {
          courseId: paidCourses[index % paidCourses.length] ?? "arabic-grammar",
          status: "active",
          payments: [
            enrollmentPayment("approved", "enrollment"),
            enrollmentPayment("approved", "monthly", "02", "2026"),
            enrollmentPayment("pending", "monthly", "03", "2026"),
          ],
        },
        {
          courseId: freeCourses[0] ?? "seerah-youth",
          status: "active",
        },
      ];
    } else {
      enrollments = [
        {
          courseId: paidCourses[(index + 1) % paidCourses.length] ?? "sisters-tajweed",
          status: "active",
          payments: [
            enrollmentPayment("approved", "enrollment"),
            enrollmentPayment("declined", "monthly", "02", "2026"),
          ],
        },
        {
          courseId: paidCourses[(index + 5) % paidCourses.length] ?? "islamic-history",
          status: "awaiting_enrollment_fee",
          payments: [enrollmentPayment("pending", "enrollment")],
        },
      ];
    }

    return {
      id,
      name: profile.name,
      fatherName: profile.fatherName,
      occupation,
      address: jk(district),
      whatsapp: `9199100${id}`,
      dateOfBirth: `${yearOfBirth}-${month}-${day}`,
      enrollments,
    };
  });
}

/** First 25 hand-crafted demo students with varied enrollment and payment states. */
const manualDemoStudents: DemoStudent[] = [
  {
    id: "01",
    name: "Ayesha Bhat",
    fatherName: "Ghulam Rasool Bhat",
    occupation: "STUDENT",
    address: jk("Srinagar"),
    whatsapp: "919900000001",
    dateOfBirth: "2004-03-12",
    enrollments: [{ courseId: "maktab-foundation", status: "pending_approval" }],
  },
  {
    id: "02",
    name: "Mohammad Idrees",
    fatherName: "Abdul Ahad Dar",
    occupation: "WORKING",
    address: jk("Baramulla"),
    whatsapp: "919900000002",
    dateOfBirth: "1998-07-21",
    enrollments: [{ courseId: "seerah-youth", status: "pending_approval" }],
  },
  {
    id: "03",
    name: "Fatima Jan",
    fatherName: "Ali Mohammad Wani",
    occupation: "HOMEMAKER",
    address: jk("Anantnag"),
    whatsapp: "919900000003",
    dateOfBirth: "1992-11-05",
    enrollments: [{ courseId: "dua-daily-adab", status: "pending_approval" }],
  },
  {
    id: "04",
    name: "Omar Farooq",
    fatherName: "Farooq Ahmad Malik",
    occupation: "IT_PROFESSIONAL",
    address: jk("Pulwama"),
    whatsapp: "919900000004",
    dateOfBirth: "1996-01-18",
    enrollments: [{ courseId: "quran-nazira", status: "awaiting_enrollment_fee" }],
  },
  {
    id: "05",
    name: "Kulsum Akhtar",
    fatherName: "Ghulam Nabi Lone",
    occupation: "TEACHER",
    address: jk("Shopian"),
    whatsapp: "919900000005",
    dateOfBirth: "1989-09-30",
    enrollments: [
      {
        courseId: "hifz-foundation",
        status: "awaiting_enrollment_fee",
        payments: [enrollmentPayment("pending", "enrollment")],
      },
    ],
  },
  {
    id: "06",
    name: "Bilal Ahmad",
    fatherName: "Mohammad Sultan",
    occupation: "SELF_EMPLOYED",
    address: jk("Budgam"),
    whatsapp: "919900000006",
    dateOfBirth: "1995-04-08",
    enrollments: [
      {
        courseId: "quran-nazira",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
          enrollmentPayment("pending", "monthly", "02", "2026"),
        ],
      },
    ],
  },
  {
    id: "07",
    name: "Nida Rashid",
    fatherName: "Abdul Rashid",
    occupation: "STUDENT",
    address: jk("Seattle"),
    whatsapp: "919900000007",
    dateOfBirth: "2003-06-14",
    enrollments: [
      {
        courseId: "hifz-foundation",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
        ],
      },
    ],
  },
  {
    id: "08",
    name: "Imran Yousuf",
    fatherName: "Yousuf Shah",
    occupation: "ENGINEER",
    address: jk("Kupwara"),
    whatsapp: "919900000008",
    dateOfBirth: "1994-12-02",
    enrollments: [
      {
        courseId: "tajweed-intensive",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
          enrollmentPayment("approved", "monthly", "03", "2026"),
        ],
      },
    ],
  },
  {
    id: "09",
    name: "Sana Mir",
    fatherName: "Ghulam Hassan Mir",
    occupation: "HEALTHCARE_WORKER",
    address: jk("Bandipora"),
    whatsapp: "919900000009",
    dateOfBirth: "1991-08-25",
    enrollments: [
      {
        courseId: "arabic-grammar",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
        ],
      },
    ],
  },
  {
    id: "10",
    name: "Tariq Hussain",
    fatherName: "Ghulam Hussain",
    occupation: "GOVERNMENT_EMPLOYEE",
    address: jk("Ganderbal"),
    whatsapp: "919900000010",
    dateOfBirth: "1988-02-17",
    enrollments: [
      {
        courseId: "seerah-youth",
        status: "active",
      },
    ],
  },
  {
    id: "11",
    name: "Hafsa Nazir",
    fatherName: "Nazir Ahmad",
    occupation: "STUDENT",
    address: jk("Srinagar"),
    whatsapp: "919900000011",
    dateOfBirth: "2005-05-09",
    enrollments: [
      {
        courseId: "quran-nazira-women",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
          enrollmentPayment("pending", "monthly", "03", "2026"),
        ],
      },
    ],
  },
  {
    id: "12",
    name: "Adnan Qadir",
    fatherName: "Abdul Qadir",
    occupation: "LABOURER",
    address: jk("Baramulla"),
    whatsapp: "919900000012",
    dateOfBirth: "1997-10-11",
    enrollments: [
      {
        courseId: "hifz-foundation",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
          enrollmentPayment("pending", "monthly", "03", "2026"),
        ],
      },
    ],
  },
  {
    id: "13",
    name: "Rukhsana Begum",
    fatherName: "Mohammad Akbar",
    occupation: "HOMEMAKER",
    address: jk("Anantnag"),
    whatsapp: "919900000013",
    dateOfBirth: "1990-07-03",
    enrollments: [
      {
        courseId: "fiqh-basics",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("pending", "monthly", "03", "2026"),
        ],
      },
    ],
  },
  {
    id: "14",
    name: "Zubair Khan",
    fatherName: "Abdul Hamid Khan",
    occupation: "SHOPKEEPER",
    address: jk("Pulwama"),
    whatsapp: "919900000014",
    dateOfBirth: "1993-03-28",
    enrollments: [
      {
        courseId: "tajweed-intensive",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
          enrollmentPayment("pending", "monthly", "03", "2026"),
        ],
      },
    ],
  },
  {
    id: "15",
    name: "Mehreen Ashraf",
    fatherName: "Mohammad Ashraf",
    occupation: "STUDENT",
    address: jk("Shopian"),
    whatsapp: "919900000015",
    dateOfBirth: "2006-01-22",
    enrollments: [
      {
        courseId: "children-nazira",
        status: "awaiting_enrollment_fee",
        payments: [enrollmentPayment("pending", "enrollment")],
      },
    ],
  },
  {
    id: "16",
    name: "Shahid Lone",
    fatherName: "Ghulam Mohammad Lone",
    occupation: "DRIVER",
    address: jk("Budgam"),
    whatsapp: "919900000016",
    dateOfBirth: "1987-11-19",
    enrollments: [
      {
        courseId: "quran-nazira",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
          enrollmentPayment("declined", "monthly", "02", "2026"),
        ],
      },
    ],
  },
  {
    id: "17",
    name: "Asiya Manzoor",
    fatherName: "Manzoor Ahmad",
    occupation: "UNEMPLOYED",
    address: jk("Seattle"),
    whatsapp: "919900000017",
    dateOfBirth: "1999-09-07",
    enrollments: [
      {
        courseId: "hifz-foundation",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("declined", "monthly", "02", "2026"),
        ],
      },
    ],
  },
  {
    id: "18",
    name: "Faisal Rather",
    fatherName: "Abdul Rather",
    occupation: "FARMER",
    address: jk("Kupwara"),
    whatsapp: "919900000018",
    dateOfBirth: "1986-06-30",
    enrollments: [
      {
        courseId: "arabic-grammar",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
          enrollmentPayment("declined", "monthly", "03", "2026"),
        ],
      },
    ],
  },
  {
    id: "19",
    name: "Tabassum Gul",
    fatherName: "Mohammad Gul",
    occupation: "RETIRED",
    address: jk("Bandipora"),
    whatsapp: "919900000019",
    dateOfBirth: "1975-04-15",
    enrollments: [
      {
        courseId: "quran-nazira",
        status: "completed",
        completedAt: "2026-03-01T12:00:00.000Z",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
          enrollmentPayment("approved", "monthly", "03", "2026"),
        ],
      },
    ],
  },
  {
    id: "20",
    name: "Junaid Mir",
    fatherName: "Ghulam Qadir Mir",
    occupation: "ACCOUNTANT",
    address: jk("Ganderbal"),
    whatsapp: "919900000020",
    dateOfBirth: "1992-12-08",
    enrollments: [
      {
        courseId: "hifz-foundation",
        status: "completed",
        completedAt: "2026-04-01T12:00:00.000Z",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
          enrollmentPayment("approved", "monthly", "03", "2026"),
          enrollmentPayment("approved", "monthly", "04", "2026"),
        ],
      },
    ],
  },
  {
    id: "21",
    name: "Samreen Akhter",
    fatherName: "Mohammad Akhter",
    occupation: "LAWYER",
    address: jk("Srinagar"),
    whatsapp: "919900000021",
    dateOfBirth: "1990-08-04",
    enrollments: [
      {
        courseId: "tajweed-intensive",
        status: "completed",
        completedAt: "2026-02-15T12:00:00.000Z",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
        ],
      },
    ],
  },
  {
    id: "22",
    name: "Irfan Nazir",
    fatherName: "Nazir Hussain",
    occupation: "POLICE_OFFICER",
    address: jk("Baramulla"),
    whatsapp: "919900000022",
    dateOfBirth: "1985-05-27",
    enrollments: [
      {
        courseId: "fiqh-basics",
        status: "completed",
        completedAt: "2026-03-20T12:00:00.000Z",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
          enrollmentPayment("approved", "monthly", "03", "2026"),
        ],
      },
    ],
  },
  {
    id: "23",
    name: "Mariam Hassan",
    fatherName: "Abdul Hassan",
    occupation: "STUDENT",
    address: jk("Anantnag"),
    whatsapp: "919900000023",
    dateOfBirth: "2004-10-16",
    enrollments: [
      {
        courseId: "quran-nazira",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
        ],
      },
      {
        courseId: "seerah-youth",
        status: "completed",
        completedAt: "2026-01-30T12:00:00.000Z",
      },
    ],
  },
  {
    id: "24",
    name: "Hamza Sheikh",
    fatherName: "Mohammad Ramzan Sheikh",
    occupation: "CLERGY",
    address: jk("Pulwama"),
    whatsapp: "919900000024",
    dateOfBirth: "1983-07-09",
    enrollments: [
      {
        courseId: "hifz-foundation",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
        ],
      },
      {
        courseId: "tafsir-juz-amma",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "02", "2026"),
          enrollmentPayment("pending", "monthly", "03", "2026"),
        ],
      },
    ],
  },
  {
    id: "25",
    name: "Noor Jehan",
    fatherName: "Ghulam Mohammad",
    occupation: "WORKING",
    address: jk("Shopian"),
    whatsapp: "919900000025",
    dateOfBirth: "1996-02-03",
    enrollments: [
      { courseId: "seerah-youth", status: "pending_approval" },
      {
        courseId: "fiqh-basics",
        status: "active",
        payments: [
          enrollmentPayment("approved", "enrollment"),
          enrollmentPayment("approved", "monthly", "01", "2026"),
        ],
      },
    ],
  },
];

export const demoStudents: DemoStudent[] = [...manualDemoStudents, ...buildGeneratedDemoStudents()];
