import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from './prisma-adapter';

export const prisma = new PrismaClient({ adapter: createPrismaAdapter() });