/** Shared password for all demo teacher accounts (local / QA only). */
export const DEMO_TEACHER_PASSWORD = "Teacher@2026";

export type Teacher = {
  id: string;
  name: string;
  email: string;
  specialization: string;
  bio: string;
  initials: string;
};

export const teachers: Teacher[] = [
  {
    id: "1",
    name: "Moulana Ibrahim Khan",
    email: "ibrahim.khan@teachers.academy.local",
    specialization: "Quran & Tajweed",
    bio: "Qualified instructor with 15 years of teaching experience in Quran recitation and Tajweed.",
    initials: "IK",
  },
  {
    id: "2",
    name: "Moulana Yusuf Ahmed",
    email: "yusuf.ahmed@teachers.academy.local",
    specialization: "Hifz & Qiraat",
    bio: "Certified Hifz supervisor who has guided over 200 students through complete Quran memorization.",
    initials: "YA",
  },
  {
    id: "3",
    name: "Moulana Farid Hassan",
    email: "farid.hassan@teachers.academy.local",
    specialization: "Arabic & Nahw",
    bio: "Specializes in classical Arabic grammar and teaches advanced Nahw and Sarf to senior students.",
    initials: "FH",
  },
  {
    id: "4",
    name: "Moulana Abdul Rahman",
    email: "abdul.rahman@teachers.academy.local",
    specialization: "Fiqh & Islamic Studies",
    bio: "Experienced in Islamic law and daily practice, with clear guidance for students around the world.",
    initials: "AR",
  },
  {
    id: "5",
    name: "Ustadha Fatima Siddiqui",
    email: "fatima.siddiqui@teachers.academy.local",
    specialization: "Women's Quran Classes",
    bio: "Dedicated instructor for sisters-only classes, covering Nazira, Tajweed, and basic Islamic etiquette.",
    initials: "FS",
  },
  {
    id: "6",
    name: "Moulana Hamza Malik",
    email: "hamza.malik@teachers.academy.local",
    specialization: "Seerah & Youth Programs",
    bio: "Engaging educator who leads youth circles and Seerah study groups for ages 10–18.",
    initials: "HM",
  },
  {
    id: "7",
    name: "Moulana Saeedullah Mir",
    email: "saeedullah.mir@teachers.academy.local",
    specialization: "Tafsir & Quranic Sciences",
    bio: "Teaches Tafsir with emphasis on classical commentaries and practical lessons for daily life.",
    initials: "SM",
  },
  {
    id: "8",
    name: "Ustadha Khadija Rahman",
    email: "khadija.rahman@teachers.academy.local",
    specialization: "Children's Quran Programs",
    bio: "Patient instructor for young learners, using structured Nazira methods suited to ages 6–12.",
    initials: "KR",
  },
  {
    id: "9",
    name: "Qari Tariq Ansari",
    email: "tariq.ansari@teachers.academy.local",
    specialization: "Qiraat & Advanced Recitation",
    bio: "Certified Qari who coaches advanced students in multiple Qiraat and performance-level Tajweed.",
    initials: "TA",
  },
  {
    id: "10",
    name: "Ustadha Amna Qureshi",
    email: "amna.qureshi@teachers.academy.local",
    specialization: "Sisters Tajweed Circle",
    bio: "Leads evening Tajweed circles for sisters with live correction and weekly revision plans.",
    initials: "AQ",
  },
  {
    id: "11",
    name: "Moulana Zain Ul Abideen",
    email: "zain.abideen@teachers.academy.local",
    specialization: "Islamic History & Tarikh",
    bio: "Covers the lives of the Khulafa Rashidun and major events with primary-source references.",
    initials: "ZA",
  },
  {
    id: "12",
    name: "Hafiz Bilal Wani",
    email: "bilal.wani@teachers.academy.local",
    specialization: "Maktab & Beginner Literacy",
    bio: "Runs foundational literacy classes for new Muslims and adults starting their Quran journey.",
    initials: "BW",
  },
];
