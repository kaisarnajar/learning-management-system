"use client";

import { useCallback, useState } from "react";
import { prepareDirectUploads, type DirectUploadField } from "@/utils/direct-upload-client";

/**
 * Wraps a form's server action so its files go straight to R2 first
 * (utils/direct-upload-client.ts). Use the returned `formAction` as the
 * form's `action`; `uploadError` is set when a file could not be uploaded and
 * the action was not called.
 */
export function useDirectUploadAction<R>(
  action: (formData: FormData) => Promise<R>,
  fields: readonly DirectUploadField[],
) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formAction = useCallback(
    async (formData: FormData): Promise<void> => {
      setUploadError(null);
      const prepared = await prepareDirectUploads(formData, fields);
      if (!prepared.ok) {
        setUploadError(prepared.error);
        return;
      }
      await action(formData);
    },
    [action, fields],
  );
  return { formAction, uploadError };
}
