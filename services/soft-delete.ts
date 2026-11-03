/**
 * Where-fragments that hide voided / soft-deleted rows from every read path.
 *
 * Financial and user records are never hard-deleted (see docs/OPERATIONS.md):
 * PaymentRecord gets `voidedAt`, CoursePaymentSubmission / BookOrder / User get
 * `deletedAt`. Every list, count and aggregate must spread one of these in.
 */
export const NOT_VOIDED = { voidedAt: null } as const;
export const NOT_DELETED = { deletedAt: null } as const;
