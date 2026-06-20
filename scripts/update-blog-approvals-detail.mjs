import fs from 'fs';

let c = fs.readFileSync('app/admin/blog-approvals/[id]/page.tsx', 'utf8');

c = c.replace(/import \{ ConfirmationModal \} from "@\/components\/shared\/ConfirmationModal";\n/, '');
c = c.replace(/import \{ approveBlogPost, rejectBlogPost \} from "@\/app\/admin\/blog-approvals\/actions";\n/, '');

c = c.replace(/import \{ getBlogPostForAdmin \} from "@\/lib\/blogs";/, 'import { getBlogPostForAdmin } from "@/lib/blogs";\nimport { BlogApprovalActions } from "@/components/admin/BlogApprovalActions";');

const actionsDivRegex = /<div className="flex flex-wrap items-center gap-2">[\s\S]*?<\/div>/;
c = c.replace(actionsDivRegex, '<BlogApprovalActions postId={post.id} />');

fs.writeFileSync('app/admin/blog-approvals/[id]/page.tsx', c);
