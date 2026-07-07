import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateTeacherBlogPost } from "@/app/teacher/(portal)/blogs/actions";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteTeacherBlogPost } from "@/app/teacher/(portal)/blogs/actions";
import { requireTeacher } from "@/services/auth-actions";
import { canTeacherEditBlogPost } from "@/services/blog-approval";
import { getBlogPostForTeacher } from "@/services/blogs";

export default async function EditTeacherBlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { session } = await requireTeacher();
  const post = await getBlogPostForTeacher(id, session.user.id);

  if (!post) notFound();

  if (!canTeacherEditBlogPost(post, session.user.id)) {
    redirect("/teacher/blogs?error=locked");
  }

  const action = updateTeacherBlogPost.bind(null, id);

  return (
    <div>
      <Link href="/teacher/blogs" className="text-sm text-primary hover:underline">
        ← Back to my blogs
      </Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary">Edit blog post</h1>
        <DeleteActionButton action={deleteTeacherBlogPost.bind(null, post.id)} itemName={post.title} onSuccessRedirect="/teacher/blogs" />
      </div>

      <div className="mt-8">
        <BlogPostForm
          mode="teacher"
          post={post}
          action={action}
          submitLabel="Resubmit for approval"
          error={query.error ? decodeURIComponent(query.error) : undefined}
        />
      </div>
    </div>
  );
}
