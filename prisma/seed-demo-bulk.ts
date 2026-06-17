import type { PrismaClient } from "@prisma/client";
import { courses } from "../content/courses";
import { demoBlogPosts, demoBooks } from "../content/demo-content";
import { teachers } from "../content/teachers";
import {
  EXPENSE_CATEGORY_MARKETING,
  EXPENSE_CATEGORY_OFFICE_MISC,
  EXPENSE_CATEGORY_OTHER,
  EXPENSE_CATEGORY_SOFTWARE_TOOLS,
  EXPENSE_CATEGORY_TEACHER_SALARY,
  EXPENSE_CATEGORY_WEBSITE_HOSTING,
} from "../lib/expense-categories";
import { demoStudentUserId } from "./seed-helpers";
import { writeDemoPngFile } from "./seed-demo-assets";

const BULK_MONTHS = ["01", "02", "03", "04", "05", "06"] as const;
const BULK_YEAR = "2026";

const FATWA_CATEGORIES = ["Fiqh", "Tajweed", "Quran", "Hadith", "Islam", "Other"] as const;

const BULK_EXPENSE_MISC = [
  { category: EXPENSE_CATEGORY_WEBSITE_HOSTING, amountInrPaise: 1_200_00, description: "Hosting renewal" },
  { category: EXPENSE_CATEGORY_MARKETING, amountInrPaise: 2_500_00, description: "Ramadan enrollment ads" },
  { category: EXPENSE_CATEGORY_SOFTWARE_TOOLS, amountInrPaise: 800_00, description: "Zoom Pro subscription" },
  { category: EXPENSE_CATEGORY_OFFICE_MISC, amountInrPaise: 450_00, description: "Stationery and printing" },
  { category: EXPENSE_CATEGORY_OTHER, amountInrPaise: 1_000_00, description: "Miscellaneous operational cost" },
] as const;

/** Blog images for published posts (BlogImage table). */
export async function seedDemoBlogImages(prisma: PrismaClient) {
  const publishedPosts = demoBlogPosts.filter(
    (post) => post.published && post.approvalStatus === "APPROVED",
  );

  for (const post of publishedPosts) {
    for (let imageIndex = 0; imageIndex < 2; imageIndex += 1) {
      const id = `seed-demo-blog-image-${post.id}-${imageIndex + 1}`;
      const imagePath = `/uploads/blogs/${post.id}-demo-${imageIndex + 1}.png`;
      await writeDemoPngFile(imagePath);

      await prisma.blogImage.upsert({
        where: { id },
        create: {
          id,
          blogPostId: post.id,
          imagePath,
          caption: `Demo image ${imageIndex + 1} for ${post.title}`,
          sortOrder: imageIndex,
        },
        update: {
          imagePath,
          caption: `Demo image ${imageIndex + 1} for ${post.title}`,
          sortOrder: imageIndex,
        },
      });
    }
  }
}

/** Teacher salaries (6 months × all teachers) plus recurring misc expenses. */
export async function seedDemoBulkExpenses(prisma: PrismaClient) {
  const salaryBaseByTeacher: Record<string, number> = {
    "1": 25_000_00,
    "2": 22_000_00,
    "3": 20_000_00,
    "4": 21_000_00,
    "5": 19_000_00,
    "6": 18_000_00,
    "7": 23_000_00,
    "8": 18_500_00,
    "9": 26_000_00,
    "10": 19_500_00,
    "11": 17_500_00,
    "12": 20_500_00,
  };

  for (const teacher of teachers) {
    const base = salaryBaseByTeacher[teacher.id] ?? 20_000_00;
    for (const month of BULK_MONTHS) {
      const id = `seed-demo-expense-salary-${teacher.id}-${BULK_YEAR}-${month}`;
      await prisma.expense.upsert({
        where: { id },
        create: {
          id,
          category: EXPENSE_CATEGORY_TEACHER_SALARY,
          teacherId: teacher.id,
          amountInrPaise: base,
          paidAt: new Date(`${BULK_YEAR}-${month}-01T12:00:00.000Z`),
          description: `${month}/${BULK_YEAR} salary — ${teacher.name}`,
        },
        update: {
          category: EXPENSE_CATEGORY_TEACHER_SALARY,
          teacherId: teacher.id,
          amountInrPaise: base,
          paidAt: new Date(`${BULK_YEAR}-${month}-01T12:00:00.000Z`),
          description: `${month}/${BULK_YEAR} salary — ${teacher.name}`,
        },
      });
    }
  }

  for (const [monthIndex, month] of BULK_MONTHS.entries()) {
    for (const [miscIndex, misc] of BULK_EXPENSE_MISC.entries()) {
      const id = `seed-demo-expense-misc-${month}-${miscIndex + 1}`;
      await prisma.expense.upsert({
        where: { id },
        create: {
          id,
          category: misc.category,
          teacherId: null,
          amountInrPaise: misc.amountInrPaise,
          paidAt: new Date(`${BULK_YEAR}-${month}-10T09:00:00.000Z`),
          description: `${misc.description} (${month}/${BULK_YEAR})`,
        },
        update: {
          category: misc.category,
          amountInrPaise: misc.amountInrPaise,
          paidAt: new Date(`${BULK_YEAR}-${month}-10T09:00:00.000Z`),
          description: `${misc.description} (${month}/${BULK_YEAR})`,
        },
      });
    }
  }
}

/** Extra notifications for active students (StudentNotification table). */
export async function seedDemoBulkNotifications(prisma: PrismaClient) {
  const activeEnrollments = await prisma.enrollment.findMany({
    where: { status: "active" },
    select: { id: true, userId: true, courseId: true },
    take: 40,
  });

  const courseTitles = new Map(
    (await prisma.course.findMany({ select: { id: true, title: true } })).map((c) => [
      c.id,
      c.title,
    ]),
  );

  for (const [index, enrollment] of activeEnrollments.entries()) {
    const courseTitle = courseTitles.get(enrollment.courseId) ?? enrollment.courseId;
    const sourceId = enrollment.id;

    await prisma.studentNotification.upsert({
      where: {
        userId_type_sourceId: {
          userId: enrollment.userId,
          type: "ENROLLMENT_APPROVED",
          sourceId,
        },
      },
      create: {
        id: `seed-demo-bulk-notification-enrollment-${index + 1}`,
        userId: enrollment.userId,
        type: "ENROLLMENT_APPROVED",
        title: `Enrollment approved — ${courseTitle}`,
        body: "You can now access your course from My Courses.",
        href: "/profile/courses",
        sourceType: "Enrollment",
        sourceId,
        readAt: index % 3 === 0 ? new Date("2026-02-01T10:00:00.000Z") : null,
        createdAt: new Date(`2026-01-${String((index % 28) + 1).padStart(2, "0")}T10:00:00.000Z`),
      },
      update: {
        title: `Enrollment approved — ${courseTitle}`,
        body: "You can now access your course from My Courses.",
        href: "/profile/courses",
      },
    });
  }
}

/** Additional fatwa questions (pending and answered). */
export async function seedDemoBulkFatwa(prisma: PrismaClient) {
  const answererId = "seed-demo-teacher-user-1";

  for (let index = 1; index <= 20; index += 1) {
    const id = `seed-demo-fatwa-bulk-${String(index).padStart(2, "0")}`;
    const answered = index % 3 !== 0;
    const createdAt = new Date(`2026-01-${String((index % 28) + 1).padStart(2, "0")}T08:00:00.000Z`);
    const answeredAt = answered ? new Date(createdAt.getTime() + 86_400_000) : null;
    const category = FATWA_CATEGORIES[index % FATWA_CATEGORIES.length] ?? "Other";
    const studentId = index % 4 === 0 ? String((index % 25) + 1).padStart(2, "0") : null;

    await prisma.fatwaQuestion.upsert({
      where: { id },
      create: {
        id,
        userId: studentId ? demoStudentUserId(studentId) : null,
        askerName: studentId ? `Demo Student ${studentId}` : `Guest ${index}`,
        askerEmail: studentId
          ? `demo-student-${studentId}@seed.local`
          : `demo-fatwa-bulk-${index}@seed.local`,
        category,
        title: `Bulk demo fatwa question #${index}`,
        question: `This is auto-generated fatwa question ${index} for local QA pagination and listing.`,
        answer: answered
          ? "This is a sample answer provided by the academy scholars for demo purposes."
          : null,
        answeredAt,
        answeredById: answered ? answererId : null,
        featuredOnHomepage: answered && index <= 8,
        featuredAt: answered && index <= 8 ? answeredAt : null,
        createdAt,
        updatedAt: answeredAt ?? createdAt,
      },
      update: {
        category,
        title: `Bulk demo fatwa question #${index}`,
        question: `This is auto-generated fatwa question ${index} for local QA pagination and listing.`,
        answer: answered
          ? "This is a sample answer provided by the academy scholars for demo purposes."
          : null,
        answeredAt,
        answeredById: answered ? answererId : null,
      },
    });
  }
}

/** Additional contact inquiries (pending and replied). */
export async function seedDemoBulkContactInquiries(prisma: PrismaClient) {
  for (let index = 1; index <= 20; index += 1) {
    const id = `seed-demo-contact-bulk-${String(index).padStart(2, "0")}`;
    const replied = index % 4 === 0;
    const studentId = index % 5 === 0 ? String((index % 25) + 1).padStart(2, "0") : null;
    const createdAt = new Date(`2026-02-${String((index % 28) + 1).padStart(2, "0")}T11:00:00.000Z`);
    const repliedAt = replied ? new Date(createdAt.getTime() + 86_400_000) : null;

    await prisma.contactInquiry.upsert({
      where: { id },
      create: {
        id,
        userId: studentId ? demoStudentUserId(studentId) : null,
        name: studentId ? `Demo Student ${studentId}` : `Visitor ${index}`,
        email: studentId
          ? `demo-student-${studentId}@seed.local`
          : `demo-contact-bulk-${index}@seed.local`,
        phone: `9199222${String(index).padStart(5, "0")}`,
        message: `Bulk demo contact message #${index}: Please share course timings and fee details.`,
        reply: replied
          ? "Wa alaikum assalam. Our team will share the schedule by email within one working day."
          : null,
        repliedAt,
        repliedById: replied ? "seed-demo-admin-user-1" : null,
        createdAt,
        updatedAt: repliedAt ?? createdAt,
      },
      update: {
        message: `Bulk demo contact message #${index}: Please share course timings and fee details.`,
        reply: replied
          ? "Wa alaikum assalam. Our team will share the schedule by email within one working day."
          : null,
        repliedAt,
        repliedById: replied ? "seed-demo-admin-user-1" : null,
      },
    });
  }
}

/** Additional site announcements. */
export async function seedDemoBulkSiteAnnouncements(prisma: PrismaClient) {
  for (let index = 1; index <= 15; index += 1) {
    const id = `seed-demo-announcement-bulk-${String(index).padStart(2, "0")}`;
    const published = index % 5 !== 0;
    const showOnHomepage = published && index % 3 === 0;
    const createdAt = new Date(`2026-03-${String((index % 28) + 1).padStart(2, "0")}T09:00:00.000Z`);

    await prisma.siteAnnouncement.upsert({
      where: { id },
      create: {
        id,
        title: `Bulk site announcement #${index}`,
        body: `Auto-generated announcement ${index} for homepage and listing QA.`,
        eventDate: `April ${index}, 2026`,
        location: index % 2 === 0 ? "Online" : "Main campus, Srinagar",
        published,
        showOnHomepage,
        createdAt,
        updatedAt: createdAt,
      },
      update: {
        title: `Bulk site announcement #${index}`,
        body: `Auto-generated announcement ${index} for homepage and listing QA.`,
        published,
        showOnHomepage,
      },
    });
  }
}

/** Additional daily inspirations (Quran and Hadith). */
export async function seedDemoBulkDailyInspirations(prisma: PrismaClient) {
  const authorId = "seed-demo-teacher-user-1";

  for (let index = 1; index <= 20; index += 1) {
    const id = `seed-demo-inspiration-bulk-${String(index).padStart(2, "0")}`;
    const kind = index % 2 === 0 ? "HADITH" : "QURAN";
    const published = index % 4 !== 0;
    const updatedAt = new Date(`2026-04-${String((index % 28) + 1).padStart(2, "0")}T07:00:00.000Z`);
    const createdAt = new Date(updatedAt.getTime() - 7 * 86_400_000);

    await prisma.dailyInspiration.upsert({
      where: { id },
      create: {
        id,
        kind,
        arabicText: kind === "QURAN" ? "وَاذْكُرُوا اللَّهَ كَثِيرًا" : "طَلَبُ الْعِلْمِ فَرِيضَةٌ",
        englishTranslation:
          kind === "QURAN"
            ? `Bulk demo Qur'an inspiration #${index}.`
            : `Bulk demo Hadith inspiration #${index}.`,
        reference: kind === "QURAN" ? "Qur'an 33:41" : "Ibn Majah",
        published,
        createdById: authorId,
        createdAt,
        updatedAt,
      },
      update: {
        kind,
        englishTranslation:
          kind === "QURAN"
            ? `Bulk demo Qur'an inspiration #${index}.`
            : `Bulk demo Hadith inspiration #${index}.`,
        published,
        updatedAt,
      },
    });
  }
}

/** Two announcements per course for category and teacher coverage. */
export async function seedDemoBulkCourseAnnouncements(prisma: PrismaClient) {
  const categories = [
    "COURSE_ANNOUNCEMENT",
    "CLASS_SCHEDULE",
    "ASSIGNMENTS_HOMEWORK",
    "STUDY_MATERIALS",
    "EXAMS_TESTS",
    "GENERAL_NOTICE",
  ] as const;

  for (const [courseIndex, course] of courses.entries()) {
    const teacher = teachers[courseIndex % teachers.length];
    for (let slot = 1; slot <= 2; slot += 1) {
      const id = `seed-demo-course-announcement-bulk-${course.id}-${slot}`;
      const category = categories[(courseIndex + slot) % categories.length] ?? "GENERAL_NOTICE";
      const createdAt = new Date(`2026-02-${String(((courseIndex * 2 + slot) % 28) + 1).padStart(2, "0")}T10:00:00.000Z`);

      await prisma.courseAnnouncement.upsert({
        where: { id },
        create: {
          id,
          courseId: course.id,
          teacherId: slot === 2 ? teacher?.id : null,
          postedByAdmin: slot === 1,
          authorName: slot === 1 ? "Academy Admin" : (teacher?.name ?? "Teacher"),
          category,
          title: `${course.title}: Bulk announcement ${slot}`,
          body: `Auto-generated course announcement ${slot} for ${course.title} QA.`,
          createdAt,
          updatedAt: createdAt,
        },
        update: {
          courseId: course.id,
          teacherId: slot === 2 ? teacher?.id : null,
          category,
          title: `${course.title}: Bulk announcement ${slot}`,
          body: `Auto-generated course announcement ${slot} for ${course.title} QA.`,
        },
      });
    }
  }
}

/** Demo password-reset tokens (expired + active) for admin reset flow QA. */
export async function seedDemoPasswordResetTokens(prisma: PrismaClient) {
  await prisma.passwordResetToken.upsert({
    where: { tokenHash: "seed-demo-reset-expired-hash" },
    create: {
      id: "seed-demo-reset-expired",
      email: "demo-student-01@seed.local",
      tokenHash: "seed-demo-reset-expired-hash",
      expiresAt: new Date("2025-01-01T00:00:00.000Z"),
    },
    update: {
      email: "demo-student-01@seed.local",
      expiresAt: new Date("2025-01-01T00:00:00.000Z"),
    },
  });

  await prisma.passwordResetToken.upsert({
    where: { tokenHash: "seed-demo-reset-active-hash" },
    create: {
      id: "seed-demo-reset-active",
      email: "demo-student-02@seed.local",
      tokenHash: "seed-demo-reset-active-hash",
      expiresAt: new Date("2030-12-31T23:59:59.000Z"),
    },
    update: {
      email: "demo-student-02@seed.local",
      expiresAt: new Date("2030-12-31T23:59:59.000Z"),
    },
  });

  await prisma.passwordResetToken.upsert({
    where: { tokenHash: "seed-demo-reset-hashed-sample" },
    create: {
      id: "seed-demo-reset-hashed",
      email: "demo-student-03@seed.local",
      tokenHash: "seed-demo-reset-hashed-sample",
      expiresAt: new Date("2030-06-01T00:00:00.000Z"),
    },
    update: {
      email: "demo-student-03@seed.local",
      expiresAt: new Date("2030-06-01T00:00:00.000Z"),
    },
  });
}

export async function seedDemoBulkBookOrders(prisma: PrismaClient) {
  const statuses: ("PENDING_VERIFICATION" | "APPROVED" | "SHIPPED" | "DECLINED")[] = [
    "APPROVED",
    "SHIPPED",
    "PENDING_VERIFICATION",
    "DECLINED",
  ];
  const orderItems = demoBooks.slice(0, 3);

  for (let index = 1; index <= 10; index += 1) {
    const studentId = demoStudentUserId(String(index).padStart(2, "0"));
    const orderId = `seed-demo-book-order-${index}`;
    const status = statuses[index % statuses.length];
    const createdAt = new Date(`2026-03-${String(index).padStart(2, "0")}T10:00:00.000Z`);

    let totalAmount = 0;
    const itemsData = orderItems.map((b, i) => {
      const quantity = (i % 2) + 1;
      const priceAtPurchaseInrPaise = b.priceInrPaise;
      totalAmount += quantity * priceAtPurchaseInrPaise;
      return {
        id: `${orderId}-item-${i}`,
        bookId: b.id,
        quantity,
        priceAtPurchaseInrPaise,
        createdAt,
      };
    });

    await prisma.bookOrder.upsert({
      where: { id: orderId },
      create: {
        id: orderId,
        userId: studentId,
        totalAmountInrPaise: totalAmount,
        status,
        paymentMethod: "upi",
        upiTransactionId: `DEMOUPI${index}000${index}`,
        notes: index % 3 === 0 ? "Please ship soon." : null,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: itemsData.map(({ id, bookId, quantity, priceAtPurchaseInrPaise, createdAt: itemCreatedAt }) => ({
            id,
            bookId,
            quantity,
            priceAtPurchaseInrPaise,
            createdAt: itemCreatedAt,
          })),
        },
      },
      update: {
        totalAmountInrPaise: totalAmount,
        status,
        paymentMethod: "upi",
        upiTransactionId: `DEMOUPI${index}000${index}`,
        notes: index % 3 === 0 ? "Please ship soon." : null,
      },
    });

    if (status !== "PENDING_VERIFICATION") {
      let notifType: "BOOK_ORDER_APPROVED" | "BOOK_ORDER_SHIPPED" | "BOOK_ORDER_DECLINED" | undefined;
      let notifTitle = "";
      if (status === "APPROVED") {
        notifType = "BOOK_ORDER_APPROVED";
        notifTitle = "Book Order Approved";
      } else if (status === "SHIPPED") {
        notifType = "BOOK_ORDER_SHIPPED";
        notifTitle = "Book Order Shipped";
      } else if (status === "DECLINED") {
        notifType = "BOOK_ORDER_DECLINED";
        notifTitle = "Book Order Declined";
      }

      if (notifType) {
        await prisma.studentNotification.upsert({
          where: { id: `${orderId}-notif` },
          create: {
            id: `${orderId}-notif`,
            userId: studentId,
            type: notifType,
            title: notifTitle,
            body: `Your book order ${orderId} has been ${status.toLowerCase()}.`,
            href: "/profile/cart",
            sourceType: "BookOrder",
            sourceId: orderId,
            createdAt: new Date(createdAt.getTime() + 86400000),
          },
          update: {
            type: notifType,
            title: notifTitle,
            body: `Your book order ${orderId} has been ${status.toLowerCase()}.`,
          },
        });
      }
    }
  }
}

/** Run all bulk seeders that fill tables with large demo datasets. */
export async function seedDemoBulk(prisma: PrismaClient) {
  await seedDemoBlogImages(prisma);
  await seedDemoBulkExpenses(prisma);
  await seedDemoBulkNotifications(prisma);
  await seedDemoBulkFatwa(prisma);
  await seedDemoBulkContactInquiries(prisma);
  await seedDemoBulkSiteAnnouncements(prisma);
  await seedDemoBulkDailyInspirations(prisma);
  await seedDemoBulkCourseAnnouncements(prisma);
  await seedDemoBulkBookOrders(prisma);
  await seedDemoPasswordResetTokens(prisma);
}

export async function logDemoTableCounts(prisma: PrismaClient) {
  const counts = await Promise.all([
    prisma.user.count().then((n) => ["User", n] as const),
    prisma.course.count().then((n) => ["Course", n] as const),
    prisma.teacher.count().then((n) => ["Teacher", n] as const),
    prisma.enrollment.count().then((n) => ["Enrollment", n] as const),
    prisma.paymentRecord.count().then((n) => ["PaymentRecord", n] as const),
    prisma.coursePaymentSubmission.count().then((n) => ["CoursePaymentSubmission", n] as const),
    prisma.expense.count().then((n) => ["Expense", n] as const),
    prisma.libraryItem.count().then((n) => ["LibraryItem", n] as const),
    prisma.studentReview.count().then((n) => ["StudentReview", n] as const),
    prisma.siteAnnouncement.count().then((n) => ["SiteAnnouncement", n] as const),
    prisma.blogPost.count().then((n) => ["BlogPost", n] as const),
    prisma.blogImage.count().then((n) => ["BlogImage", n] as const),
    prisma.dailyInspiration.count().then((n) => ["DailyInspiration", n] as const),
    prisma.fatwaQuestion.count().then((n) => ["FatwaQuestion", n] as const),
    prisma.contactInquiry.count().then((n) => ["ContactInquiry", n] as const),
    prisma.courseAnnouncement.count().then((n) => ["CourseAnnouncement", n] as const),
    prisma.studentNotification.count().then((n) => ["StudentNotification", n] as const),
    prisma.paymentSettings.count().then((n) => ["PaymentSettings", n] as const),
    prisma.socialLinksSettings.count().then((n) => ["SocialLinksSettings", n] as const),
    prisma.passwordResetToken.count().then((n) => ["PasswordResetToken", n] as const),
    prisma.book.count().then((n) => ["Book", n] as const),
    prisma.bookOrder.count().then((n) => ["BookOrder", n] as const),
    prisma.bookOrderItem.count().then((n) => ["BookOrderItem", n] as const),
  ]);

  console.log("Demo table row counts:");
  for (const [table, count] of counts) {
    console.log(`  ${table}: ${count}`);
  }
}
