import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const r2Url = process.env.R2_PUBLIC_URL;
  if (!r2Url) {
    throw new Error("R2_PUBLIC_URL environment variable is required.");
  }

  console.log(`Migrating local /uploads/ paths to ${r2Url}...`);

  // 1. User
  const users = await prisma.user.findMany({ where: { image: { startsWith: "/uploads/" } } });
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { image: `${r2Url}${user.image}` },
    });
  }
  console.log(`Updated ${users.length} Users`);

  // 2. Teacher
  const teachers = await prisma.teacher.findMany({ where: { imageUrl: { startsWith: "/uploads/" } } });
  for (const teacher of teachers) {
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { imageUrl: `${r2Url}${teacher.imageUrl}` },
    });
  }
  console.log(`Updated ${teachers.length} Teachers`);

  // 3. CourseAnnouncement
  const announcements = await prisma.courseAnnouncement.findMany({ where: { attachmentPath: { startsWith: "/uploads/" } } });
  for (const ann of announcements) {
    await prisma.courseAnnouncement.update({
      where: { id: ann.id },
      data: { attachmentPath: `${r2Url}${ann.attachmentPath}` },
    });
  }
  console.log(`Updated ${announcements.length} CourseAnnouncements`);

  // 4. BlogImage
  const blogImages = await prisma.blogImage.findMany({ where: { imagePath: { startsWith: "/uploads/" } } });
  for (const img of blogImages) {
    await prisma.blogImage.update({
      where: { id: img.id },
      data: { imagePath: `${r2Url}${img.imagePath}` },
    });
  }
  console.log(`Updated ${blogImages.length} BlogImages`);

  // 5. LibraryItem
  const libImages = await prisma.libraryItem.findMany({ where: { imagePath: { startsWith: "/uploads/" } } });
  for (const item of libImages) {
    await prisma.libraryItem.update({
      where: { id: item.id },
      data: { imagePath: `${r2Url}${item.imagePath}` },
    });
  }
  const libPdfs = await prisma.libraryItem.findMany({ where: { pdfUrl: { startsWith: "/uploads/" } } });
  for (const item of libPdfs) {
    await prisma.libraryItem.update({
      where: { id: item.id },
      data: { pdfUrl: `${r2Url}${item.pdfUrl}` },
    });
  }
  console.log(`Updated ${libImages.length} Library Images, ${libPdfs.length} Library PDFs`);

  // 6. CoursePaymentSubmission
  const submissions = await prisma.coursePaymentSubmission.findMany({ where: { paymentScreenshotPath: { startsWith: "/uploads/" } } });
  for (const sub of submissions) {
    await prisma.coursePaymentSubmission.update({
      where: { id: sub.id },
      data: { paymentScreenshotPath: `${r2Url}${sub.paymentScreenshotPath}` },
    });
  }
  console.log(`Updated ${submissions.length} CoursePaymentSubmissions`);

  // 7. Book
  const books = await prisma.book.findMany({ where: { imagePath: { startsWith: "/uploads/" } } });
  for (const book of books) {
    await prisma.book.update({
      where: { id: book.id },
      data: { imagePath: `${r2Url}${book.imagePath}` },
    });
  }
  console.log(`Updated ${books.length} Books`);

  // 8. BookOrder
  const bookOrders = await prisma.bookOrder.findMany({ where: { paymentScreenshotPath: { startsWith: "/uploads/" } } });
  for (const order of bookOrders) {
    await prisma.bookOrder.update({
      where: { id: order.id },
      data: { paymentScreenshotPath: `${r2Url}${order.paymentScreenshotPath}` },
    });
  }
  console.log(`Updated ${bookOrders.length} BookOrders`);

  console.log("Migration complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
