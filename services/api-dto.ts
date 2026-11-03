import type {
  Book,
  Course,
  CoursePaymentSubmission,
  Enrollment,
  PaymentRecord,
  Teacher,
  UserCartItem,
} from "@prisma/client";

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
