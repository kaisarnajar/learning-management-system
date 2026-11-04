import Link from "next/link";
import { createTeacherBlogPost } from "@/app/teacher/(portal)/blogs/actions";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { requireTeacher } from "@/services/auth-actions";

export default async function NewTeacherBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireTeacher();
  const query = await searchParams;

  return (
    <div>
      <Link href="/teacher/blogs" className="text-sm text-primary hover:underline">
        ← Back to my blogs
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">New blog post</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Share guidance or reflections with students. Your post will be reviewed before it appears on the
        public blog.
      </p>
      <div className="mt-8">
        <BlogPostForm
          mode="teacher"
          action={createTeacherBlogPost}
          submitLabel="Submit for approval"
          error={query.error ? decodeURIComponent(query.error) : undefined}
        />
      </div>
    </div>
  );
}
