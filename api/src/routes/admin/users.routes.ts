import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requirePermission, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from './permissions';

const router = Router();
const roleSchema = z.object({ role: z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/) });

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: { select: { name: true } },
  createdAt: true,
} as const;

const publicUser = <T extends { role: { name: string } }>(user: T) => ({
  ...user,
  role: user.role.name,
});

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin - Users]
 *     summary: List users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profiles without password data
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role required
 */
router.get(
  '/users',
  requireRole('ADMIN'),
  requirePermission('read:user'),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: publicUserSelect,
    });
    res.json(users.map(publicUser));
  })
);

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin - Users]
 *     summary: Get a user
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
 *         description: User profile without password data
 *       400:
 *         description: Invalid user id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role required
 *       404:
 *         description: User not found
 */
router.get(
  '/users/:id',
  requireRole('ADMIN'),
  requirePermission('read:user'),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid user id' });

    const user = await prisma.user.findUnique({ where: { id }, select: publicUserSelect });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(publicUser(user));
  })
);

/**
 * @openapi
 * /admin/users/{id}/role:
 *   patch:
 *     tags: [Admin - Users]
 *     summary: Change a user's role
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
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 example: INSTRUCTOR
 *     responses:
 *       200:
 *         description: User role updated
 *       400:
 *         description: Invalid user id or role
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role required
 *       404:
 *         description: User not found
 *       409:
 *         description: You cannot change your own admin role
 */
router.patch(
  '/users/:id/role',
  requireRole('ADMIN'),
  requirePermission('update:user_role'),
  validate(roleSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid user id' });

    const [existing, role] = await Promise.all([
      prisma.user.findUnique({ where: { id }, select: { id: true } }),
      prisma.role.findUnique({ where: { name: req.body.role }, select: { id: true, name: true } }),
    ]);
    if (!existing) return res.status(404).json({ message: 'User not found' });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    if (id === req.user!.id && role.name !== 'ADMIN') {
      return res.status(409).json({ message: 'You cannot change your own admin role' });
    }
    const user = await prisma.user.update({
      where: { id },
      data: { roleId: role.id },
      select: publicUserSelect,
    });
    res.json({ message: 'User role updated successfully', user: publicUser(user) });
  })
);

/**
 * @openapi
 * /admin/users/{id}:
 *   delete:
 *     tags: [Admin - Users]
 *     summary: Delete a user
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
 *         description: User deleted
 *       400:
 *         description: Invalid user id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role required or cannot delete your own account
 *       404:
 *         description: User not found
 *       409:
 *         description: User owns courses and cannot be deleted
 */
router.delete(
  '/users/:id',
  requireRole('ADMIN'),
  requirePermission('delete:user'),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid user id' });
    if (id === req.user!.id) return res.status(403).json({ message: 'You cannot delete your own admin account here' });

    try {
      await prisma.user.delete({ where: { id } });
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'User not found' });
        if (error.code === 'P2003') return res.status(409).json({ message: 'User owns courses and cannot be deleted' });
      }
      throw error;
    }
  })
);

export default router;
