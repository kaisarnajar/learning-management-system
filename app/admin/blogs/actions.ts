"use server";

import type { Prisma } from "@prisma/client";
import { createAdminCrudActions, fromSafeParse } from "@/services/admin-crud";
import { deleteBlogImageFile } from "@/services/blog-upload";
import {
  addImagesToPost,
  getRemoveImageIds,
  parseBlogForm,
  removeBlogImages,
  revalidateBlogPaths,
} from "@/services/blog-mutations";
import { isTeacherSubmittedBlog } from "@/services/blog-approval";
import { resolveBlogFeaturedUpdate } from "@/services/blogs";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";

const crud = createAdminCrudActions({
  label: "blog post",
  model: {
    find: (id) => prisma.blogPost.findUnique({
      where: { id },
      include: { images: true, createdBy: { select: { email: true } } },
    }),
    create: (data) => prisma.blogPost.create({ data: data as Prisma.BlogPostUncheckedCreateInput }),
    update: (id, data) => prisma.blogPost.update({ where: { id }, data: data as Prisma.BlogPostUncheckedUpdateInput }),
    remove: (id) => prisma.blogPost.delete({ where: { id } }),
  },
  parse: (formData) => fromSafeParse(parseBlogForm(formData)),
  paths: {
    list: "/admin/blogs",
    revalidate: (id, operation) => revalidateBlogPaths(operation === "update" ? id : undefined),
  },
  hooks: {
    toColumns: (data) => ({ title: data.title, excerpt: data.excerpt || null, body: data.body }),

    prepareCreate: async ({ session, formData, data }) => {
      const approvalStatus = data.published ? "APPROVED" : "DRAFT";
      const featured = await resolveBlogFeaturedUpdate({
        post: {
          published: data.published,
          approvalStatus,
          featuredOnHomepage: false,
          featuredAt: null,
        },
        requestFeatured: formData.get("featuredOnHomepage") === "on",
      });
      if ("error" in featured) return { error: featured.error };

      return {
        columns: { published: data.published, approvalStatus, ...featured, createdById: session.user.id },
      };
    },

    afterCreate: async ({ formData }, post) => {
      const imageResult = await addImagesToPost(post.id, formData, 0);
      if (imageResult.error) {
        await withDbErrorHandling(() => prisma.blogPost.delete({ where: { id: post.id } }), "Database operation failed");
        return { error: imageResult.error };
      }
    },

    prepareUpdate: async ({ id, existing, formData, data }) => {
      // Teacher submissions keep their text; admins may only publish/feature them.
      const contentLocked = isTeacherSubmittedBlog(existing);

      if (!contentLocked) {
        const removeIds = getRemoveImageIds(formData);
        await removeBlogImages(removeIds, id);

        const remainingCount =
          existing.images.length - existing.images.filter((img) => removeIds.includes(img.id)).length;

        const imageResult = await addImagesToPost(id, formData, remainingCount);
        if (imageResult.error) return { error: imageResult.error };
      }

      const approvalStatus = data.published
        ? "APPROVED"
        : existing.approvalStatus === "APPROVED"
          ? "DRAFT"
          : existing.approvalStatus;

      const featured = await resolveBlogFeaturedUpdate({
        post: {
          published: data.published,
          approvalStatus,
          featuredOnHomepage: existing.featuredOnHomepage,
          featuredAt: existing.featuredAt,
        },
        requestFeatured: formData.get("featuredOnHomepage") === "on",
      });
      if ("error" in featured) return { error: featured.error };

      return {
        columns: {
          ...(contentLocked ? { title: existing.title, excerpt: existing.excerpt, body: existing.body } : {}),
          published: data.published,
          approvalStatus,
          ...featured,
        },
      };
    },

    afterUpdate: async ({ existing }) =>
      isTeacherSubmittedBlog(existing) ? { redirectTo: "/admin/blog-approvals?saved=1" } : undefined,

    beforeDelete: async (existing) => {
      for (const img of existing.images) {
        await deleteBlogImageFile(img.imagePath);
      }
    },
  },
});

export async function createBlogPost(formData: FormData) {
  return crud.create(formData);
}

export async function updateBlogPost(id: string, formData: FormData) {
  return crud.update(id, formData);
}

export async function deleteBlogPost(id: string) {
  return crud.remove(id);
}
