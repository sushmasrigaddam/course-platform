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
const router = (0, express_1.Router)();
const roleSchema = zod_1.z.object({ role: zod_1.z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/) });
const publicUserSelect = {
    id: true,
    name: true,
    email: true,
    role: { select: { name: true } },
    createdAt: true,
};
const publicUser = (user) => ({
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
router.get('/users', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('read:user'), (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const users = await prisma_1.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: publicUserSelect,
    });
    res.json(users.map(publicUser));
}));
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
router.get('/users/:id', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('read:user'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = (0, permissions_1.parseId)(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid user id' });
    const user = await prisma_1.prisma.user.findUnique({ where: { id }, select: publicUserSelect });
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    res.json(publicUser(user));
}));
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
router.patch('/users/:id/role', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('update:user_role'), (0, validate_1.validate)(roleSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = (0, permissions_1.parseId)(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid user id' });
    const [existing, role] = await Promise.all([
        prisma_1.prisma.user.findUnique({ where: { id }, select: { id: true } }),
        prisma_1.prisma.role.findUnique({ where: { name: req.body.role }, select: { id: true, name: true } }),
    ]);
    if (!existing)
        return res.status(404).json({ message: 'User not found' });
    if (!role)
        return res.status(404).json({ message: 'Role not found' });
    if (id === req.user.id && role.name !== 'ADMIN') {
        return res.status(409).json({ message: 'You cannot change your own admin role' });
    }
    const user = await prisma_1.prisma.user.update({
        where: { id },
        data: { roleId: role.id },
        select: publicUserSelect,
    });
    res.json({ message: 'User role updated successfully', user: publicUser(user) });
}));
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
router.delete('/users/:id', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('delete:user'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = (0, permissions_1.parseId)(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid user id' });
    if (id === req.user.id)
        return res.status(403).json({ message: 'You cannot delete your own admin account here' });
    try {
        await prisma_1.prisma.user.delete({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025')
                return res.status(404).json({ message: 'User not found' });
            if (error.code === 'P2003')
                return res.status(409).json({ message: 'User owns courses and cannot be deleted' });
        }
        throw error;
    }
}));
exports.default = router;
