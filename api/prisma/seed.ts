import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createPrismaAdapter } from '../src/lib/prisma-adapter';

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const roleDefinitions = [
    { name: 'ADMIN', description: 'Full platform administration', isSystem: true },
    { name: 'INSTRUCTOR', description: 'Manage own courses, modules, and lessons', isSystem: true },
    { name: 'STUDENT', description: 'Enroll in courses and track lesson progress', isSystem: true },
  ];
  await Promise.all(
    roleDefinitions.map((role) =>
      prisma.role.upsert({ where: { name: role.name }, update: role, create: role })
    )
  );

  const permissionDefinitions = [
    ['read:profile', 'Read own profile'],
    ['update:profile', 'Update own profile'],
    ['delete:profile', 'Delete own profile'],
    ['change:password', 'Change own password'],
    ['read:course', 'Read course information'],
    ['create:course', 'Create courses'],
    ['update:course', 'Update manageable courses'],
    ['delete:course', 'Delete manageable courses'],
    ['publish:course', 'Change course publication status'],
    ['read:course_students', 'Read students enrolled in manageable courses'],
    ['read:category', 'Read categories'],
    ['create:category', 'Create categories'],
    ['update:category', 'Update categories'],
    ['delete:category', 'Delete categories'],
    ['read:module', 'Read modules'],
    ['create:module', 'Create modules'],
    ['update:module', 'Update modules'],
    ['delete:module', 'Delete modules'],
    ['read:lesson', 'Read lesson content'],
    ['create:lesson', 'Create lessons'],
    ['update:lesson', 'Update lessons'],
    ['delete:lesson', 'Delete lessons'],
    ['complete:lesson', 'Mark lessons complete'],
    ['uncomplete:lesson', 'Undo lesson completion'],
    ['read:enrollment', 'Read own course enrollments'],
    ['create:enrollment', 'Enroll in courses'],
    ['delete:enrollment', 'Leave courses'],
    ['read:user', 'Read user profiles'],
    ['update:user_role', 'Change user roles'],
    ['delete:user', 'Delete users'],
    ['read:role', 'Read roles'],
    ['create:role', 'Create roles'],
    ['update:role', 'Update roles and their permissions'],
    ['delete:role', 'Delete roles'],
    ['read:permission', 'Read permissions'],
    ['create:permission', 'Create permissions'],
    ['update:permission', 'Update permissions'],
    ['delete:permission', 'Delete permissions'],
    ['read:stats', 'Read platform statistics'],
  ] as const;
  await Promise.all(
    permissionDefinitions.map(([key, description]) =>
      prisma.permission.upsert({
        where: { key },
        update: { description, isSystem: true },
        create: { key, description, isSystem: true },
      })
    )
  );

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const instructorRole = await prisma.role.findUniqueOrThrow({ where: { name: 'INSTRUCTOR' } });
  const studentRole = await prisma.role.findUniqueOrThrow({ where: { name: 'STUDENT' } });
  const allPermissionKeys = permissionDefinitions.map(([key]) => key);
  const instructorPermissionKeys = [
    'read:course',
    'create:course',
    'update:course',
    'delete:course',
    'publish:course',
    'read:course_students',
    'read:module',
    'create:module',
    'update:module',
    'delete:module',
    'read:lesson',
    'create:lesson',
    'update:lesson',
    'delete:lesson',
    'read:profile',
    'change:password',
  ];
  const studentPermissionKeys = [
    'read:profile',
    'update:profile',
    'delete:profile',
    'change:password',
    'read:course',
    'read:module',
    'read:lesson',
    'complete:lesson',
    'uncomplete:lesson',
    'read:enrollment',
    'create:enrollment',
    'delete:enrollment',
  ];

  async function assignPermissions(roleId: number, keys: readonly string[]) {
    const permissions = await prisma.permission.findMany({
      where: { key: { in: [...keys] } },
      select: { id: true },
    });
    if (permissions.length !== keys.length) {
      throw new Error(`Could not resolve every permission for role ${roleId}`);
    }
    await prisma.rolePermission.createMany({
      data: permissions.map(({ id }) => ({ roleId, permissionId: id })),
      skipDuplicates: true,
    });
  }

  await Promise.all([
    assignPermissions(adminRole.id, allPermissionKeys),
    assignPermissions(instructorRole.id, instructorPermissionKeys),
    assignPermissions(studentRole.id, studentPermissionKeys),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: 'Admin', email: 'admin@example.com', passwordHash, roleId: adminRole.id },
  });

  await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: { name: 'Student One', email: 'student@example.com', passwordHash, roleId: studentRole.id },
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

  const reactCourse = await prisma.course.upsert({
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

  await Promise.all([
    prisma.section.upsert({
      where: { courseId_position: { courseId: reactCourse.id, position: 1 } },
      update: { title: 'Getting started' },
      create: { title: 'Getting started', position: 1, courseId: reactCourse.id },
    }),
    prisma.section.upsert({
      where: { courseId_position: { courseId: reactCourse.id, position: 2 } },
      update: { title: 'Building your first app' },
      create: { title: 'Building your first app', position: 2, courseId: reactCourse.id },
    }),
  ]);

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