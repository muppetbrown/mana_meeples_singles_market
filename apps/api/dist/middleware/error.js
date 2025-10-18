"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../lib/logger");
const errorHandler = (err, req, res, _next) => {
    const status = err.statusCode ?? 500;
    const code = err.code ?? 'INTERNAL';
    logger_1.logger.error({ err, path: req.path, code }, 'request failed');
    if (res.headersSent)
        return;
    res.status(status).json({ error: { code, message: status === 500 ? 'Internal server error' : String(err.message ?? err) } });
};
exports.errorHandler = errorHandler;
