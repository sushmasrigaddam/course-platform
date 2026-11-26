"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.requireRole = void 0;
exports.authenticate = authenticate;
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../lib/jwt");
function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing token' });
    }
    let tokenPayload;
    try {
        tokenPayload = (0, jwt_1.verifyToken)(header.split(' ')[1]);
    }
    catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
    if (!Number.isSafeInteger(tokenPayload.id) || tokenPayload.id < 1) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
    prisma_1.prisma.user
        .findUnique({
        where: { id: tokenPayload.id },
        select: { id: true, role: { select: { name: true } } },
    })
        .then((user) => {
        if (!user)
            return res.status(401).json({ message: 'Invalid or expired token' });
        req.user = { id: user.id, role: user.role.name };
        next();
    })
        .catch(next);
}
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'You do not have permission' });
    }
    next();
};
exports.requireRole = requireRole;
const requirePermission = (permissionKey) => (req, res, next) => {
    if (!req.user)
        return res.status(401).json({ message: 'Missing or invalid token' });
    prisma_1.prisma.rolePermission
        .findFirst({
        where: {
            role: { name: req.user.role },
            permission: { key: permissionKey },
        },
        select: { roleId: true },
    })
        .then((grant) => {
        if (!grant) {
            return res.status(403).json({ message: `Missing permission: ${permissionKey}` });
        }
        next();
    })
        .catch(next);
};
exports.requirePermission = requirePermission;
