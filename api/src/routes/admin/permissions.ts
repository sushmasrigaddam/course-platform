import { Response } from 'express';
import { prisma } from '../../lib/prisma';
import { Role } from '../../lib/jwt';

export function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function canManage(instructorId: number, userId: number, role: Role) {
  return role === 'ADMIN' || instructorId === userId;
}

export async function assertCourseAccess(
  courseId: number,
  userId: number,
  role: Role,
  res: Response
) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true },
  });
  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return false;
  }
  if (!canManage(course.instructorId, userId, role)) {
    res.status(403).json({ message: 'This is not your course' });
    return false;
  }
  return true;
}

export async function findEditableModule(
  moduleId: number,
  userId: number,
  role: Role,
  res: Response
) {
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: { select: { id: true, instructorId: true } } },
  });
  if (!module) {
    res.status(404).json({ message: 'Module not found' });
    return null;
  }
  if (!canManage(module.course.instructorId, userId, role)) {
    res.status(403).json({ message: 'This is not your course' });
    return null;
  }
  return module;
}

export async function findEditableLesson(
  lessonId: number,
  userId: number,
  role: Role,
  res: Response
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { select: { instructorId: true } } } } },
  });
  if (!lesson) {
    res.status(404).json({ message: 'Lesson not found' });
    return null;
  }
  if (!canManage(lesson.module.course.instructorId, userId, role)) {
    res.status(403).json({ message: 'This is not your course' });
    return null;
  }
  return lesson;
}
