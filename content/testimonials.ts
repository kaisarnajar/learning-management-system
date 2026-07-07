export type Testimonial = {
  id: string;
  name: string;
  location: string;
  course: string;
  quote: string;
  initials: string;
  rating?: number;
};

export const studentTestimonials: Testimonial[] = [
  {
    id: "1",
    name: "Ayesha Bhat",
    location: "Srinagar, J&K",
    course: "Tajweed",
    initials: "AB",
    quote:
      "Alhamdulillah, my recitation improved within weeks. The teachers correct every mistake with patience, and classes after Isha fit perfectly with my routine.",
    rating: 5,
  },
  {
    id: "2",
    name: "Mohammad Idrees",
    location: "Baramulla, J&K",
    course: "Hifz",
    initials: "MI",
    quote:
      "The Hifz program is well structured—daily targets, revision, and regular checks. I feel supported and accountable, even while studying from home.",
    rating: 5,
  },
  {
    id: "3",
    name: "Fatima Jan",
    location: "Anantnag, J&K",
    course: "Arabic Basics",
    initials: "FJ",
    quote:
      "I joined with very little Arabic. The lessons are clear, step by step, and rooted in proper scholarship. The Academy is sincere about student progress.",
    rating: 4,
  },
  {
    id: "4",
    name: "Omar Farooq",
    location: "Pulwama, J&K",
    course: "Quran & Tafsir",
    initials: "OF",
    quote:
      "What I appreciate most is the adab in teaching and the focus on understanding, not rushing through the text. The online setup is stable and easy to follow.",
    rating: 5,
  },
  {
    id: "5",
    name: "Kulsum Akhtar",
    location: "Shopian, J&K",
    course: "Tajweed",
    initials: "KA",
    quote:
      "As a working mother, evening classes after Isha are a blessing. My children see me learning, and the academy’s reminders keep me consistent with revision.",
    rating: 4,
  },
  {
    id: "6",
    name: "Bilal Ahmad",
    location: "Budgam, J&K",
    course: "Islamic Studies",
    initials: "BA",
    quote:
      "I completed my course and received a certificate that reflects real effort. The admin team and teachers are responsive, and payment verification was handled fairly.",
    rating: 5,
  },
  {
    id: "7",
    name: "Hafsa Nazir",
    location: "New York, USA",
    course: "Sisters Nazira",
    initials: "HN",
    quote:
      "The sisters batch gave me a comfortable space to learn without hesitation. Ustadha Fatima’s corrections are gentle but precise.",
    rating: 5,
  },
  {
    id: "8",
    name: "Junaid Mir",
    location: "Ganderbal, J&K",
    course: "Tafsir",
    initials: "JM",
    quote:
      "Juz Amma Tafsir connected the surahs I recite daily with their meanings. The teacher references classical tafsir without overwhelming beginners.",
    rating: 5,
  },
  {
    id: "9",
    name: "Samreen Akhter",
    location: "Srinagar, J&K",
    course: "Children's Program",
    initials: "SA",
    quote:
      "Both my children joined the Nazira class. Short sessions, clear homework, and weekly parent updates make it easy to support them at home.",
    rating: 4,
  },
  {
    id: "10",
    name: "Irfan Nazir",
    location: "Baramulla, J&K",
    course: "Qiraat",
    initials: "IN",
    quote:
      "The advanced Qiraat workshop pushed me beyond basic Tajweed. Live recitation feedback from Qari Tariq was invaluable.",
    rating: 5,
  },
];
