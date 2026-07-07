import type { AnnouncementCategory, BlogApprovalStatus, DailyInspirationKind, BookStatus } from "@prisma/client";
import type { FatwaCategory } from '@/services/fatwa';

export type DemoSiteAnnouncement = {
  id: string;
  title: string;
  body: string;
  eventDate?: string;
  location?: string;
  published: boolean;
  showOnHomepage: boolean;
};

export type DemoBlogPost = {
  id: string;
  title: string;
  excerpt?: string;
  body: string;
  published: boolean;
  approvalStatus: BlogApprovalStatus;
  /** Teacher id from `content/teachers` — omit for admin-authored posts. */
  teacherId?: string;
};

export type DemoDailyInspiration = {
  id: string;
  kind: DailyInspirationKind;
  arabicText: string;
  englishTranslation: string;
  reference?: string;
  published: boolean;
  /** When true, entry is the one shown on the homepage (latest published `updatedAt`). */
  onHomepage?: boolean;
};

export type DemoFatwa = {
  id: string;
  askerName: string;
  askerEmail: string;
  category: FatwaCategory;
  title: string;
  question: string;
  answer?: string;
  /** Demo student id from `content/demo-students` — links question to a seeded student account. */
  studentId?: string;
};

export type DemoContactInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  /** Demo student id — links inquiry to a seeded student account when signed in. */
  studentId?: string;
  reply?: string;
  /** Admin user index (1-based) from seeded admins, or omit for unreplied. */
  repliedByAdminIndex?: number;
};

export const demoSiteAnnouncements: DemoSiteAnnouncement[] = [
  {
    id: "seed-demo-announcement-1",
    title: "Annual Hifz Graduation Ceremony",
    body: "Join us to celebrate students who completed their Hifz this academic year. Families and guests are welcome after Maghrib.",
    eventDate: "15 Rajab 1447 / 5 January 2026",
    location: "Main campus, Srinagar",
    published: true,
    showOnHomepage: true,
  },
  {
    id: "seed-demo-announcement-2",
    title: "Visiting Scholar: Tajweed Workshop",
    body: "Moulana Farid Hassan will lead a two-day Tajweed intensive for intermediate students. Registration is open in the admin office.",
    eventDate: "22–23 Safar 1447 / 12–13 January 2026",
    location: "Online + campus lab",
    published: true,
    showOnHomepage: true,
  },
  {
    id: "seed-demo-announcement-3",
    title: "Ramadan Class Timetable Released",
    body: "Revised class timings for Ramadan are now available. Evening batches start 45 minutes after Iftar.",
    eventDate: "1 Ramadan 1447 / February 2026",
    location: "All campuses",
    published: true,
    showOnHomepage: true,
  },
  {
    id: "seed-demo-announcement-4",
    title: "New Nazira Batch — Open Enrollment",
    body: "A fresh Nazira batch for beginners starts next month. Limited seats; complete your profile before requesting enrollment.",
    eventDate: "March 2026",
    location: "Online",
    published: true,
    showOnHomepage: true,
  },
  {
    id: "seed-demo-announcement-5",
    title: "Library Maintenance Weekend",
    body: "The digital library catalogue will be offline for maintenance. Downloads already saved on your device will still work.",
    eventDate: "8 March 2026",
    location: "Online portal",
    published: true,
    showOnHomepage: false,
  },
  {
    id: "seed-demo-announcement-6",
    title: "[Draft] Summer Youth Camp (unpublished)",
    body: "Internal draft — details pending confirmation from the youth program coordinator.",
    eventDate: "June 2026",
    location: "TBD",
    published: false,
    showOnHomepage: false,
  },
];

export const demoBlogPosts: DemoBlogPost[] = [
  {
    id: "seed-demo-blog-1",
    title: "Why Consistency Matters in Quran Memorization",
    excerpt: "Small daily portions beat irregular long sessions.",
    body: "Memorization is a marathon, not a sprint. Students who revise daily retain more than those who cram before assessments. Start with a fixed portion after Fajr and protect that time.",
    published: true,
    approvalStatus: "APPROVED",
  },
  {
    id: "seed-demo-blog-2",
    title: "Approved Article — Not Yet Published",
    excerpt: "This post is approved but kept off the public blog for QA.",
    body: "Admins can approve content and choose whether it appears on the public blog page. Use this state to preview formatting before going live.",
    published: false,
    approvalStatus: "APPROVED",
  },
  {
    id: "seed-demo-blog-3",
    title: "Teacher Draft: Preparing for Your First Tajweed Class",
    excerpt: "Notes for new students joining Tajweed Level 1.",
    body: "Bring a mushaf, a notebook, and headphones if joining online. We will cover makharij al-huruf in the first two sessions.",
    published: false,
    approvalStatus: "DRAFT",
    teacherId: "1",
  },
  {
    id: "seed-demo-blog-4",
    title: "Teacher Submission: Benefits of Morning Revision",
    excerpt: "Awaiting admin approval.",
    body: "Morning revision anchors what you memorized the night before. Even ten minutes after Fajr makes a measurable difference over a term.",
    published: false,
    approvalStatus: "PENDING",
    teacherId: "2",
  },
  {
    id: "seed-demo-blog-5",
    title: "Teacher Post: Understanding Madd in Practice",
    excerpt: "Published teacher article for the public blog.",
    body: "Madd is not only a theoretical rule — listen to qualified reciters and mimic their lengthening until your ear recognizes natural durations.",
    published: true,
    approvalStatus: "APPROVED",
    teacherId: "3",
  },
  {
    id: "seed-demo-blog-6",
    title: "Teacher Post: Rejected Topic Example",
    excerpt: "This submission was rejected for QA testing.",
    body: "Admins rejected this sample so you can verify the teacher portal shows the rejected status and allows resubmission.",
    published: false,
    approvalStatus: "REJECTED",
    teacherId: "4",
  },
  {
    id: "seed-demo-blog-7",
    title: "Seerah Reflections for Teen Students",
    excerpt: "Youth program blog — live on the public page.",
    body: "Studying the Seerah helps students see prophetic patience in adversity. Our youth circle uses one incident per week for discussion and journaling.",
    published: true,
    approvalStatus: "APPROVED",
    teacherId: "6",
  },
];

export const demoDailyInspirations: DemoDailyInspiration[] = [
  {
    id: "seed-demo-inspiration-1",
    kind: "QURAN",
    arabicText: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    englishTranslation: "Indeed, with hardship comes ease.",
    reference: "Qur'an 94:6",
    published: true,
    onHomepage: true,
  },
  {
    id: "seed-demo-inspiration-2",
    kind: "HADITH",
    arabicText: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    englishTranslation: "The best among you are those who learn the Qur'an and teach it.",
    reference: "Sahih al-Bukhari",
    published: true,
  },
  {
    id: "seed-demo-inspiration-3",
    kind: "QURAN",
    arabicText: "وَاذْكُرُوا اللَّهَ كَثِيرًا",
    englishTranslation: "And remember Allah often.",
    reference: "Qur'an 33:41",
    published: false,
  },
  {
    id: "seed-demo-inspiration-4",
    kind: "HADITH",
    arabicText: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ",
    englishTranslation: "Seeking knowledge is an obligation upon every Muslim.",
    reference: "Ibn Majah",
    published: false,
  },
];

export const demoFatwaQuestions: DemoFatwa[] = [
  {
    id: "seed-demo-fatwa-1",
    askerName: "Amina Khan",
    askerEmail: "demo-fatwa-pending-1@seed.local",
    category: "Fiqh",
    title: "Missing a day of fasting in Ramadan",
    question: "If I missed one fast due to illness and have not made it up yet, what should I do before next Ramadan?",
  },
  {
    id: "seed-demo-fatwa-2",
    askerName: "Demo Student 03",
    askerEmail: "demo-student-03@seed.local",
    category: "Tajweed",
    title: "Stopping rules at end of ayah",
    question: "When stopping at the end of an ayah, which rule applies if the last letter has sukoon?",
    studentId: "03",
  },
  {
    id: "seed-demo-fatwa-3",
    askerName: "Yusuf Ali",
    askerEmail: "demo-fatwa-answered-1@seed.local",
    category: "Quran",
    title: "Reading Quran without wudu",
    question: "Is it permissible to read the Quran from a mobile app without wudu?",
    answer:
      "Scholars differ on touching the mushaf without wudu. Reading from memory or a screen without physically touching written Arabic text is generally permitted, though a state of purity is recommended out of adab.",
  },
  {
    id: "seed-demo-fatwa-4",
    askerName: "Fatima Begum",
    askerEmail: "demo-fatwa-answered-2@seed.local",
    category: "Hadith",
    title: "Authenticity of a common dua",
    question: "Is the dua 'Rabbana atina fid-dunya hasanah…' established in authentic collections?",
    answer:
      "Yes. This supplication is reported in Sahih al-Bukhari and Sahih Muslim from the Prophet (peace be upon him) and is widely recited in prayer.",
  },
  {
    id: "seed-demo-fatwa-5",
    askerName: "Demo Student 07",
    askerEmail: "demo-student-07@seed.local",
    category: "Islam",
    title: "Intention before voluntary prayer",
    question: "Must I verbally state my intention for a nafl prayer, or is it enough in the heart?",
    studentId: "07",
    answer:
      "The intention for prayer is in the heart. Verbalizing the niyyah is not required by the majority of scholars, though some recommend clarity of purpose before takbir.",
  },
  {
    id: "seed-demo-fatwa-6",
    askerName: "Guest User",
    askerEmail: "guest-fatwa@example.com",
    category: "Others",
    title: "Enrollment age for children's Nazira class",
    question: "What is the minimum recommended age for the children's Nazira program?",
  },
];

/** Sample course-wide announcements for QA (admin, teacher, categories). */
export type DemoCourseAnnouncement = {
  id: string;
  courseId: string;
  teacherId?: string;
  postedByAdmin?: boolean;
  authorName: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  enrollmentId?: string;
};

export const demoCourseAnnouncements: DemoCourseAnnouncement[] = [
  {
    id: "seed-demo-course-announcement-1",
    courseId: "quran-nazira",
    postedByAdmin: true,
    authorName: "Academy Admin",
    category: "COURSE_ANNOUNCEMENT",
    title: "Welcome to Quran Nazira",
    body: "Classes begin next Monday. Please join five minutes early to test your audio.",
  },
  {
    id: "seed-demo-course-announcement-2",
    courseId: "quran-nazira",
    teacherId: "1",
    authorName: "Moulana Ibrahim Khan",
    category: "CLASS_SCHEDULE",
    title: "Thursday session moved to 7 PM",
    body: "This week's live session is rescheduled due to the campus event.",
  },
  {
    id: "seed-demo-course-announcement-3",
    courseId: "hifz-foundation",
    teacherId: "2",
    authorName: "Moulana Yusuf Ahmed",
    category: "ASSIGNMENTS_HOMEWORK",
    title: "Memorize Surah al-Mulk ayat 1–5",
    body: "Submit your recitation recording link in the next private message thread.",
  },
  {
    id: "seed-demo-course-announcement-4",
    courseId: "quran-nazira",
    teacherId: "1",
    authorName: "Moulana Ibrahim Khan",
    category: "GENERAL_NOTICE",
    title: "Private message for Bilal Ahmad",
    body: "Your Tajweed assessment is scheduled for next Tuesday. Reply if you need a different slot.",
    enrollmentId: "seed-demo-enrollment-06-quran-nazira",
  },
  {
    id: "seed-demo-course-announcement-5",
    courseId: "quran-nazira-women",
    teacherId: "5",
    authorName: "Ustadha Fatima Siddiqui",
    category: "STUDY_MATERIALS",
    title: "Sisters batch — Noorani Qaida PDF",
    body: "Download the attached Qaida pages before Monday's class. Focus on letters with heavy makhraj practice.",
  },
  {
    id: "seed-demo-course-announcement-6",
    courseId: "children-nazira",
    teacherId: "8",
    authorName: "Ustadha Khadija Rahman",
    category: "CLASS_SCHEDULE",
    title: "Children's class timing update",
    body: "Saturday sessions move to 4:30 PM IST for the rest of Ramadan.",
  },
  {
    id: "seed-demo-course-announcement-7",
    courseId: "tafsir-juz-amma",
    teacherId: "7",
    authorName: "Moulana Saeedullah Mir",
    category: "EXAMS_TESTS",
    title: "Surah An-Naba reflection quiz",
    body: "Complete the short quiz on themes from last week's Tafsir before the next live session.",
  },
  {
    id: "seed-demo-course-announcement-8",
    courseId: "sisters-tajweed",
    teacherId: "10",
    authorName: "Ustadha Amna Qureshi",
    category: "ASSIGNMENTS_HOMEWORK",
    title: "Record Surah Al-Ikhlas with tajweed rules",
    body: "Submit a 60-second recording applying the ghunnah and qalqalah rules covered this week.",
  },
  {
    id: "seed-demo-course-announcement-9",
    courseId: "maktab-foundation",
    postedByAdmin: true,
    authorName: "Academy Admin",
    category: "COURSE_ANNOUNCEMENT",
    title: "Free Maktab batch — orientation call",
    body: "New students please join the orientation call link sent by email before your first class.",
  },
  {
    id: "seed-demo-course-announcement-10",
    courseId: "qiraat-advanced",
    teacherId: "9",
    authorName: "Qari Tariq Ansari",
    category: "GENERAL_NOTICE",
    title: "Advanced recitation assessment slots",
    body: "Book your one-to-one assessment slot for Warsh practice by replying to this announcement.",
  },
];

export const demoContactInquiries: DemoContactInquiry[] = [
  {
    id: "seed-demo-contact-1",
    name: "Amina Khan",
    email: "demo-contact-pending-1@seed.local",
    phone: "919911110001",
    message:
      "Assalamu Alaikum. I would like to know the schedule for the sisters Nazira batch and whether recordings are available.",
  },
  {
    id: "seed-demo-contact-2",
    name: "Demo Student 04",
    email: "demo-student-04@seed.local",
    phone: "919900000004",
    studentId: "04",
    message:
      "I submitted my enrollment fee for Quran Nazira but have not heard back. Can you confirm it was received?",
  },
  {
    id: "seed-demo-contact-3",
    name: "Yusuf Ali",
    email: "demo-contact-replied-1@seed.local",
    phone: "919911110003",
    message: "Do you offer a combined Hifz and Tajweed track for working professionals?",
    reply:
      "Wa alaikum assalam. We offer separate tracks that can be taken sequentially. Hifz Foundation runs in the evening; Tajweed Intensive is a shorter program you can join after Nazira.",
    repliedByAdminIndex: 1,
  },
  {
    id: "seed-demo-contact-4",
    name: "Fatima Begum",
    email: "demo-contact-replied-2@seed.local",
    phone: "919911110004",
    message: "What documents are needed for children's enrollment?",
    reply:
      "For children's Nazira we need the parent/guardian name, student date of birth, and a WhatsApp number for class reminders. No formal documents are required for online enrollment.",
    repliedByAdminIndex: 1,
  },
  {
    id: "seed-demo-contact-5",
    name: "Demo Student 11",
    email: "demo-student-11@seed.local",
    phone: "919900000011",
    studentId: "11",
    message:
      "Can I switch from the general Nazira batch to the sisters batch mid-term?",
  },
  {
    id: "seed-demo-contact-6",
    name: "Guest Visitor",
    email: "guest-contact@example.com",
    phone: "919911110006",
    message: "Is the Maktab Foundation program really free? How do I register?",
  },
  {
    id: "seed-demo-contact-7",
    name: "Khurshid Ahmad",
    email: "demo-contact-replied-3@seed.local",
    phone: "919911110007",
    message: "We are a small masjid committee interested in group enrollment for 15 students.",
    reply:
      "JazakAllah khair for reaching out. Please share your preferred courses and approximate ages — we can arrange a group orientation and discuss fee structure for bulk enrollment.",
    repliedByAdminIndex: 1,
  },
  {
    id: "seed-demo-contact-8",
    name: "Demo Student 26",
    email: "demo-student-26@seed.local",
    phone: "91991000026",
    studentId: "26",
    message: "I completed Maktab Foundation — which paid course should I take next?",
  },
];

export type DemoBook = {
  id: string;
  title: string;
  author: string;
  description: string;
  priceInrPaise: number;
  status: BookStatus;
  published: boolean;
};

export const demoBooks: DemoBook[] = [
  {
    id: "seed-demo-book-1",
    title: "Tafseer Ibn Kathir (English - 10 Volumes)",
    author: "Hafiz Ibn Kathir",
    description: "The most widely recognized and accepted explanation of the Quran in the world. Features full Arabic text, English translation, and comprehensive commentary.",
    priceInrPaise: 4500_00,
    status: "AVAILABLE",
    published: true,
  },
  {
    id: "seed-demo-book-2",
    title: "Riyad us Saliheen (Gardens of the Righteous)",
    author: "Imam An-Nawawi",
    description: "A highly acclaimed collection of authentic Ahadith compiled by Imam An-Nawawi. Essential reading for every Muslim household.",
    priceInrPaise: 850_00,
    status: "AVAILABLE",
    published: true,
  },
  {
    id: "seed-demo-book-3",
    title: "Al-Adab Al-Mufrad (A Code for Everyday Living)",
    author: "Imam Al-Bukhari",
    description: "A topical collection of Ahadith addressing moral behavior, good manners, and family relations.",
    priceInrPaise: 650_00,
    status: "AVAILABLE",
    published: true,
  },
  {
    id: "seed-demo-book-4",
    title: "The Sealed Nectar (Ar-Raheeq Al-Makhtum)",
    author: "Safi-ur-Rahman Al-Mubarakpuri",
    description: "An authoritative biography of the Prophet Muhammad (Peace Be Upon Him). Award-winning historical analysis of the Seerah.",
    priceInrPaise: 550_00,
    status: "OUT_OF_STOCK",
    published: true,
  },
  {
    id: "seed-demo-book-5",
    title: "Fortress of the Muslim (Hisnul Muslim)",
    author: "Sa'id bin Ali bin Wahf Al-Qahtani",
    description: "A pocket-sized booklet consisting of authentic supplications (Duas) for everyday use.",
    priceInrPaise: 150_00,
    status: "AVAILABLE",
    published: true,
  },
  {
    id: "seed-demo-book-6",
    title: "Qasas ul Anbiya (Stories of the Prophets)",
    author: "Hafiz Ibn Kathir",
    description: "Detailed historical accounts of the Prophets mentioned in the Quran and Sunnah.",
    priceInrPaise: 950_00,
    status: "COMING_SOON",
    published: true,
  },
];
