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
const lessonSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    content: zod_1.z.string().min(1),
    videoUrl: zod_1.z.string().url().nullable().optional(),
    durationMin: zod_1.z.number().int().min(0),
    position: zod_1.z.number().int().positive(),
});
/**
 * @openapi
 * /admin/modules/{moduleId}/lessons:
 *   post:
 *     tags: [Admin - Lessons]
 *     summary: Add a lesson to a manageable module
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LessonInput'
 *     responses:
 *       201:
 *         description: Lesson created
 *       400:
 *         description: Invalid module id or lesson data
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Course belongs to another instructor
 *       404:
 *         description: Module not found
 */
router.post('/modules/:moduleId/lessons', (0, auth_1.requirePermission)('create:lesson'), (0, validate_1.validate)(lessonSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const moduleId = (0, permissions_1.parseId)(req.params.moduleId);
    if (!moduleId)
        return res.status(400).json({ message: 'Invalid module id' });
    const module = await (0, permissions_1.findEditableModule)(moduleId, req.user.id, req.user.role, res);
    if (!module)
        return;
    const lesson = await prisma_1.prisma.lesson.create({ data: { ...req.body, moduleId } });
    res.status(201).json({ message: 'Lesson created successfully', lesson });
}));
/**
 * @openapi
 * /admin/lessons/{id}:
 *   put:
 *     tags: [Admin - Lessons]
 *     summary: Update a lesson
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
 *             $ref: '#/components/schemas/LessonInput'
 *     responses:
 *       200:
 *         description: Lesson updated
 *       400:
 *         description: Invalid lesson id or data
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Course belongs to another instructor
 *       404:
 *         description: Lesson not found
 */
router.put('/lessons/:id', (0, auth_1.requirePermission)('update:lesson'), (0, validate_1.validate)(lessonSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const lessonId = (0, permissions_1.parseId)(req.params.id);
    if (!lessonId)
        return res.status(400).json({ message: 'Invalid lesson id' });
    const lesson = await (0, permissions_1.findEditableLesson)(lessonId, req.user.id, req.user.role, res);
    if (!lesson)
        return;
    const updated = await prisma_1.prisma.lesson.update({ where: { id: lessonId }, data: req.body });
    res.json({ message: 'Lesson updated successfully', lesson: updated });
}));
/**
 * @openapi
 * /admin/lessons/{id}:
 *   delete:
 *     tags: [Admin - Lessons]
 *     summary: Delete a lesson
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
 *         description: Lesson deleted
 *       400:
 *         description: Invalid lesson id
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Course belongs to another instructor
 *       404:
 *         description: Lesson not found
 */
router.delete('/lessons/:id', (0, auth_1.requirePermission)('delete:lesson'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const lessonId = (0, permissions_1.parseId)(req.params.id);
    if (!lessonId)
        return res.status(400).json({ message: 'Invalid lesson id' });
    const lesson = await (0, permissions_1.findEditableLesson)(lessonId, req.user.id, req.user.role, res);
    if (!lesson)
        return;
    await prisma_1.prisma.lesson.delete({ where: { id: lessonId } });
    res.json({ message: 'Lesson deleted successfully' });
}));
exports.default = router;
