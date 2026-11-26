"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseId = parseId;
exports.assertCourseAccess = assertCourseAccess;
exports.findEditableModule = findEditableModule;
exports.findEditableLesson = findEditableLesson;
const prisma_1 = require("../../lib/prisma");
function parseId(value) {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function canManage(instructorId, userId, role) {
    return role === 'ADMIN' || instructorId === userId;
}
async function assertCourseAccess(courseId, userId, role, res) {
    const course = await prisma_1.prisma.course.findUnique({
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
async function findEditableModule(moduleId, userId, role, res) {
    const module = await prisma_1.prisma.module.findUnique({
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
async function findEditableLesson(lessonId, userId, role, res) {
    const lesson = await prisma_1.prisma.lesson.findUnique({
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
