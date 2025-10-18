"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLog = void 0;
const logger_1 = require("../lib/logger");
const requestLog = (req, _res, next) => {
    const start = Date.now();
    const id = Math.random().toString(36).slice(2);
    req.id = id;
    logger_1.logger.info({ id, method: req.method, path: req.path }, '→ request');
    _res.on('finish', () => logger_1.logger.info({ id, status: _res.statusCode, ms: Date.now() - start }, '← response'));
    next();
};
exports.requestLog = requestLog;
