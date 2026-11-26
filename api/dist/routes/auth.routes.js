"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../lib/jwt");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['STUDENT', 'INSTRUCTOR']).optional().default('STUDENT'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(6),
});
function isDuplicateEmail(error) {
    return error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
// Never send passwordHash back to the client
const publicUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role.name,
});
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and get a token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@example.com }
 *               password: { type: string, example: Password@123 }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Wrong email or password
 */
router.post('/login', (0, validate_1.validate)(loginSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma_1.prisma.user.findUnique({ where: { email }, include: { role: true } });
    const passwordOk = user && (await bcryptjs_1.default.compare(password, user.passwordHash));
    // Same message for both cases, so attackers cannot learn which emails exist
    if (!user || !passwordOk)
        return res.status(401).json({ message: 'Wrong email or password' });
    res.json({
        message: 'Login successful',
        token: (0, jwt_1.signToken)({ id: user.id, role: user.role.name }),
        user: publicUser(user),
    });
}));
/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Missing or invalid token
 *       404:
 *         description: User not found
 */
router.get('/me', auth_1.authenticate, (0, auth_1.requirePermission)('read:profile'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, include: { role: true } });
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User information retrieved successfully', user: publicUser(user) });
}));
/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a student or instructor account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Email is already registered
 */
router.post('/register', (0, validate_1.validate)(registerSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, email, password, role } = req.body;
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing)
        return res.status(409).json({ message: 'Email is already registered' });
    const registrationRole = await prisma_1.prisma.role.findUnique({ where: { name: role } });
    if (!registrationRole)
        return res.status(500).json({ message: 'Registration roles are not configured' });
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    try {
        const user = await prisma_1.prisma.user.create({
            data: { name, email, passwordHash, roleId: registrationRole.id },
            include: { role: true },
        });
        res.status(201).json({
            message: 'Registration successful',
            token: (0, jwt_1.signToken)({ id: user.id, role: user.role.name }),
            user: publicUser(user),
        });
    }
    catch (error) {
        if (isDuplicateEmail(error))
            return res.status(409).json({ message: 'Email is already registered' });
        throw error;
    }
}));
/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change the authenticated user's password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Invalid input or current password
 *       401:
 *         description: Missing or invalid token
 *       404:
 *         description: User not found
 */
router.post('/change-password', auth_1.authenticate, (0, auth_1.requirePermission)('change:password'), (0, validate_1.validate)(changePasswordSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, passwordHash: true },
    });
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    const passwordMatches = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!passwordMatches)
        return res.status(400).json({ message: 'Current password is incorrect' });
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
    await prisma_1.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ message: 'Password changed successfully' });
}));
exports.default = router;
