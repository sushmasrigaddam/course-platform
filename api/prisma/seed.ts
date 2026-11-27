
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createPrismaAdapter } from '../src/lib/prisma-adapter';

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main() {
  console.log('Starting LMS database seeding...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // --------------------------------------------------
  // 1. ROLES (ONLY 3)
  // --------------------------------------------------

  const roleDefinitions = [
    {
      name: 'ADMIN',
      description: 'Full platform administration',
      isSystem: true,
    },
    {
      name: 'INSTRUCTOR',
      description: 'Manage own courses, modules, and lessons',
      isSystem: true,
    },
    {
      name: 'STUDENT',
      description: 'Enroll in courses and track lesson progress',
      isSystem: true,
    },
  ];

  for (const role of roleDefinitions) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });
  }

  // --------------------------------------------------
  // 2. PERMISSIONS
  // --------------------------------------------------

  const permissionDefinitions = [
    ['read:profile', 'Read own profile'],
    ['update:profile', 'Update own profile'],
    ['delete:profile', 'Delete own profile'],
    ['change:password', 'Change own password'],

    ['read:course', 'Read course information'],
    ['create:course', 'Create courses'],
    ['update:course', 'Update manageable courses'],
    ['delete:course', 'Delete manageable courses'],
    ['publish:course', 'Publish and unpublish courses'],
    ['read:course_students', 'Read enrolled students'],

    ['read:category', 'Read categories'],
    ['create:category', 'Create categories'],
    ['update:category', 'Update categories'],
    ['delete:category', 'Delete categories'],

    ['read:module', 'Read course modules'],
    ['create:module', 'Create course modules'],
    ['update:module', 'Update course modules'],
    ['delete:module', 'Delete course modules'],

    ['read:lesson', 'Read lesson content'],
    ['create:lesson', 'Create lessons'],
    ['update:lesson', 'Update lessons'],
    ['delete:lesson', 'Delete lessons'],
    ['complete:lesson', 'Mark lessons complete'],
    ['uncomplete:lesson', 'Undo lesson completion'],

    ['read:enrollment', 'Read course enrollments'],
    ['create:enrollment', 'Enroll in courses'],
    ['delete:enrollment', 'Leave courses'],

    ['read:user', 'Read user profiles'],
    ['update:user_role', 'Change user roles'],
    ['delete:user', 'Delete users'],

    ['read:role', 'Read roles'],
    ['create:role', 'Create roles'],
    ['update:role', 'Update roles and permissions'],
    ['delete:role', 'Delete roles'],

    ['read:permission', 'Read permissions'],
    ['create:permission', 'Create permissions'],
    ['update:permission', 'Update permissions'],
    ['delete:permission', 'Delete permissions'],

    ['read:stats', 'Read platform statistics'],
  ] as const;

  for (const [key, description] of permissionDefinitions) {
    await prisma.permission.upsert({
      where: { key },
      update: { description, isSystem: true },
      create: { key, description, isSystem: true },
    });
  }

  // --------------------------------------------------
  // 3. ROLE PERMISSIONS
  // --------------------------------------------------

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'ADMIN' },
  });

  const instructorRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'INSTRUCTOR' },
  });

  const studentRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'STUDENT' },
  });

  const allPermissionKeys = permissionDefinitions.map(([key]) => key);

  const instructorPermissionKeys = [
    'read:profile',
    'change:password',
    'read:course',
    'create:course',
    'update:course',
    'delete:course',
    'publish:course',
    'read:course_students',
    'read:category',
    'read:module',
    'create:module',
    'update:module',
    'delete:module',
    'read:lesson',
    'create:lesson',
    'update:lesson',
    'delete:lesson',
    'read:enrollment',
    'read:stats',
  ];

  const studentPermissionKeys = [
    'read:profile',
    'update:profile',
    'delete:profile',
    'change:password',
    'read:course',
    'read:category',
    'read:module',
    'read:lesson',
    'complete:lesson',
    'uncomplete:lesson',
    'read:enrollment',
    'create:enrollment',
    'delete:enrollment',
  ];

  async function assignPermissions(
    roleId: number,
    keys: readonly string[],
  ) {
    const permissions = await prisma.permission.findMany({
      where: { key: { in: [...keys] } },
      select: { id: true },
    });

    if (permissions.length !== keys.length) {
      throw new Error(`Missing permissions for role ${roleId}`);
    }

    await prisma.rolePermission.createMany({
      data: permissions.map(({ id }) => ({
        roleId,
        permissionId: id,
      })),
      skipDuplicates: true,
    });
  }

  await Promise.all([
    assignPermissions(adminRole.id, allPermissionKeys),
    assignPermissions(instructorRole.id, instructorPermissionKeys),
    assignPermissions(studentRole.id, studentPermissionKeys),
  ]);

  // --------------------------------------------------
  // 4. USERS (15 USERS)
  // --------------------------------------------------

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      name: 'Platform Administrator',
      roleId: adminRole.id,
    },
    create: {
      name: 'Platform Administrator',
      email: 'admin@example.com',
      passwordHash,
      roleId: adminRole.id,
    },
  });

  const instructorData = [
    { name: 'John Anderson', email: 'john@example.com' },
    { name: 'Sarah Williams', email: 'sarah@example.com' },
    { name: 'Michael Brown', email: 'michael@example.com' },
    { name: 'Emily Davis', email: 'emily@example.com' },
  ];

  const instructors = [];

  for (const instructor of instructorData) {
    const user = await prisma.user.upsert({
      where: { email: instructor.email },
      update: {
        name: instructor.name,
        roleId: instructorRole.id,
      },
      create: {
        ...instructor,
        passwordHash,
        roleId: instructorRole.id,
      },
    });

    instructors.push(user);
  }

  const studentData = [
    { name: 'David Miller', email: 'david@example.com' },
    { name: 'Olivia Wilson', email: 'olivia@example.com' },
    { name: 'James Taylor', email: 'james@example.com' },
    { name: 'Sophia Thomas', email: 'sophia@example.com' },
    { name: 'Daniel Moore', email: 'daniel@example.com' },
    { name: 'Ava Martin', email: 'ava@example.com' },
    { name: 'William Jackson', email: 'william@example.com' },
    { name: 'Isabella White', email: 'isabella@example.com' },
    { name: 'Benjamin Harris', email: 'benjamin@example.com' },
    { name: 'Mia Clark', email: 'mia@example.com' },
  ];

  const students = [];

  for (const student of studentData) {
    const user = await prisma.user.upsert({
      where: { email: student.email },
      update: {
        name: student.name,
        roleId: studentRole.id,
      },
      create: {
        ...student,
        passwordHash,
        roleId: studentRole.id,
      },
    });

    students.push(user);
  }

  // --------------------------------------------------
  // 5. CATEGORIES (10 CATEGORIES)
  // --------------------------------------------------

  const categoryData = [
    {
      name: 'Web Development',
      slug: 'web-development',
    },
    {
      name: 'Data Science',
      slug: 'data-science',
    },
    {
      name: 'UI/UX Design',
      slug: 'ui-ux-design',
    },
    {
      name: 'Mobile App Development',
      slug: 'mobile-app-development',
    },
    {
      name: 'Cloud Computing',
      slug: 'cloud-computing',
    },
    {
      name: 'Cyber Security',
      slug: 'cyber-security',
    },
    {
      name: 'Artificial Intelligence',
      slug: 'artificial-intelligence',
    },
    {
      name: 'Digital Marketing',
      slug: 'digital-marketing',
    },
    {
      name: 'Database Management',
      slug: 'database-management',
    },
    {
      name: 'Software Testing',
      slug: 'software-testing',
    },
  ];

  const categories = [];

  for (const category of categoryData) {
    const result = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });

    categories.push(result);
  }

  // --------------------------------------------------
  // 6. COURSES (10 COURSES)
  // --------------------------------------------------

  const courseData = [
    {
      title: 'React.js Complete Guide',
      slug: 'react-js-complete-guide',
      description:
        'Learn React from fundamentals to advanced concepts including components, hooks, routing, state management and API integration.',
      level: 'Beginner',
      price: 0,
      status: 'PUBLISHED',
      category: 0,
      instructor: 0,
    },
    {
      title: 'Next.js Full Stack Development',
      slug: 'nextjs-full-stack-development',
      description:
        'Build production-ready applications using Next.js, server components, routing, authentication and database integration.',
      level: 'Intermediate',
      price: 1499,
      status: 'PUBLISHED',
      category: 0,
      instructor: 0,
    },
    {
      title: 'Python for Data Science',
      slug: 'python-data-science',
      description:
        'Explore Python programming, NumPy, Pandas, data cleaning, visualization and practical data analysis.',
      level: 'Beginner',
      price: 999,
      status: 'PUBLISHED',
      category: 1,
      instructor: 1,
    },
    {
      title: 'UI/UX Design Fundamentals',
      slug: 'ui-ux-design-fundamentals',
      description:
        'Learn user research, wireframing, prototyping, visual hierarchy and modern interface design.',
      level: 'Beginner',
      price: 799,
      status: 'PUBLISHED',
      category: 2,
      instructor: 3,
    },
    {
      title: 'Flutter Mobile App Development',
      slug: 'flutter-mobile-development',
      description:
        'Create cross-platform mobile applications using Flutter, Dart, widgets and REST API integration.',
      level: 'Intermediate',
      price: 1299,
      status: 'PUBLISHED',
      category: 3,
      instructor: 2,
    },
    {
      title: 'AWS Cloud Practitioner',
      slug: 'aws-cloud-practitioner',
      description:
        'Understand cloud computing, AWS services, storage, networking, security and deployment fundamentals.',
      level: 'Beginner',
      price: 1199,
      status: 'PUBLISHED',
      category: 4,
      instructor: 1,
    },
    {
      title: 'Cyber Security Essentials',
      slug: 'cyber-security-essentials',
      description:
        'Learn network security, common vulnerabilities, security principles and defensive security practices.',
      level: 'Intermediate',
      price: 1599,
      status: 'PUBLISHED',
      category: 5,
      instructor: 2,
    },
    {
      title: 'Machine Learning with Python',
      slug: 'machine-learning-python',
      description:
        'Understand supervised learning, unsupervised learning, model training, evaluation and practical ML workflows.',
      level: 'Advanced',
      price: 1999,
      status: 'PUBLISHED',
      category: 6,
      instructor: 1,
    },
    {
      title: 'Digital Marketing Masterclass',
      slug: 'digital-marketing-masterclass',
      description:
        'Learn SEO, content strategy, social media marketing, analytics and campaign optimization.',
      level: 'Beginner',
      price: 699,
      status: 'DRAFT',
      category: 7,
      instructor: 3,
    },
    {
      title: 'SQL and Database Design',
      slug: 'sql-database-design',
      description:
        'Master SQL queries, joins, relationships, normalization, indexing and database design principles.',
      level: 'Intermediate',
      price: 899,
      status: 'PUBLISHED',
      category: 8,
      instructor: 0,
    },
  ] as const;

  const courses = [];

  for (const data of courseData) {
    const course = await prisma.course.upsert({
      where: { slug: data.slug },
      update: {
        title: data.title,
        description: data.description,
        level: data.level,
        price: data.price,
        status: data.status,
        categoryId: categories[data.category].id,
        instructorId: instructors[data.instructor].id,
      },
      create: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        level: data.level,
        price: data.price,
        status: data.status,
        categoryId: categories[data.category].id,
        instructorId: instructors[data.instructor].id,
      },
    });

    courses.push(course);
  }

  // --------------------------------------------------
  // 7. MODULES (2 MODULES PER COURSE)
  // --------------------------------------------------

  const moduleTemplates = [
    {
      title: 'Introduction and Fundamentals',
      lessons: [
        {
          title: 'Understanding the Basics',
          content: 'Learn the fundamental concepts and terminology.',
          durationMin: 10,
        },
        {
          title: 'Setting Up the Development Environment',
          content: 'Install and configure the required development tools.',
          durationMin: 15,
        },
        {
          title: 'Core Concepts and Practical Examples',
          content: 'Explore the essential concepts with practical examples.',
          durationMin: 20,
        },
      ],
    },
    {
      title: 'Practical Implementation and Projects',
      lessons: [
        {
          title: 'Working with Real-World Examples',
          content: 'Apply the concepts to realistic development scenarios.',
          durationMin: 20,
        },
        {
          title: 'Building a Practical Project',
          content: 'Build a small project using the concepts covered.',
          durationMin: 30,
        },
        {
          title: 'Best Practices and Final Assessment',
          content: 'Review best practices and complete the final assessment.',
          durationMin: 25,
        },
      ],
    },
  ];

  for (const course of courses) {
    for (let moduleIndex = 0; moduleIndex < moduleTemplates.length; moduleIndex++) {
      const template = moduleTemplates[moduleIndex];

      let module = await prisma.module.findFirst({
        where: {
          courseId: course.id,
          title: template.title,
        },
      });

      if (module) {
        module = await prisma.module.update({
          where: { id: module.id },
          data: { position: moduleIndex + 1 },
        });
      } else {
        module = await prisma.module.create({
          data: {
            title: template.title,
            position: moduleIndex + 1,
            courseId: course.id,
          },
        });
      }

      // --------------------------------------------------
      // 8. LESSONS (3 LESSONS PER MODULE)
      // --------------------------------------------------

      for (
        let lessonIndex = 0;
        lessonIndex < template.lessons.length;
        lessonIndex++
      ) {
        const lessonData = template.lessons[lessonIndex];

        const existingLesson = await prisma.lesson.findFirst({
          where: {
            moduleId: module.id,
            title: lessonData.title,
          },
        });

        if (existingLesson) {
          await prisma.lesson.update({
            where: { id: existingLesson.id },
            data: {
              content: lessonData.content,
              durationMin: lessonData.durationMin,
              position: lessonIndex + 1,
            },
          });
        } else {
          await prisma.lesson.create({
            data: {
              title: lessonData.title,
              content: lessonData.content,
              durationMin: lessonData.durationMin,
              position: lessonIndex + 1,
              moduleId: module.id,
            },
          });
        }
      }
    }
  }

  // --------------------------------------------------
  // 9. SECTIONS (2 SECTIONS PER COURSE)
  // --------------------------------------------------

  const sectionTitles = [
    'Course Overview and Learning Objectives',
    'Practical Learning and Assignments',
  ];

  for (const course of courses) {
    for (let i = 0; i < sectionTitles.length; i++) {
      await prisma.section.upsert({
        where: {
          courseId_position: {
            courseId: course.id,
            position: i + 1,
          },
        },
        update: {
          title: sectionTitles[i],
        },
        create: {
          title: sectionTitles[i],
          position: i + 1,
          courseId: course.id,
        },
      });
    }
  }

  console.log('-----------------------------------');
  console.log('LMS database seeded successfully!');
  console.log('-----------------------------------');
  console.log('Roles: 3');
  console.log(`Permissions: ${permissionDefinitions.length}`);
  console.log('Users: 15');
  console.log('Categories: 10');
  console.log('Courses: 10');
  console.log('Modules: 20');
  console.log('Lessons: 60');
  console.log('Sections: 20');
  console.log('Default password: Password@123');
  console.log('-----------------------------------');
}

main()
  .catch((error: unknown) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
