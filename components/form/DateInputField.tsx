import { formErrorTextClassName, formFieldInputClass } from "@/utils/form-validation";
import { labelClassName } from "@/utils/form";

type DateInputFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  errorId?: string;
  className?: string;
};

export function DateInputField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  required = false,
  hasError = false,
  errorMessage,
  errorId,
  className = "",
}: DateInputFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="date"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError && errorId ? errorId : undefined}
        className={formFieldInputClass(hasError)}
      />
      {hasError && errorMessage && (
        <p id={errorId} className={formErrorTextClassName} role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
