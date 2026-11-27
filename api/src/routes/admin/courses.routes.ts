import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { slugify } from '../../utils/slugify';

const router = Router();

const thumbnailUrlSchema = z.union([
  z.string().url(),
  z.string().regex(/^\/course-images\/[A-Za-z0-9][A-Za-z0-9._-]*$/),
]);

const courseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  price: z.number().min(0),
  thumbnailUrl: thumbnailUrlSchema.nullable().optional(),
  categoryId: z.number().int().nullable().optional(),
});

const statusSchema = z.object({ status: z.enum(['DRAFT', 'PUBLISHED']) });

// Finds the course and checks the user may edit it. Admins can edit all; instructors only their own.
async function getEditableCourse(req: Request, res: Response) {
  const courseId = Number(req.params.id);
  if (!Number.isInteger(courseId) || courseId < 1) {
    res.status(400).json({ message: 'Invalid course id' });
    return null;
  }
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return null;
  }
  if (req.user!.role !== 'ADMIN' && course.instructorId !== req.user!.id) {
    res.status(403).json({ message: 'This is not your course' });
    return null;
  }
  return course;
}

/**
 * @openapi
 * /admin/courses:
 *   get:
 *     tags: [Admin - Courses]
 *     summary: List manageable courses
 *     description: Administrators see all courses; instructors see only their own.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Courses with categories and enrollment counts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CourseRecord'
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin or instructor role required
 */
router.get(
  '/courses',
  requirePermission('read:course'),
  asyncHandler(async (req, res) => {
    const where = req.user!.role === 'ADMIN' ? {} : { instructorId: req.user!.id };
    const courses = await prisma.course.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { category: true, _count: { select: { enrollments: true } } },
    });
    res.json(courses);
  })
);
/**
 * @openapi
 * /admin/courses:
 *   post:
 *     tags: [Admin - Courses]
 *     summary: Create a course
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseInput'
 *     responses:
 *       201:
 *         description: Course created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Role not allowed
 */
/**
 * @openapi
 * /admin/courses/{id}:
 *   get:
 *     tags: [Admin - Courses]
 *     summary: Get a manageable course
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
 *         description: Course details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseRecord'
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Course belongs to another instructor
 *       404:
 *         description: Course not found
 */
router.get(
  '/courses/:id',
  requirePermission('read:course'),
  asyncHandler(async (req, res) => {
    const course = await getEditableCourse(req, res);
    if (course) res.json(course);
  })
);

router.post(
  '/courses',
  requirePermission('create:course'),
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    const { title, description, level, price, thumbnailUrl, categoryId } = req.body;

    // Make the slug unique: add a suffix if the same title already exists
    let slug = slugify(title);
    if (await prisma.course.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const course = await prisma.course.create({
      data: { title, slug, description, level, price, thumbnailUrl, categoryId, instructorId: req.user!.id },
    });
    res.status(201).json(course);
  })
);

/**
 * @openapi
 * /admin/courses/{id}:
 *   put:
 *     tags: [Admin - Courses]
 *     summary: Update a manageable course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseInput'
 *     responses:
 *       200:
 *         description: Updated course
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Course belongs to another instructor
 *       404:
 *         description: Course not found
 */
router.put(
  '/courses/:id',
  requirePermission('update:course'),
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    const existing = await getEditableCourse(req, res);
    if (!existing) return;
    const { title, description, level, price, thumbnailUrl, categoryId } = req.body;
    const course = await prisma.course.update({
      where: { id: existing.id },
      data: { title, description, level, price, thumbnailUrl, categoryId },
    });
    res.json(course);
  })
);

/**
 * @openapi
 * /admin/courses/{id}/status:
 *   patch:
 *     tags: [Admin - Courses]
 *     summary: Change a course's publication status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED]
 *     responses:
 *       200:
 *         description: Updated course
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Course belongs to another instructor
 *       404:
 *         description: Course not found
 */
router.patch(
  '/courses/:id/status',
  requirePermission('publish:course'),
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const existing = await getEditableCourse(req, res);
    if (!existing) return;
    const course = await prisma.course.update({
      where: { id: existing.id },
      data: { status: req.body.status },
    });
    res.json(course);
  })
);

/**
 * @openapi
 * /admin/courses/{id}:
 *   delete:
 *     tags: [Admin - Courses]
 *     summary: Delete a manageable course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Course deleted
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Course belongs to another instructor
 *       404:
 *         description: Course not found
 */
router.delete(
  '/courses/:id',
  requirePermission('delete:course'),
  asyncHandler(async (req, res) => {
    const existing = await getEditableCourse(req, res);
    if (!existing) return;
    await prisma.course.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export default router;