import { Router, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requirePermission, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const idSchema = z.coerce.number().int().positive();

function isDuplicateKey(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

const profileSchema = z
  .object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
  })
  .refine((profile) => Object.keys(profile).length > 0, {
    message: 'Provide a name or email to update',
    path: ['name'],
  });

const optionalStudentAuth: RequestHandler = (req, res, next) => {
  if (!req.headers.authorization) return next();
  authenticate(req, res, () =>
    requireRole('STUDENT')(req, res, () => requirePermission('read:enrollment')(req, res, next))
  );
};

const publicUser = (user: { id: number; name: string; email: string; role: { name: string } }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role.name,
});

/**
 * @openapi
 * /profile:
 *   get:
 *     tags: [Student]
 *     summary: Get the current student's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Student role required
 *       404:
 *         description: User not found
 */
router.get(
  '/profile',
  authenticate,
  requireRole('STUDENT'),
  requirePermission('read:profile'),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { role: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Profile retrieved successfully', user: publicUser(user) });
  })
);

/**
 * @openapi
 * /profile:
 *   put:
 *     tags: [Student]
 *     summary: Update the current student's name or email
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileInput'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid profile
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Student role required
 *       404:
 *         description: User not found
 *       409:
 *         description: Email is already registered
 */
router.put(
  '/profile',
  authenticate,
  requireRole('STUDENT'),
  requirePermission('update:profile'),
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { name, email } = req.body;

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        return res.status(409).json({ message: 'Email is already registered' });
      }
    }

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { name, email },
        include: { role: true },
      });
      res.json({ message: 'Profile updated successfully', user: publicUser(user) });
    } catch (error) {
      if (isDuplicateKey(error)) return res.status(409).json({ message: 'Email is already registered' });
      throw error;
    }
  })
);

/**
 * @openapi
 * /profile:
 *   delete:
 *     tags: [Student]
 *     summary: Delete the current student's account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Student role required
 *       404:
 *         description: User not found
 *       409:
 *         description: Account cannot be deleted while it owns courses
 */
router.delete(
  '/profile',
  authenticate,
  requireRole('STUDENT'),
  requirePermission('delete:profile'),
  asyncHandler(async (req, res) => {
    try {
      await prisma.user.delete({ where: { id: req.user!.id } });
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'User not found' });
        if (error.code === 'P2003') {
          return res.status(409).json({ message: 'Cannot delete an account that owns courses' });
        }
      }
      throw error;
    }
  })
);

/**
 * @openapi
 * /courses/{courseId}/enroll:
 *   post:
 *     tags: [Student]
 *     summary: Enroll in a published course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Enrollment created
 *       400:
 *         description: Invalid course id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Student role required
 *       404:
 *         description: Published course not found
 *       409:
 *         description: Already enrolled
 */
router.post(
  '/courses/:courseId/enroll',
  authenticate,
  requireRole('STUDENT'),
  requirePermission('create:enrollment'),
  asyncHandler(async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.courseId);
    if (!parsedId.success) return res.status(400).json({ message: 'Invalid course id' });

    const courseId = parsedId.data;
    const userId = req.user!.id;
    const course = await prisma.course.findFirst({
      where: { id: courseId, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!course) return res.status(404).json({ message: 'Published course not found' });

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    });
    if (existing) return res.status(409).json({ message: 'You are already enrolled' });

    try {
      const enrollment = await prisma.enrollment.create({ data: { userId, courseId } });
      res.status(201).json({ message: 'Enrolled successfully', enrollment });
    } catch (error) {
      if (isDuplicateKey(error)) return res.status(409).json({ message: 'You are already enrolled' });
      throw error;
    }
  })
);

/**
 * @openapi
 * /courses/{courseId}/enroll:
 *   delete:
 *     tags: [Student]
 *     summary: Leave an enrolled course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Course enrollment removed
 *       400:
 *         description: Invalid course id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Student role required
 *       404:
 *         description: Enrollment not found
 */
router.delete(
  '/courses/:courseId/enroll',
  authenticate,
  requireRole('STUDENT'),
  requirePermission('delete:enrollment'),
  asyncHandler(async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.courseId);
    if (!parsedId.success) return res.status(400).json({ message: 'Invalid course id' });

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId: parsedId.data } },
      select: { id: true },
    });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    await prisma.enrollment.delete({ where: { id: enrollment.id } });
    res.json({ message: 'Course enrollment removed successfully' });
  })
);

router.get(
  '/courses',
  optionalStudentAuth,
  asyncHandler(async (req, res, next) => {
    if (!req.user) return next();

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: req.user.id },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: { include: { modules: { include: { lessons: { select: { id: true } } } } } },
      },
    });
    const progressRows = await prisma.lessonProgress.findMany({
      where: { userId: req.user.id },
      select: { lessonId: true },
    });
    const completedIds = new Set(progressRows.map((row) => row.lessonId));

    res.json(
      enrollments.map(({ course }) => {
        const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
        const completedLessons = lessonIds.filter((lessonId) => completedIds.has(lessonId)).length;
        return {
          id: course.id,
          title: course.title,
          slug: course.slug,
          thumbnailUrl: course.thumbnailUrl,
          totalLessons: lessonIds.length,
          completedLessons,
          progress: lessonIds.length ? Math.round((completedLessons / lessonIds.length) * 100) : 0,
        };
      })
    );
  })
);

/**
 * @openapi
 * /courses/{courseId}/learn:
 *   get:
 *     tags: [Student]
 *     summary: Get full lesson content for an enrolled course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Course curriculum including full lesson content
 *       400:
 *         description: Invalid course id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Student role required or course not enrolled
 *       404:
 *         description: Course not found
 */
router.get(
  '/courses/:courseId/learn',
  authenticate,
  requireRole('STUDENT'),
  requirePermission('read:course'),
  requirePermission('read:module'),
  requirePermission('read:lesson'),
  asyncHandler(async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.courseId);
    if (!parsedId.success) return res.status(400).json({ message: 'Invalid course id' });

    const courseId = parsedId.data;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: { orderBy: { position: 'asc' } },
        modules: {
          orderBy: { position: 'asc' },
          include: { lessons: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId } },
      select: { id: true },
    });
    if (!enrollment) return res.status(403).json({ message: 'You are not enrolled in this course' });

    res.json(course);
  })
);

/**
 * @openapi
 * /courses/{courseId}/sections:
 *   get:
 *     tags: [Student]
 *     summary: List sections in an enrolled course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sections ordered by position
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Section'
 *       400:
 *         description: Invalid course id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Student role required or course not enrolled
 *       404:
 *         description: Course not found
 */
router.get(
  '/courses/:courseId/sections',
  authenticate,
  requireRole('STUDENT'),
  requirePermission('read:module'),
  asyncHandler(async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.courseId);
    if (!parsedId.success) return res.status(400).json({ message: 'Invalid course id' });

    const courseId = parsedId.data;
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId } },
      select: { id: true },
    });
    if (!enrollment) return res.status(403).json({ message: 'You are not enrolled in this course' });

    const sections = await prisma.section.findMany({ where: { courseId }, orderBy: { position: 'asc' } });
    res.json(sections);
  })
);

/**
 * @openapi
 * /lessons/{lessonId}/complete:
 *   post:
 *     tags: [Student]
 *     summary: Mark an enrolled course lesson complete
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lesson marked complete
 *       400:
 *         description: Invalid lesson id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Student role required or course not enrolled
 *       404:
 *         description: Lesson not found
 */
router.post(
  '/lessons/:lessonId/complete',
  authenticate,
  requireRole('STUDENT'),
  requirePermission('complete:lesson'),
  asyncHandler(async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.lessonId);
    if (!parsedId.success) return res.status(400).json({ message: 'Invalid lesson id' });

    const lessonId = parsedId.data;
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, module: { select: { courseId: true } } },
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId: lesson.module.courseId } },
      select: { id: true },
    });
    if (!enrollment) return res.status(403).json({ message: 'You are not enrolled in this course' });

    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: req.user!.id, lessonId } },
      update: {},
      create: { userId: req.user!.id, lessonId },
    });
    res.json({ message: 'Lesson marked complete' });
  })
);

/**
 * @openapi
 * /lessons/{lessonId}/complete:
 *   delete:
 *     tags: [Student]
 *     summary: Undo lesson completion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lesson completion removed
 *       400:
 *         description: Invalid lesson id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Student role required or course not enrolled
 *       404:
 *         description: Lesson or completion record not found
 */
router.delete(
  '/lessons/:lessonId/complete',
  authenticate,
  requireRole('STUDENT'),
  requirePermission('uncomplete:lesson'),
  asyncHandler(async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.lessonId);
    if (!parsedId.success) return res.status(400).json({ message: 'Invalid lesson id' });

    const lessonId = parsedId.data;
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, module: { select: { courseId: true } } },
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId: lesson.module.courseId } },
      select: { id: true },
    });
    if (!enrollment) return res.status(403).json({ message: 'You are not enrolled in this course' });

    const removed = await prisma.lessonProgress.deleteMany({
      where: { userId: req.user!.id, lessonId },
    });
    if (!removed.count) return res.status(404).json({ message: 'Lesson completion not found' });
    res.json({ message: 'Lesson completion removed successfully' });
  })
);

export default router;
