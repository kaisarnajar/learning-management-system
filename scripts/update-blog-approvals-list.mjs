import fs from 'fs';

let c = fs.readFileSync('app/admin/blog-approvals/page.tsx', 'utf8');

c = c.replace(/import \{ ConfirmationModal \} from "@\/components\/shared\/ConfirmationModal";\n/, '');
c = c.replace(/import \{ approveBlogPost, rejectBlogPost \} from "@\/app\/admin\/blog-approvals\/actions";\n/, '');

c = c.replace(/import \{ ListSearchForm \} from "@\/components\/shared\/ListSearchForm";/, 'import { BlogApprovalTable } from "@/components/admin/BlogApprovalTable";\nimport { ListSearchForm } from "@/components/shared/ListSearchForm";');

const tableRegex = /<table className="w-full min-w-\[880px\] text-left text-sm">[\s\S]*?<\/table>/;
c = c.replace(tableRegex, '<BlogApprovalTable pendingPosts={pendingPosts} />');

fs.writeFileSync('app/admin/blog-approvals/page.tsx', c);
