import Image from "next/image";
import { getFlaticonCourseIcon } from "@/utils/flaticon-course-icons";

type CourseCategoryIconProps = {
  category: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20",
} as const;

const imageSizeClasses = {
  sm: "h-[82%] w-[82%]",
  md: "h-[82%] w-[82%]",
  lg: "h-[82%] w-[82%]",
} as const;

const ICON_PX = 512;

export function CourseCategoryIcon({
  category,
  size = "md",
  className = "",
}: CourseCategoryIconProps) {
  const icon = getFlaticonCourseIcon(category);

  return (
    <span
      role="img"
      aria-label={`${category} course`}
      className={`inline-flex items-center justify-center drop-shadow-card-elevated ${sizeClasses[size]} ${className}`}
    >
      <Image
        src={icon.src}
        alt=""
        aria-hidden
        width={ICON_PX}
        height={ICON_PX}
        className={`brightness-0 invert ${imageSizeClasses[size]}`}
        sizes="(max-width: 640px) 40px, 80px"
      />
    </span>
  );
}
