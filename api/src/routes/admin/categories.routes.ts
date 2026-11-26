import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requirePermission, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from './permissions';
import { slugify } from '../../utils/slugify';

const router = Router();
const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
});
const updateCategorySchema = categorySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Provide a name or slug to update',
  path: ['name'],
});

function isDuplicate(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * @openapi
 * /admin/categories:
 *   get:
 *     tags: [Admin - Categories]
 *     summary: List all categories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories ordered by name
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role required
 */
router.get(
  '/categories',
  requireRole('ADMIN'),
  requirePermission('read:category'),
  asyncHandler(async (_req, res) => {
    res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } }));
  })
);

/**
 * @openapi
 * /admin/categories:
 *   post:
 *     tags: [Admin - Categories]
 *     summary: Create a category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, minLength: 2 }
 *               slug: { type: string }
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role required
 *       409:
 *         description: Category name or slug already exists
 */
router.post(
  '/categories',
  requireRole('ADMIN'),
  requirePermission('create:category'),
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const { name, slug } = req.body;
    try {
      const category = await prisma.category.create({ data: { name, slug: slug || slugify(name) } });
      res.status(201).json({ message: 'Category created successfully', category });
    } catch (error) {
      if (isDuplicate(error)) return res.status(409).json({ message: 'Category name or slug already exists' });
      throw error;
    }
  })
);

/**
 * @openapi
 * /admin/categories/{id}:
 *   put:
 *     tags: [Admin - Categories]
 *     summary: Update a category
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
 *             properties:
 *               name: { type: string, minLength: 2 }
 *               slug: { type: string, minLength: 2 }
 *     responses:
 *       200:
 *         description: Category updated
 *       400:
 *         description: Invalid category id or body
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name or slug already exists
 */
router.put(
  '/categories/:id',
  requireRole('ADMIN'),
  requirePermission('update:category'),
  validate(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid category id' });

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Category not found' });
    const { name, slug } = req.body;
    const nextName = name ?? existing.name;

    try {
      const category = await prisma.category.update({
        where: { id },
        data: { name, slug: slug ?? (name ? slugify(nextName) : undefined) },
      });
      res.json({ message: 'Category updated successfully', category });
    } catch (error) {
      if (isDuplicate(error)) return res.status(409).json({ message: 'Category name or slug already exists' });
      throw error;
    }
  })
);

/**
 * @openapi
 * /admin/categories/{id}:
 *   delete:
 *     tags: [Admin - Categories]
 *     summary: Delete a category
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
 *         description: Category deleted
 *       400:
 *         description: Invalid category id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Category not found
 */
router.delete(
  '/categories/:id',
  requireRole('ADMIN'),
  requirePermission('delete:category'),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid category id' });
    const result = await prisma.category.deleteMany({ where: { id } });
    if (!result.count) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  })
);

export default router;
