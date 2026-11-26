"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = (0, express_1.Router)();
// GET /courses?q=react&category=web-development&page=1&limit=9
/**
 * @openapi
 * /courses:
 *   get:
 *     tags: [Public, Student]
 *     summary: List published or enrolled courses
 *     description: Anonymous requests list published courses; requests with a student bearer token list that student's enrollments and progress.
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Search in title }
 *       - { in: query, name: category, schema: { type: string }, description: Category slug }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 9 } }
 *     responses:
 *       200:
 *         description: Public course page or the authenticated student's enrolled courses
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/CoursePage'
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/StudentCourseProgress'
 */
router.get('/courses', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 9, 1), 50);
    // Public users only ever see published courses
    const where = { status: 'PUBLISHED' };
    if (q)
        where.title = { contains: q };
    if (category)
        where.category = { slug: category };
    const [items, total] = await Promise.all([
        prisma_1.prisma.course.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: { category: true, instructor: { select: { name: true } } },
        }),
        prisma_1.prisma.course.count({ where }),
    ]);
    res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}));
/**
 * @openapi
 * /courses/{slug}:
 *   get:
 *     tags: [Public]
 *     summary: Get a published course and its curriculum
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course details, sections, modules, and lesson previews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sections:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Section'
 *                 modules:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       title: { type: string }
 *                       position: { type: integer }
 *                       lessons:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: integer }
 *                             title: { type: string }
 *                             durationMin: { type: integer }
 *                             position: { type: integer }
 *       404:
 *         description: Published course not found
 */
router.get('/courses/:slug', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const course = await prisma_1.prisma.course.findFirst({
        where: { slug: req.params.slug, status: 'PUBLISHED' },
        include: {
            category: true,
            instructor: { select: { name: true } },
            sections: { orderBy: { position: 'asc' } },
            modules: {
                orderBy: { position: 'asc' },
                include: {
                    lessons: {
                        orderBy: { position: 'asc' },
                        select: { id: true, title: true, durationMin: true, position: true },
                    },
                },
            },
        },
    });
    if (!course)
        return res.status(404).json({ message: 'Course not found' });
    res.json(course);
}));
/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Public]
 *     summary: List course categories
 *     responses:
 *       200:
 *         description: Categories ordered by name
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
router.get('/categories', (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    res.json(await prisma_1.prisma.category.findMany({ orderBy: { name: 'asc' } }));
}));
exports.default = router;
