import {
  formatEnrollmentFeeLabel,
  getCoursePricingFromCourse,
  type CourseFeeSource,
} from "@/lib/course-pricing";
import { getFeeFrequencyLabel, getFeeFrequencySuffix } from "@/lib/fee-frequency";

type CourseFeeSourceWithFreq = CourseFeeSource & {
  feeFrequency?: string | null;
};

type CoursePricingDisplayProps = {
  course: CourseFeeSourceWithFreq;
  className?: string;
  compact?: boolean;
};

export function CoursePricingDisplay({
  course,
  className = "",
  compact = false,
}: CoursePricingDisplayProps) {
  const pricing = getCoursePricingFromCourse(course);
  const enrollmentLabel = formatEnrollmentFeeLabel(course);
  const freqLabel = getFeeFrequencyLabel(course.feeFrequency);
  const freqSuffix = getFeeFrequencySuffix(course.feeFrequency);

  if (compact) {
    return (
      <p className={`text-sm text-muted ${className}`}>
        Enrollment: {enrollmentLabel} ·{" "}
        <span className="font-semibold text-foreground">₹{pricing.monthlyFeeInr}</span>{" "}
        <span className="text-xs">{freqSuffix}</span>
      </p>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <p className="text-sm text-muted">
        <span className="font-medium text-foreground">Enrollment:</span> {enrollmentLabel}
      </p>
      <p className="text-sm text-muted">
        <span className="font-medium text-foreground">Fee:</span> ₹{pricing.monthlyFeeInr}{" "}
        {freqSuffix}{" "}
        <span className="text-xs text-muted">({freqLabel})</span>
      </p>
    </div>
  );
}
