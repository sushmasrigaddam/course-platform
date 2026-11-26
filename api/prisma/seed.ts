import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set to run the seed script.');
}

const connection = new URL(databaseUrl);
if (connection.protocol !== 'mysql:') {
  throw new Error('DATABASE_URL must use the mysql:// protocol.');
}

const adapter = new PrismaMariaDb({
  host: connection.hostname,
  port: Number(connection.port || 3306),
  user: decodeURIComponent(connection.username),
  password: decodeURIComponent(connection.password),
  database: decodeURIComponent(connection.pathname.slice(1)),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: 'Admin', email: 'admin@example.com', passwordHash, role: 'ADMIN' },
  });

  await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: { name: 'Student One', email: 'student@example.com', passwordHash, role: 'STUDENT' },
  });

  const web = await prisma.category.upsert({
    where: { slug: 'web-development' },
    update: {},
    create: { name: 'Web Development', slug: 'web-development' },
  });
  await prisma.category.upsert({
    where: { slug: 'data-science' },
    update: {},
    create: { name: 'Data Science', slug: 'data-science' },
  });
  await prisma.category.upsert({
    where: { slug: 'design' },
    update: {},
    create: { name: 'Design', slug: 'design' },
  });

  await prisma.course.upsert({
    where: { slug: 'react-for-beginners' },
    update: {},
    create: {
      title: 'React for Beginners',
      slug: 'react-for-beginners',
      description: 'Learn components, props, state and hooks by building small projects.',
      level: 'Beginner',
      price: 0,
      status: 'PUBLISHED',
      categoryId: web.id,
      instructorId: admin.id,
      modules: {
        create: [
          {
            title: 'Getting started',
            position: 1,
            lessons: {
              create: [
                { title: 'What is React?', content: 'Introduction to React.', durationMin: 8, position: 1 },
                { title: 'Your first component', content: 'Write a component.', durationMin: 12, position: 2 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.course.upsert({
    where: { slug: 'nextjs-from-scratch' },
    update: {},
    create: {
      title: 'Next.js from Scratch',
      slug: 'nextjs-from-scratch',
      description: 'Routing, server rendering, static pages and data fetching in Next.js.',
      level: 'Intermediate',
      price: 999,
      status: 'DRAFT',
      categoryId: web.id,
      instructorId: admin.id,
    },
  });

  console.log('Seed done');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });