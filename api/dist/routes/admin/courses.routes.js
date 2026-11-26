"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const asyncHandler_1 = require("../../utils/asyncHandler");
const slugify_1 = require("../../utils/slugify");
const router = (0, express_1.Router)();
const courseSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().min(10),
    level: zod_1.z.enum(['Beginner', 'Intermediate', 'Advanced']),
    price: zod_1.z.number().min(0),
    thumbnailUrl: zod_1.z.string().url().nullable().optional(),
    categoryId: zod_1.z.number().int().nullable().optional(),
});
const statusSchema = zod_1.z.object({ status: zod_1.z.enum(['DRAFT', 'PUBLISHED']) });
// Finds the course and checks the user may edit it. Admins can edit all; instructors only their own.
async function getEditableCourse(req, res) {
    const courseId = Number(req.params.id);
    if (!Number.isInteger(courseId) || courseId < 1) {
        res.status(400).json({ message: 'Invalid course id' });
        return null;
    }
    const course = await prisma_1.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return null;
    }
    if (req.user.role !== 'ADMIN' && course.instructorId !== req.user.id) {
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
router.get('/courses', (0, auth_1.requirePermission)('read:course'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const where = req.user.role === 'ADMIN' ? {} : { instructorId: req.user.id };
    const courses = await prisma_1.prisma.course.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: { category: true, _count: { select: { enrollments: true } } },
    });
    res.json(courses);
}));
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
router.get('/courses/:id', (0, auth_1.requirePermission)('read:course'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const course = await getEditableCourse(req, res);
    if (course)
        res.json(course);
}));
router.post('/courses', (0, auth_1.requirePermission)('create:course'), (0, validate_1.validate)(courseSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { title, description, level, price, thumbnailUrl, categoryId } = req.body;
    // Make the slug unique: add a suffix if the same title already exists
    let slug = (0, slugify_1.slugify)(title);
    if (await prisma_1.prisma.course.findUnique({ where: { slug } })) {
        slug = `${slug}-${Date.now().toString(36)}`;
    }
    const course = await prisma_1.prisma.course.create({
        data: { title, slug, description, level, price, thumbnailUrl, categoryId, instructorId: req.user.id },
    });
    res.status(201).json(course);
}));
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
router.put('/courses/:id', (0, auth_1.requirePermission)('update:course'), (0, validate_1.validate)(courseSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await getEditableCourse(req, res);
    if (!existing)
        return;
    const { title, description, level, price, thumbnailUrl, categoryId } = req.body;
    const course = await prisma_1.prisma.course.update({
        where: { id: existing.id },
        data: { title, description, level, price, thumbnailUrl, categoryId },
    });
    res.json(course);
}));
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
router.patch('/courses/:id/status', (0, auth_1.requirePermission)('publish:course'), (0, validate_1.validate)(statusSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await getEditableCourse(req, res);
    if (!existing)
        return;
    const course = await prisma_1.prisma.course.update({
        where: { id: existing.id },
        data: { status: req.body.status },
    });
    res.json(course);
}));
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
router.delete('/courses/:id', (0, auth_1.requirePermission)('delete:course'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await getEditableCourse(req, res);
    if (!existing)
        return;
    await prisma_1.prisma.course.delete({ where: { id: existing.id } });
    res.status(204).send();
}));
exports.default = router;
