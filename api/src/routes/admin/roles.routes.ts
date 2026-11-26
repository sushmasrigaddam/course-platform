import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requirePermission, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from './permissions';

const router = Router();
const roleInclude = { permissions: { include: { permission: true } } } as const;
const roleNameSchema = z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/);
const permissionListSchema = z.array(z.string().min(1)).refine((keys) => new Set(keys).size === keys.length, {
  message: 'Permission keys must be unique',
});

const createRoleSchema = z.object({
  name: roleNameSchema,
  description: z.string().nullable().optional(),
  permissions: permissionListSchema.default([]),
});

const updateRoleSchema = z
  .object({
    name: roleNameSchema.optional(),
    description: z.string().nullable().optional(),
    permissions: permissionListSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide a role field to update',
    path: ['name'],
  });

function isDuplicate(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function serializeRole(role: {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Array<{
    permission: { id: number; key: string; description: string | null; isSystem: boolean };
  }>;
}) {
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

async function findPermissionIds(keys: string[]) {
  const permissions = await prisma.permission.findMany({
    where: { key: { in: keys } },
    select: { id: true, key: true },
  });
  if (permissions.length !== keys.length) return null;
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
router.get(
  '/roles',
  requireRole('ADMIN'),
  requirePermission('read:role'),
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' }, include: roleInclude });
    res.json(roles.map(serializeRole));
  })
);

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
router.get(
  '/roles/:id',
  requireRole('ADMIN'),
  requirePermission('read:role'),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid role id' });
    const role = await prisma.role.findUnique({ where: { id }, include: roleInclude });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(serializeRole(role));
  })
);

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
router.post(
  '/roles',
  requireRole('ADMIN'),
  requirePermission('create:role'),
  validate(createRoleSchema),
  asyncHandler(async (req, res) => {
    const permissionIds = await findPermissionIds(req.body.permissions);
    if (!permissionIds) return res.status(400).json({ message: 'One or more permission keys were not found' });

    try {
      const role = await prisma.$transaction(async (transaction) => {
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
    } catch (error) {
      if (isDuplicate(error)) return res.status(409).json({ message: 'Role name already exists' });
      throw error;
    }
  })
);

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
router.put(
  '/roles/:id',
  requireRole('ADMIN'),
  requirePermission('update:role'),
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid role id' });
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Role not found' });
    if (existing.isSystem && req.body.name && req.body.name !== existing.name) {
      return res.status(409).json({ message: 'System role names cannot be changed' });
    }
    if (existing.name === 'ADMIN' && req.body.permissions !== undefined) {
      return res.status(409).json({ message: 'The ADMIN permission set cannot be changed' });
    }

    const permissionIds =
      req.body.permissions === undefined ? undefined : await findPermissionIds(req.body.permissions);
    if (permissionIds === null) {
      return res.status(400).json({ message: 'One or more permission keys were not found' });
    }
    const data: Prisma.RoleUpdateInput = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.description !== undefined) data.description = req.body.description;

    try {
      const role = await prisma.$transaction(async (transaction) => {
        if (Object.keys(data).length) await transaction.role.update({ where: { id }, data });
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
    } catch (error) {
      if (isDuplicate(error)) return res.status(409).json({ message: 'Role name already exists' });
      throw error;
    }
  })
);

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
router.delete(
  '/roles/:id',
  requireRole('ADMIN'),
  requirePermission('delete:role'),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid role id' });
    const role = await prisma.role.findUnique({ where: { id }, select: { id: true, isSystem: true } });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    if (role.isSystem) return res.status(409).json({ message: 'System roles cannot be deleted' });

    const users = await prisma.user.count({ where: { roleId: id } });
    if (users) return res.status(409).json({ message: 'Role is assigned to users and cannot be deleted' });
    await prisma.role.delete({ where: { id } });
    res.json({ message: 'Role deleted successfully' });
  })
);

export default router;
