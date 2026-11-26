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
const permissionInclude = { roles: { include: { role: { select: { id: true, name: true } } } } };
const permissionKeySchema = zod_1.z.string().regex(/^[a-z_]+:[a-z_]+$/);
const createPermissionSchema = zod_1.z.object({
    key: permissionKeySchema,
    description: zod_1.z.string().nullable().optional(),
});
const updatePermissionSchema = createPermissionSchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide a key or description to update',
    path: ['key'],
});
function isDuplicate(error) {
    return error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
function serializePermission(permission) {
    return {
        id: permission.id,
        key: permission.key,
        description: permission.description,
        isSystem: permission.isSystem,
        roles: permission.roles.map(({ role }) => role),
    };
}
/**
 * @openapi
 * /admin/permissions:
 *   get:
 *     tags: [Admin - Permissions]
 *     summary: List permissions and the roles assigned to each
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permission catalog
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PermissionRecord'
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role or read:permission permission required
 */
router.get('/permissions', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('read:permission'), (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const permissions = await prisma_1.prisma.permission.findMany({
        orderBy: { key: 'asc' },
        include: permissionInclude,
    });
    res.json(permissions.map(serializePermission));
}));
/**
 * @openapi
 * /admin/permissions/{id}:
 *   get:
 *     tags: [Admin - Permissions]
 *     summary: Get a permission and assigned roles
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
 *         description: Permission details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionRecord'
 *       400:
 *         description: Invalid permission id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role or read:permission permission required
 *       404:
 *         description: Permission not found
 */
router.get('/permissions/:id', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('read:permission'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = (0, permissions_1.parseId)(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid permission id' });
    const permission = await prisma_1.prisma.permission.findUnique({ where: { id }, include: permissionInclude });
    if (!permission)
        return res.status(404).json({ message: 'Permission not found' });
    res.json(serializePermission(permission));
}));
/**
 * @openapi
 * /admin/permissions:
 *   post:
 *     tags: [Admin - Permissions]
 *     summary: Add a permission to the catalog
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key]
 *             properties:
 *               key: { type: string, example: create:course }
 *               description: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Permission created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionMutationResponse'
 *       400:
 *         description: Invalid permission key
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role or create:permission permission required
 *       409:
 *         description: Permission key already exists
 */
router.post('/permissions', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('create:permission'), (0, validate_1.validate)(createPermissionSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const permission = await prisma_1.prisma.$transaction(async (transaction) => {
            const created = await transaction.permission.create({
                data: { key: req.body.key, description: req.body.description ?? null },
            });
            const adminRole = await transaction.role.findUniqueOrThrow({
                where: { name: 'ADMIN' },
                select: { id: true },
            });
            await transaction.rolePermission.create({
                data: { roleId: adminRole.id, permissionId: created.id },
            });
            return transaction.permission.findUniqueOrThrow({
                where: { id: created.id },
                include: permissionInclude,
            });
        });
        res.status(201).json({
            message: 'Permission created successfully',
            permission: serializePermission(permission),
        });
    }
    catch (error) {
        if (isDuplicate(error))
            return res.status(409).json({ message: 'Permission key already exists' });
        throw error;
    }
}));
/**
 * @openapi
 * /admin/permissions/{id}:
 *   put:
 *     tags: [Admin - Permissions]
 *     summary: Update a permission
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
 *               key: { type: string }
 *               description: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Permission updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionMutationResponse'
 *       400:
 *         description: Invalid permission id or body
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role or update:permission permission required
 *       404:
 *         description: Permission not found
 *       409:
 *         description: Permission key already exists or a system permission key cannot be changed
 */
router.put('/permissions/:id', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('update:permission'), (0, validate_1.validate)(updatePermissionSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = (0, permissions_1.parseId)(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid permission id' });
    const existing = await prisma_1.prisma.permission.findUnique({
        where: { id },
        select: { id: true, key: true, isSystem: true },
    });
    if (!existing)
        return res.status(404).json({ message: 'Permission not found' });
    if (existing.isSystem && req.body.key && req.body.key !== existing.key) {
        return res.status(409).json({ message: 'System permission keys cannot be changed' });
    }
    try {
        const permission = await prisma_1.prisma.permission.update({
            where: { id },
            data: { key: req.body.key, description: req.body.description },
            include: permissionInclude,
        });
        res.json({
            message: 'Permission updated successfully',
            permission: serializePermission(permission),
        });
    }
    catch (error) {
        if (isDuplicate(error))
            return res.status(409).json({ message: 'Permission key already exists' });
        throw error;
    }
}));
/**
 * @openapi
 * /admin/permissions/{id}:
 *   delete:
 *     tags: [Admin - Permissions]
 *     summary: Delete a permission and its role assignments
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
 *         description: Permission deleted
 *       400:
 *         description: Invalid permission id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role or delete:permission permission required
 *       404:
 *         description: Permission not found
 *       409:
 *         description: System permissions cannot be deleted
 */
router.delete('/permissions/:id', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('delete:permission'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = (0, permissions_1.parseId)(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid permission id' });
    const permission = await prisma_1.prisma.permission.findUnique({ where: { id }, select: { id: true, isSystem: true } });
    if (!permission)
        return res.status(404).json({ message: 'Permission not found' });
    if (permission.isSystem)
        return res.status(409).json({ message: 'System permissions cannot be deleted' });
    await prisma_1.prisma.permission.delete({ where: { id } });
    res.json({ message: 'Permission deleted successfully' });
}));
exports.default = router;
