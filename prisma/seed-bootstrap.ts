import type { PrismaClient } from "@prisma/client";
import { getDefaultFeesForLevel } from "../lib/course-pricing";
import { PAYMENT_SETTINGS_ID } from "../lib/payment-settings";

import { courses } from "../content/courses";
import { libraryItems } from "../content/library";
import { studentTestimonials } from "../content/testimonials";
import { teachers } from "../content/teachers";
import { seedCourseStatus } from "./seed-helpers";

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
      upiPayeeName: "Darse Quran Academy",
      bankAccountName: "Darse Quran Academy",
      bankName: "State Bank of India",
      bankAccountNumber: "123456789012",
      bankIfsc: "SBIN0001234",
      bankBranch: "Srinagar Main Branch",
    },
    update: {
      upiId: "darsequran.demo@oksbi",
      upiPayeeName: "Darse Quran Academy",
      bankAccountName: "Darse Quran Academy",
      bankName: "State Bank of India",
      bankAccountNumber: "123456789012",
      bankIfsc: "SBIN0001234",
      bankBranch: "Srinagar Main Branch",
    },
  });
}
