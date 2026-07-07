"use client";

import { useMemo, useState } from "react";
import type { FormValidationResult } from "@/utils/form-validation";

type UseZodFormOptions<T extends Record<string, unknown>> = {
  initialValues: T;
  fields: (keyof T)[];
  validate: (values: T) => FormValidationResult;
  issuePathForField?: (field: keyof T) => string | number | undefined;
};

export function useZodForm<T extends Record<string, unknown>>({
  initialValues,
  fields,
  validate,
  issuePathForField,
}: UseZodFormOptions<T>) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validation = useMemo(() => validate(values), [validate, values]);

  const errors = useMemo(() => {
    if (validation.success) {
      return {} as Partial<Record<keyof T, string>>;
    }

    const next: Partial<Record<keyof T, string>> = {};
    for (const field of fields) {
      const issuePath = issuePathForField?.(field) ?? field;
      const message = validation.issues.find((issue) => issue.path[0] === issuePath)?.message;
      if (message) {
        next[field] = message;
      }
    }
    return next;
  }, [validation, fields, issuePathForField]);

  const isValid = validation.success;

  function updateField<K extends keyof T>(field: K, value: T[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function markTouched(field: keyof T) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function showError(field: keyof T) {
    return Boolean(touched[field] && errors[field]);
  }

  function reset() {
    setValues(initialValues);
    setTouched({});
  }

  return {
    values,
    setValues,
    errors,
    isValid,
    updateField,
    markTouched,
    showError,
    reset,
  };
}
