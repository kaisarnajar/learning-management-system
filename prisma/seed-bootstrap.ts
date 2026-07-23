import type { PrismaClient } from "@prisma/client";
import { getDefaultFeesForLevel } from '../services/course-pricing';
import { PAYMENT_SETTINGS_ID } from '../services/payment-settings';

import { courses } from "../content/courses";
const libraryItems = [
  { id: "1", title: "Noorani Qaida", author: "Moulana Noor Muhammad", topic: "Quran", level: "Beginner", language: "Urdu" },
  { id: "2", title: "Tajweed Rules Explained", author: "Sheikh Ahmad Ali", topic: "Tajweed", level: "Intermediate", language: "English" },
  { id: "3", title: "Introduction to Islamic Law", author: "Various Scholars", topic: "Fiqh", level: "Advanced", language: "Urdu" },
  { id: "4", title: "Stories of the Prophets", author: "Ibn Kathir (abridged)", topic: "Seerah", level: "Beginner", language: "English" },
  { id: "5", title: "Arabic Made Easy", author: "Dr. V. Abdur Rahim", topic: "Arabic Language", level: "Beginner", language: "English" },
  { id: "6", title: "Riyad us-Saliheen", author: "Imam An-Nawawi", topic: "Hadith", level: "Intermediate", language: "Other" },
  { id: "7", title: "Essentials of Faith and Worship", author: "Compiled Reader", topic: "Islam", level: "Beginner", language: "Urdu" },
  { id: "8", title: "Tafsir Ibn Kathir (Selected Surahs)", author: "Ibn Kathir", topic: "Quran", level: "Advanced", language: "Arabic" },
  { id: "9", title: "Forty Hadith of Imam Nawawi", author: "Imam An-Nawawi", topic: "Hadith", level: "Beginner", language: "English" },
  { id: "10", title: "Madinah Arabic Reader — Book 1", author: "Dr. V. Abdur Rahim", topic: "Arabic Language", level: "Beginner", language: "English" },
  { id: "11", title: "The Sealed Nectar (Ar-Raheeq Al-Makhtum)", author: "Safi-ur-Rahman al-Mubarakpuri", topic: "Seerah", level: "Intermediate", language: "English" },
  { id: "12", title: "Qiraat al-Ashr — Introduction", author: "Compiled Reference", topic: "Qiraat", level: "Advanced", language: "Arabic" },
];
import { studentTestimonials } from "../content/testimonials";
import { teachers } from "../content/teachers";
import { seedCourseStatus } from "./seed-helpers";
import { BRAND_CONFIG } from "../config/brand";

/** Minimal bootstrap data: courses, teachers, library, homepage testimonials. */
export async function seedBootstrap(prisma: PrismaClient) {
  for (const teacher of teachers) {
    await prisma.teacher.upsert({
      where: { id: teacher.id },
      create: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        specialization: teacher.specialization,
        bio: teacher.bio,
        initials: teacher.initials,
        published: true,
      },
      update: {
        name: teacher.name,
        email: teacher.email,
        specialization: teacher.specialization,
        bio: teacher.bio,
        initials: teacher.initials,
      },
    });
  }

  for (const [index, course] of courses.entries()) {
    const fees = getDefaultFeesForLevel(course.level);
    const featuredAt = new Date("2026-01-01T00:00:00.000Z");
    featuredAt.setMinutes(index);
    const startDate = course.startDate;
    const status = seedCourseStatus(course.id);
    await prisma.course.upsert({
      where: { id: course.id },
      create: {
        id: course.id,
        title: course.title,
        description: course.description,
        startDate,
        duration: course.duration,
        level: course.level,
        category: course.category,
        priceInrPaise: course.priceInrPaise,
        monthlyFeeInrPaise: fees.monthlyFeePaise,
        teacherId: course.teacherId,
        status,
        featuredOnHomepage: true,
        featuredAt,
        feeFrequency: "MONTHLY",
      },
      update: {
        title: course.title,
        description: course.description,
        startDate,
        duration: course.duration,
        level: course.level,
        category: course.category,
        priceInrPaise: course.priceInrPaise,
        monthlyFeeInrPaise: fees.monthlyFeePaise,
        teacherId: course.teacherId,
        status,
        featuredOnHomepage: true,
        feeFrequency: "MONTHLY",
      },
    });
  }

  for (const [index, item] of libraryItems.entries()) {
    const featuredAt = new Date("2026-01-02T00:00:00.000Z");
    featuredAt.setMinutes(index);
    const isFeatured = index < 4;
    await prisma.libraryItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        title: item.title,
        author: item.author,
        topic: item.topic,
        level: item.level,
        language: item.language,
        published: true,
        featuredOnHomepage: isFeatured,
        featuredAt: isFeatured ? featuredAt : null,
      },
      update: {
        title: item.title,
        author: item.author,
        topic: item.topic,
        level: item.level,
        language: item.language,
        featuredOnHomepage: isFeatured,
      },
    });
  }

  const featuredAtBase = new Date("2026-01-01T00:00:00.000Z");
  for (const [index, testimonial] of studentTestimonials.entries()) {
    const userId = `seed-testimonial-user-${testimonial.id}`;
    const reviewId = `seed-testimonial-${testimonial.id}`;
    const email = `seed-testimonial-${testimonial.id}@seed.local`;

    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        name: testimonial.name,
      },
      update: {
        name: testimonial.name,
      },
    });

    await prisma.studentReview.upsert({
      where: { id: reviewId },
      create: {
        id: reviewId,
        userId,
        quote: testimonial.quote,
        course: testimonial.course,
        location: testimonial.location,
        rating: testimonial.rating ?? 5,
        status: "APPROVED",
        featuredOnHomepage: true,
        featuredAt: new Date(featuredAtBase.getTime() + index * 60_000),
      },
      update: {
        quote: testimonial.quote,
        course: testimonial.course,
        location: testimonial.location,
        rating: testimonial.rating ?? 5,
        status: "APPROVED",
        featuredOnHomepage: true,
      },
    });
  }



  await prisma.paymentSettings.upsert({
    where: { id: PAYMENT_SETTINGS_ID },
    create: {
      id: PAYMENT_SETTINGS_ID,
      upiId: "darsequran.demo@oksbi",
      upiNumber: "9876543210",
      upiPayeeName: BRAND_CONFIG.name,
      bankAccountName: BRAND_CONFIG.name,
      bankName: "State Bank of India",
      bankAccountNumber: "123456789012",
      bankIfsc: "SBIN0001234",
      bankBranch: "Srinagar Main Branch",
      feeWaiverEnabled: true,
      includeGstByDefault: false,
    },
    update: {
      upiId: "darsequran.demo@oksbi",
      upiNumber: "9876543210",
      upiPayeeName: BRAND_CONFIG.name,
      bankAccountName: BRAND_CONFIG.name,
      bankName: "State Bank of India",
      bankAccountNumber: "123456789012",
      bankIfsc: "SBIN0001234",
      bankBranch: "Srinagar Main Branch",
      feeWaiverEnabled: true,
      includeGstByDefault: false,
    },
  });

  const defaultCoupons = [
    {
      id: "coupon-welcome50",
      code: "WELCOME50",
      type: "DEFAULT" as const,
      percentage: 50,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validUntil: new Date("2027-12-31T23:59:59.000Z"),
      applyToEnrollment: true,
      applyToCourse: true,
      isActive: true,
    },
    {
      id: "coupon-earlybird20",
      code: "EARLYBIRD20",
      type: "DEFAULT" as const,
      percentage: 20,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validUntil: new Date("2027-12-31T23:59:59.000Z"),
      applyToEnrollment: false,
      applyToCourse: true,
      isActive: true,
    },
    {
      id: "coupon-scholarship100",
      code: "SCHOLARSHIP100",
      type: "DEFAULT" as const,
      percentage: 100,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validUntil: new Date("2027-12-31T23:59:59.000Z"),
      applyToEnrollment: true,
      applyToCourse: true,
      isActive: true,
    },
  ];

  for (const c of defaultCoupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      create: c,
      update: c,
    });
  }

  const shippingSlabs = [
    { id: "slab-1", minWeightGrams: 0, maxWeightGrams: 500, chargeInrPaise: 5000 },
    { id: "slab-2", minWeightGrams: 501, maxWeightGrams: 1000, chargeInrPaise: 8000 },
    { id: "slab-3", minWeightGrams: 1001, maxWeightGrams: 2000, chargeInrPaise: 12000 },
    { id: "slab-4", minWeightGrams: 2001, maxWeightGrams: 5000, chargeInrPaise: 25000 },
  ];

  for (const slab of shippingSlabs) {
    await prisma.shippingChargeSlab.upsert({
      where: { id: slab.id },
      create: {
        id: slab.id,
        minWeightGrams: slab.minWeightGrams,
        maxWeightGrams: slab.maxWeightGrams,
        chargeInrPaise: slab.chargeInrPaise,
      },
      update: {
        minWeightGrams: slab.minWeightGrams,
        maxWeightGrams: slab.maxWeightGrams,
        chargeInrPaise: slab.chargeInrPaise,
      },
    });
  }
}
