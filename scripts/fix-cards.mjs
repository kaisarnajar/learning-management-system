import fs from 'fs';

const files = [
  'components/admin/AdminCourseAnnouncementCard.tsx',
  'components/teacher/TeacherCourseAnnouncementCard.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import { delete(?:Admin|Teacher)CourseAnnouncement } from "@\/app\/(?:admin|teacher\/\(portal\))\/courses\/\[id\]\/announcements\/actions";/g, 'import { deleteCourseAnnouncement } from "@/lib/course-announcement-actions";');
  content = content.replace(/deleteAdminCourseAnnouncement/g, 'deleteCourseAnnouncement');
  content = content.replace(/deleteTeacherCourseAnnouncement/g, 'deleteCourseAnnouncement');
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}
