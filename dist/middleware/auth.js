"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authMiddleware = void 0;
const ConfigService_1 = require("../services/ConfigService");
const configService = new ConfigService_1.ConfigService();
const authMiddleware = async (req, res, next) => {
    try {
        const apiKey = req.headers["x-api-key"] ||
            req.headers.authorization?.replace("Bearer ", "");
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: "API key is required. Provide it in X-API-Key header or Authorization header.",
            });
        }
        const tenant = await configService.validateApiKey(apiKey);
        if (!tenant) {
            return res.status(401).json({
                success: false,
                error: "Invalid API key",
            });
        }
        req.tenant = tenant;
        next();
    }
    catch (error) {
        console.error("Auth middleware error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error during authentication",
        });
    }
};
exports.authMiddleware = authMiddleware;
const optionalAuth = async (req, res, next) => {
    try {
        const apiKey = req.headers["x-api-key"] ||
            req.headers.authorization?.replace("Bearer ", "");
        if (apiKey) {
            const tenant = await configService.validateApiKey(apiKey);
            if (tenant) {
                req.tenant = tenant;
            }
        }
        next();
    }
    catch (error) {
        console.error("Optional auth middleware error:", error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map