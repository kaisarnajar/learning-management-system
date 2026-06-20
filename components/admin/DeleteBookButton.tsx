"use client";

import { deleteBook } from "@/app/admin/bookstore/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

export function DeleteBookButton({
  bookId,
  bookTitle,
}: {
  bookId: string;
  bookTitle: string;
}) {
  return (
    <DeleteActionButton
      action={deleteBook.bind(null, bookId)}
      itemName={bookTitle}
      onSuccessRedirect="/admin/bookstore?deleted=1"
    />
  );
}
