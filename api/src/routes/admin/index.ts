import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, requirePermission, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from './permissions';
import categoriesRoutes from './categories.routes';
import coursesRoutes from './courses.routes';
import lessonsRoutes from './lessons.routes';
import modulesRoutes from './modules.routes';
import permissionsRoutes from './permissions.routes';
import rolesRoutes from './roles.routes';
import usersRoutes from './users.routes';

const router = Router();

router.use(authenticate);

router.use(categoriesRoutes);
router.use(coursesRoutes);
router.use(lessonsRoutes);
router.use(modulesRoutes);
router.use(permissionsRoutes);
router.use(rolesRoutes);
router.use(usersRoutes);

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     tags: [Admin - Overview]
 *     summary: Get platform statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counts of courses, students, and enrollments
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role required
 */
router.get(
  '/stats',
  requireRole('ADMIN'),
  requirePermission('read:stats'),
  asyncHandler(async (_req, res) => {
    const [courses, published, students, enrollments] = await Promise.all([
      prisma.course.count(),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.user.count({ where: { role: { name: 'STUDENT' } } }),
      prisma.enrollment.count(),
    ]);
    res.json({ courses, published, drafts: courses - published, students, enrollments });
  })
);

/**
 * @openapi
 * /admin/courses/{id}/students:
 *   get:
 *     tags: [Admin - Courses]
 *     summary: List students enrolled in a course
 *     description: Available to administrators and the course's instructor.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Enrolled student profiles and enrollment dates
 *       400:
 *         description: Invalid course id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Instructor does not own this course
 *       404:
 *         description: Course not found
 */
router.get(
  '/courses/:id/students',
  requirePermission('read:course_students'),
  asyncHandler(async (req, res) => {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ message: 'Invalid course id' });

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true },
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user!.role !== 'ADMIN' && req.user!.id !== course.instructorId) {
      return res.status(403).json({ message: 'This is not your course' });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      orderBy: { enrolledAt: 'desc' },
      select: {
        enrolledAt: true,
        completedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    res.json(enrollments);
  })
);

export default router;
