import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { assertCourseAccess, findEditableModule, parseId } from './permissions';

const router = Router();
const moduleSchema = z.object({
  title: z.string().min(1),
  position: z.number().int().positive(),
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
router.get(
  '/courses/:courseId/modules',
  requirePermission('read:module'),
  asyncHandler(async (req, res) => {
    const courseId = parseId(req.params.courseId);
    if (!courseId) return res.status(400).json({ message: 'Invalid course id' });
    if (!(await assertCourseAccess(courseId, req.user!.id, req.user!.role, res))) return;

    const modules = await prisma.module.findMany({
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
  })
);

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
router.post(
  '/courses/:courseId/modules',
  requirePermission('create:module'),
  validate(moduleSchema),
  asyncHandler(async (req, res) => {
    const courseId = parseId(req.params.courseId);
    if (!courseId) return res.status(400).json({ message: 'Invalid course id' });
    if (!(await assertCourseAccess(courseId, req.user!.id, req.user!.role, res))) return;

    const module = await prisma.module.create({ data: { ...req.body, courseId } });
    res.status(201).json({ message: 'Module created successfully', module });
  })
);

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
router.put(
  '/modules/:id',
  requirePermission('update:module'),
  validate(moduleSchema),
  asyncHandler(async (req, res) => {
    const moduleId = parseId(req.params.id);
    if (!moduleId) return res.status(400).json({ message: 'Invalid module id' });
    const module = await findEditableModule(moduleId, req.user!.id, req.user!.role, res);
    if (!module) return;

    const updated = await prisma.module.update({ where: { id: moduleId }, data: req.body });
    res.json({ message: 'Module updated successfully', module: updated });
  })
);

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
router.delete(
  '/modules/:id',
  requirePermission('delete:module'),
  asyncHandler(async (req, res) => {
    const moduleId = parseId(req.params.id);
    if (!moduleId) return res.status(400).json({ message: 'Invalid module id' });
    const module = await findEditableModule(moduleId, req.user!.id, req.user!.role, res);
    if (!module) return;

    await prisma.module.delete({ where: { id: moduleId } });
    res.json({ message: 'Module deleted successfully' });
  })
);

export default router;
