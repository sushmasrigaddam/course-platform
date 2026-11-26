"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const asyncHandler_1 = require("../../utils/asyncHandler");
const permissions_1 = require("./permissions");
const slugify_1 = require("../../utils/slugify");
const router = (0, express_1.Router)();
const categorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    slug: zod_1.z.string().min(2).optional(),
});
const updateCategorySchema = categorySchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'Provide a name or slug to update',
    path: ['name'],
});
function isDuplicate(error) {
    return error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
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
router.get('/categories', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('read:category'), (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    res.json(await prisma_1.prisma.category.findMany({ orderBy: { name: 'asc' } }));
}));
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
router.post('/categories', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('create:category'), (0, validate_1.validate)(categorySchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, slug } = req.body;
    try {
        const category = await prisma_1.prisma.category.create({ data: { name, slug: slug || (0, slugify_1.slugify)(name) } });
        res.status(201).json({ message: 'Category created successfully', category });
    }
    catch (error) {
        if (isDuplicate(error))
            return res.status(409).json({ message: 'Category name or slug already exists' });
        throw error;
    }
}));
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
router.put('/categories/:id', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('update:category'), (0, validate_1.validate)(updateCategorySchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = (0, permissions_1.parseId)(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid category id' });
    const existing = await prisma_1.prisma.category.findUnique({ where: { id } });
    if (!existing)
        return res.status(404).json({ message: 'Category not found' });
    const { name, slug } = req.body;
    const nextName = name ?? existing.name;
    try {
        const category = await prisma_1.prisma.category.update({
            where: { id },
            data: { name, slug: slug ?? (name ? (0, slugify_1.slugify)(nextName) : undefined) },
        });
        res.json({ message: 'Category updated successfully', category });
    }
    catch (error) {
        if (isDuplicate(error))
            return res.status(409).json({ message: 'Category name or slug already exists' });
        throw error;
    }
}));
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
router.delete('/categories/:id', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('delete:category'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = (0, permissions_1.parseId)(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid category id' });
    const result = await prisma_1.prisma.category.deleteMany({ where: { id } });
    if (!result.count)
        return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
}));
exports.default = router;
