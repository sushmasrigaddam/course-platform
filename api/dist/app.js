"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./docs/swagger");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const admin_1 = __importDefault(require("./routes/admin"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: (process.env.CLIENT_ORIGINS || '').split(',') }));
app.use(express_1.default.json());
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, {
    swaggerOptions: { docExpansion: 'none', persistAuthorization: true },
}));
app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1', student_routes_1.default);
app.use('/api/v1', public_routes_1.default);
app.use('/api/v1/admin', admin_1.default);
app.use(errorHandler_1.errorHandler);
exports.default = app;
