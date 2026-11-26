"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function secret() {
    const s = process.env.JWT_SECRET;
    if (!s)
        throw new Error('JWT_SECRET is missing in .env');
    return s;
}
// The token carries the user id and role, and expires in one day
const signToken = (payload) => jsonwebtoken_1.default.sign(payload, secret(), { expiresIn: '1d' });
exports.signToken = signToken;
// Throws an error if the token is fake or expired
const verifyToken = (token) => jsonwebtoken_1.default.verify(token, secret());
exports.verifyToken = verifyToken;
