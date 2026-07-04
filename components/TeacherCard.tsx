import Link from "next/link";
import type { Teacher } from "@/lib/teachers";

type TeacherCardProps = {
  teacher: Teacher;
};

export function TeacherCard({ teacher }: TeacherCardProps) {
  return (
    <Link
      href={`/teachers/${teacher.id}`}
      className="card-elevated flex h-full flex-col p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
    >
      {teacher.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={teacher.imageUrl}
          alt={teacher.name}
          className="h-20 w-20 rounded-xl object-cover ring-2 ring-accent-muted"
        />
      ) : (
        <span
          className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-800 text-xl font-bold text-white"
          aria-hidden
        >
          {teacher.initials}
        </span>
      )}
      <h3 className="mt-4 text-base font-semibold text-foreground sm:text-lg">{teacher.name}</h3>
      <p className="mt-1 text-sm font-medium text-gold">{teacher.specialization}</p>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{teacher.bio}</p>
      <span className="mt-auto pt-4 text-xs font-semibold uppercase tracking-wide text-gold">View profile →</span>
    </Link>
  );
}
