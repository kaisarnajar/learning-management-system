const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const questions = await prisma.fatwaQuestion.findMany({ take: 1 });
    console.log("Success! Columns:", Object.keys(questions[0] || {}));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
