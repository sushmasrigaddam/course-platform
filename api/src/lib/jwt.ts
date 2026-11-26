import jwt from 'jsonwebtoken';

export type Role = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
export type TokenPayload = { id: number; role: Role };

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is missing in .env');
  return s;
}

// The token carries the user id and role, and expires in one day
export const signToken = (payload: TokenPayload) =>
  jwt.sign(payload, secret(), { expiresIn: '1d' });

// Throws an error if the token is fake or expired
export const verifyToken = (token: string) =>
  jwt.verify(token, secret()) as unknown as TokenPayload;