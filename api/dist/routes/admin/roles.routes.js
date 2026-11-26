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
const roleInclude = { permissions: { include: { permission: true } } };
const roleNameSchema = zod_1.z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/);
const permissionListSchema = zod_1.z.array(zod_1.z.string().min(1)).refine((keys) => new Set(keys).size === keys.length, {
    message: 'Permission keys must be unique',
});
const createRoleSchema = zod_1.z.object({
    name: roleNameSchema,
    description: zod_1.z.string().nullable().optional(),
    permissions: permissionListSchema.default([]),
});
const updateRoleSchema = zod_1.z
    .object({
    name: roleNameSchema.optional(),
    description: zod_1.z.string().nullable().optional(),
    permissions: permissionListSchema.optional(),
})
    .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide a role field to update',
    path: ['name'],
});
function isDuplicate(error) {
    return error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
function serializeRole(role) {
    return {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: role.permissions.map(({ permission }) => ({
            id: permission.id,
            key: permission.key,
            description: permission.description,
            isSystem: permission.isSystem,
        })),
    };
}
async function findPermissionIds(keys) {
    const permissions = await prisma_1.prisma.permission.findMany({
        where: { key: { in: keys } },
        select: { id: true, key: true },
    });
    if (permissions.length !== keys.length)
        return null;
    return permissions.map(({ id }) => id);
}
/**
 * @openapi
 * /admin/roles:
 *   get:
 *     tags: [Admin - Roles]
 *     summary: List roles with their permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Role records and their assigned permission list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RoleRecord'
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role or read:role permission required
 */
router.get('/roles', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('read:role'), (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const roles = await prisma_1.prisma.role.findMany({ orderBy: { name: 'asc' }, include: roleInclude });
    res.json(roles.map(serializeRole));
}));
/**
 * @openapi
 * /admin/roles/{id}:
 *   get:
 *     tags: [Admin - Roles]
 *     summary: Get a role with its permissions
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
 *         description: Role and assigned permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleRecord'
 *       400:
 *         description: Invalid role id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role or read:role permission required
 *       404:
 *         description: Role not found
 */
router.get('/roles/:id', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('read:role'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = (0, permissions_1.parseId)(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid role id' });
    const role = await prisma_1.prisma.role.findUnique({ where: { id }, include: roleInclude });
    if (!role)
        return res.status(404).json({ message: 'Role not found' });
    res.json(serializeRole(role));
}));
/**
 * @openapi
 * /admin/roles:
 *   post:
 *     tags: [Admin - Roles]
 *     summary: Create a role and assign permissions
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
 *               name: { type: string, example: CONTENT_EDITOR }
 *               description: { type: string, nullable: true }
 *               permissions:
 *                 type: array
 *                 items: { type: string, example: update:course }
 *     responses:
 *       201:
 *         description: Role created with its permission list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleMutationResponse'
 *       400:
 *         description: Validation failed or permission key not found
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role or create:role permission required
 *       409:
 *         description: Role name already exists
 */
router.post('/roles', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('create:role'), (0, validate_1.validate)(createRoleSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const permissionIds = await findPermissionIds(req.body.permissions);
    if (!permissionIds)
        return res.status(400).json({ message: 'One or more permission keys were not found' });
    try {
        const role = await prisma_1.prisma.$transaction(async (transaction) => {
            const created = await transaction.role.create({
                data: { name: req.body.name, description: req.body.description ?? null },
            });
            if (permissionIds.length) {
                await transaction.rolePermission.createMany({
                    data: permissionIds.map((permissionId) => ({ roleId: created.id, permissionId })),
                });
            }
            return transaction.role.findUniqueOrThrow({ where: { id: created.id }, include: roleInclude });
        });
        res.status(201).json({ message: 'Role created successfully', role: serializeRole(role) });
    }
    catch (error) {
        if (isDuplicate(error))
            return res.status(409).json({ message: 'Role name already exists' });
        throw error;
    }
}));
/**
 * @openapi
 * /admin/roles/{id}:
 *   put:
 *     tags: [Admin - Roles]
 *     summary: Update a role and optionally replace its permission list
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
 *               name: { type: string }
 *               description: { type: string, nullable: true }
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Role updated with its current permission list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleMutationResponse'
 *       400:
 *         description: Invalid role id, body, or permission key
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role or update:role permission required
 *       404:
 *         description: Role not found
 *       409:
 *         description: Role name already exists or a system role cannot be renamed
 */
router.put('/roles/:id', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('update:role'), (0, validate_1.validate)(updateRoleSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = (0, permissions_1.parseId)(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid role id' });
    const existing = await prisma_1.prisma.role.findUnique({ where: { id } });
    if (!existing)
        return res.status(404).json({ message: 'Role not found' });
    if (existing.isSystem && req.body.name && req.body.name !== existing.name) {
        return res.status(409).json({ message: 'System role names cannot be changed' });
    }
    if (existing.name === 'ADMIN' && req.body.permissions !== undefined) {
        return res.status(409).json({ message: 'The ADMIN permission set cannot be changed' });
    }
    const permissionIds = req.body.permissions === undefined ? undefined : await findPermissionIds(req.body.permissions);
    if (permissionIds === null) {
        return res.status(400).json({ message: 'One or more permission keys were not found' });
    }
    const data = {};
    if (req.body.name !== undefined)
        data.name = req.body.name;
    if (req.body.description !== undefined)
        data.description = req.body.description;
    try {
        const role = await prisma_1.prisma.$transaction(async (transaction) => {
            if (Object.keys(data).length)
                await transaction.role.update({ where: { id }, data });
            if (permissionIds !== undefined) {
                await transaction.rolePermission.deleteMany({ where: { roleId: id } });
                if (permissionIds.length) {
                    await transaction.rolePermission.createMany({
                        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
                    });
                }
            }
            return transaction.role.findUniqueOrThrow({ where: { id }, include: roleInclude });
        });
        res.json({ message: 'Role updated successfully', role: serializeRole(role) });
    }
    catch (error) {
        if (isDuplicate(error))
            return res.status(409).json({ message: 'Role name already exists' });
        throw error;
    }
}));
/**
 * @openapi
 * /admin/roles/{id}:
 *   delete:
 *     tags: [Admin - Roles]
 *     summary: Delete a role
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
 *         description: Role deleted
 *       400:
 *         description: Invalid role id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Admin role or delete:role permission required
 *       404:
 *         description: Role not found
 *       409:
 *         description: System roles or roles assigned to users cannot be deleted
 */
router.delete('/roles/:id', (0, auth_1.requireRole)('ADMIN'), (0, auth_1.requirePermission)('delete:role'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = (0, permissions_1.parseId)(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid role id' });
    const role = await prisma_1.prisma.role.findUnique({ where: { id }, select: { id: true, isSystem: true } });
    if (!role)
        return res.status(404).json({ message: 'Role not found' });
    if (role.isSystem)
        return res.status(409).json({ message: 'System roles cannot be deleted' });
    const users = await prisma_1.prisma.user.count({ where: { roleId: id } });
    if (users)
        return res.status(409).json({ message: 'Role is assigned to users and cannot be deleted' });
    await prisma_1.prisma.role.delete({ where: { id } });
    res.json({ message: 'Role deleted successfully' });
}));
exports.default = router;
