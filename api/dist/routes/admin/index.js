"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
const asyncHandler_1 = require("../../utils/asyncHandler");
const permissions_1 = require("./permissions");
const categories_routes_1 = __importDefault(require("./categories.routes"));
const courses_routes_1 = __importDefault(require("./courses.routes"));
const lessons_routes_1 = __importDefault(require("./lessons.routes"));
const modules_routes_1 = __importDefault(require("./modules.routes"));
const permissions_routes_1 = __importDefault(require("./permissions.routes"));
const roles_routes_1 = __importDefault(require("./roles.routes"));
const users_routes_1 = __importDefault(require("./users.routes"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(categories_routes_1.default);
router.use(courses_routes_1.default);
router.use(lessons_routes_1.default);
router.use(modules_routes_1.default);
router.use(permissions_routes_1.default);
router.use(roles_routes_1.default);
router.use(users_routes_1.default);
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
router.get('/stats', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('read:stats'), (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const [courses, published, students, enrollments] = await Promise.all([
        prisma_1.prisma.course.count(),
        prisma_1.prisma.course.count({ where: { status: 'PUBLISHED' } }),
        prisma_1.prisma.user.count({ where: { role: { name: 'STUDENT' } } }),
        prisma_1.prisma.enrollment.count(),
    ]);
    res.json({ courses, published, drafts: courses - published, students, enrollments });
}));
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
router.get('/courses/:id/students', (0, auth_1.requirePermission)('read:course_students'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const courseId = (0, permissions_1.parseId)(req.params.id);
    if (!courseId)
        return res.status(400).json({ message: 'Invalid course id' });
    const course = await prisma_1.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, instructorId: true },
    });
    if (!course)
        return res.status(404).json({ message: 'Course not found' });
    if (req.user.role !== 'ADMIN' && req.user.id !== course.instructorId) {
        return res.status(403).json({ message: 'This is not your course' });
    }
    const enrollments = await prisma_1.prisma.enrollment.findMany({
        where: { courseId },
        orderBy: { enrolledAt: 'desc' },
        select: {
            enrolledAt: true,
            completedAt: true,
            user: { select: { id: true, name: true, email: true } },
        },
    });
    res.json(enrollments);
}));
exports.default = router;
