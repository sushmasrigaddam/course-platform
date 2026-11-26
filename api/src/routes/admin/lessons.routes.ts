import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { findEditableLesson, findEditableModule, parseId } from './permissions';

const router = Router();
const lessonSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  videoUrl: z.string().url().nullable().optional(),
  durationMin: z.number().int().min(0),
  position: z.number().int().positive(),
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
router.post(
  '/modules/:moduleId/lessons',
  requirePermission('create:lesson'),
  validate(lessonSchema),
  asyncHandler(async (req, res) => {
    const moduleId = parseId(req.params.moduleId);
    if (!moduleId) return res.status(400).json({ message: 'Invalid module id' });
    const module = await findEditableModule(moduleId, req.user!.id, req.user!.role, res);
    if (!module) return;

    const lesson = await prisma.lesson.create({ data: { ...req.body, moduleId } });
    res.status(201).json({ message: 'Lesson created successfully', lesson });
  })
);

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
router.put(
  '/lessons/:id',
  requirePermission('update:lesson'),
  validate(lessonSchema),
  asyncHandler(async (req, res) => {
    const lessonId = parseId(req.params.id);
    if (!lessonId) return res.status(400).json({ message: 'Invalid lesson id' });
    const lesson = await findEditableLesson(lessonId, req.user!.id, req.user!.role, res);
    if (!lesson) return;

    const updated = await prisma.lesson.update({ where: { id: lessonId }, data: req.body });
    res.json({ message: 'Lesson updated successfully', lesson: updated });
  })
);

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
router.delete(
  '/lessons/:id',
  requirePermission('delete:lesson'),
  asyncHandler(async (req, res) => {
    const lessonId = parseId(req.params.id);
    if (!lessonId) return res.status(400).json({ message: 'Invalid lesson id' });
    const lesson = await findEditableLesson(lessonId, req.user!.id, req.user!.role, res);
    if (!lesson) return;

    await prisma.lesson.delete({ where: { id: lessonId } });
    res.json({ message: 'Lesson deleted successfully' });
  })
);

export default router;
