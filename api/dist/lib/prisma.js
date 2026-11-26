"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma_adapter_1 = require("./prisma-adapter");
exports.prisma = new client_1.PrismaClient({ adapter: (0, prisma_adapter_1.createPrismaAdapter)() });
