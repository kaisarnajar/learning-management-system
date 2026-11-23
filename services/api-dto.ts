import type {
  Book,
  Course,
  CoursePaymentSubmission,
  Enrollment,
  FatwaQuestion,
  PaymentRecord,
  Teacher,
  UserCartItem,
} from "@prisma/client";
import { sanitizeRichText } from "@/services/rich-text";

/**
 * Response projections for the mobile API (/api/v1). Routes map database rows
 * through these helpers so the same shape is produced everywhere and internal
 * columns (soft-delete and void bookkeeping, teacher contact details) never
 * leak into a student's response.
 */

export function toCartItemDto(item: UserCartItem & { book: Book }) {
  const { book } = item;
  return {
    bookId: book.id,
    title: book.title,
    author: book.author,
    priceInrPaise: book.priceInrPaise,
    mrpInrPaise: book.mrpInrPaise,
    imagePath: book.imagePath,
    quantity: item.quantity,
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      priceInrPaise: book.priceInrPaise,
      mrpInrPaise: book.mrpInrPaise,
      status: book.status,
      imagePath: book.imagePath,
      category: "Islamic Books",
    },
  };
}

export function toCartResponse(items: Array<UserCartItem & { book: Book }>) {
  const dtos = items.map(toCartItemDto);
  return { success: true as const, data: dtos, items: dtos };
}

export function toTeacherSummaryDto(teacher: Teacher) {
  return {
    id: teacher.id,
    name: teacher.name,
    specialization: teacher.specialization,
    bio: teacher.bio,
    initials: teacher.initials,
    imageUrl: teacher.imageUrl,
  };
}

export function toEnrollmentDto(
  enrollment: Enrollment & { user?: { id: string; name: string | null; email: string; registrationNumber: string | null } },
  course: (Course & { teacher: Teacher | null }) | null,
) {
  return {
    ...enrollment,
    course: course ? { ...course, teacher: course.teacher ? toTeacherSummaryDto(course.teacher) : null } : null,
  };
}

export function toPaymentSubmissionDto(submission: CoursePaymentSubmission) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deletedAt, ...rest } = submission;
  return rest;
}

export function toPaymentRecordDto(record: PaymentRecord) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { voidedAt, voidReason, voidedById, ...rest } = record;
  return rest;
}

// ---------------------------------------------------------------------------
// Public content (no sign-in needed). Internal columns never leave the server:
// teacher e-mail and account links, book cost price, stock and weight, the
// e-mail address of whoever asked a fatwa.
// ---------------------------------------------------------------------------

export function toPublicCourseDto(course: Course & { teacher?: Teacher | null }) {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    startDate: course.startDate,
    duration: course.duration,
    level: course.level,
    category: course.category,
    status: course.status,
    priceInrPaise: course.priceInrPaise,
    monthlyFeeInrPaise: course.monthlyFeeInrPaise,
    feeFrequency: course.feeFrequency,
    teacherId: course.teacherId,
    teacher: course.teacher ? toTeacherSummaryDto(course.teacher) : null,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

export function toPublicBookDto(
  book: Pick<Book, "id" | "title" | "author" | "description" | "priceInrPaise" | "mrpInrPaise" | "status" | "imagePath" | "createdAt" | "updatedAt">,
) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    priceInrPaise: book.priceInrPaise,
    mrpInrPaise: book.mrpInrPaise,
    status: book.status,
    imagePath: book.imagePath,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}

export function toPublicFatwaDto(fatwa: FatwaQuestion) {
  return {
    id: fatwa.id,
    title: fatwa.title,
    question: fatwa.question,
    category: fatwa.category,
    // Rich text written in the admin editor, sanitised exactly like the web page renders it.
    answer: fatwa.answer ? sanitizeRichText(fatwa.answer) : null,
    // The web page shows "Asked by <name>" unless the asker chose "Anonymous".
    askerName: fatwa.askerName,
    answeredAt: fatwa.answeredAt,
    createdAt: fatwa.createdAt,
  };
}
