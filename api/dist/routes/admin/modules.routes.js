"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const asyncHandler_1 = require("../../utils/asyncHandler");
const permissions_1 = require("./permissions");
const router = (0, express_1.Router)();
const moduleSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    position: zod_1.z.number().int().positive(),
});
/**
 * @openapi
 * /admin/courses/{courseId}/modules:
 *   get:
 *     tags: [Admin - Modules]
 *     summary: List modules in a manageable course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Modules and lesson previews ordered by position
 *       400:
 *         description: Invalid course id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Course belongs to another instructor
 *       404:
 *         description: Course not found
 */
router.get('/courses/:courseId/modules', (0, auth_1.requirePermission)('read:module'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const courseId = (0, permissions_1.parseId)(req.params.courseId);
    if (!courseId)
        return res.status(400).json({ message: 'Invalid course id' });
    if (!(await (0, permissions_1.assertCourseAccess)(courseId, req.user.id, req.user.role, res)))
        return;
    const modules = await prisma_1.prisma.module.findMany({
        where: { courseId },
        orderBy: { position: 'asc' },
        include: {
            lessons: {
                orderBy: { position: 'asc' },
                select: { id: true, title: true, position: true, durationMin: true },
            },
        },
    });
    res.json(modules);
}));
/**
 * @openapi
 * /admin/courses/{courseId}/modules:
 *   post:
 *     tags: [Admin - Modules]
 *     summary: Add a module to a manageable course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModuleInput'
 *     responses:
 *       201:
 *         description: Module created
 *       400:
 *         description: Invalid course id or module data
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Course belongs to another instructor
 *       404:
 *         description: Course not found
 */
router.post('/courses/:courseId/modules', (0, auth_1.requirePermission)('create:module'), (0, validate_1.validate)(moduleSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const courseId = (0, permissions_1.parseId)(req.params.courseId);
    if (!courseId)
        return res.status(400).json({ message: 'Invalid course id' });
    if (!(await (0, permissions_1.assertCourseAccess)(courseId, req.user.id, req.user.role, res)))
        return;
    const module = await prisma_1.prisma.module.create({ data: { ...req.body, courseId } });
    res.status(201).json({ message: 'Module created successfully', module });
}));
/**
 * @openapi
 * /admin/modules/{id}:
 *   put:
 *     tags: [Admin - Modules]
 *     summary: Update a module
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
 *             $ref: '#/components/schemas/ModuleInput'
 *     responses:
 *       200:
 *         description: Module updated
 *       400:
 *         description: Invalid module id or data
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Course belongs to another instructor
 *       404:
 *         description: Module not found
 */
router.put('/modules/:id', (0, auth_1.requirePermission)('update:module'), (0, validate_1.validate)(moduleSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const moduleId = (0, permissions_1.parseId)(req.params.id);
    if (!moduleId)
        return res.status(400).json({ message: 'Invalid module id' });
    const module = await (0, permissions_1.findEditableModule)(moduleId, req.user.id, req.user.role, res);
    if (!module)
        return;
    const updated = await prisma_1.prisma.module.update({ where: { id: moduleId }, data: req.body });
    res.json({ message: 'Module updated successfully', module: updated });
}));
/**
 * @openapi
 * /admin/modules/{id}:
 *   delete:
 *     tags: [Admin - Modules]
 *     summary: Delete a module and its lessons
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
 *         description: Module deleted
 *       400:
 *         description: Invalid module id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Course belongs to another instructor
 *       404:
 *         description: Module not found
 */
router.delete('/modules/:id', (0, auth_1.requirePermission)('delete:module'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const moduleId = (0, permissions_1.parseId)(req.params.id);
    if (!moduleId)
        return res.status(400).json({ message: 'Invalid module id' });
    const module = await (0, permissions_1.findEditableModule)(moduleId, req.user.id, req.user.role, res);
    if (!module)
        return;
    await prisma_1.prisma.module.delete({ where: { id: moduleId } });
    res.json({ message: 'Module deleted successfully' });
}));
exports.default = router;
