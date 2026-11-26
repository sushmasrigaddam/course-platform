"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrismaAdapter = createPrismaAdapter;
const adapter_mariadb_1 = require("@prisma/adapter-mariadb");
function createPrismaAdapter() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL must be set before connecting to MySQL.');
    }
    const connection = new URL(databaseUrl);
    if (connection.protocol !== 'mysql:') {
        throw new Error('DATABASE_URL must use the mysql:// protocol.');
    }
    return new adapter_mariadb_1.PrismaMariaDb({
        host: connection.hostname,
        port: Number(connection.port || 3306),
        user: decodeURIComponent(connection.username),
        password: decodeURIComponent(connection.password),
        database: decodeURIComponent(connection.pathname.slice(1)),
    });
}
