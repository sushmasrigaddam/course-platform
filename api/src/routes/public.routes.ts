import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /courses?q=react&category=web-development&page=1&limit=9
/**
 * @openapi
 * /courses:
 *   get:
 *     tags: [Public]
 *     summary: List published courses
 *     description: Public course catalog with search, category filter, and pagination.
 *     security: []
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Search in title }
 *       - { in: query, name: category, schema: { type: string }, description: Category slug }
 *       - in: query
 *         name: sort
 *         description: Sort by course title, or by creation date for newest
 *         schema:
 *           type: string
 *           enum: [asc, desc, newest]
 *           default: asc
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 9 } }
 *     responses:
 *       200:
 *         description: Page of published courses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CoursePage'
 */
router.get(
  '/courses',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const sort = String(req.query.sort || 'asc').trim().toLowerCase();
    let orderBy: Prisma.CourseOrderByWithRelationInput;

    switch (sort) {
      case 'asc':
        orderBy = { title: 'asc' };
        break;
      case 'desc':
        orderBy = { title: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      default:
        return res.status(400).json({ message: 'Sort must be asc, desc, or newest' });
    }

    // Public users only ever see published courses
    const where: Prisma.CourseWhereInput = { status: 'PUBLISHED' };
    if (q) where.title = { contains: q };
    if (category) where.category = { slug: category };

    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: { category: true, instructor: { select: { name: true } } },
      }),
      prisma.course.count({ where }),
    ]);

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  })
);

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
router.get(
  '/courses/:slug',
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findFirst({
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
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  })
);
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
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } }));
  })
);

export default router;