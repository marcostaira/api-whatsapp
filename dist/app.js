"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
const api_1 = __importDefault(require("./routes/api"));
const upload_1 = require("./middleware/upload");
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env") });
console.log("🔧 Environment loaded:");
console.log("- NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("- PORT:", process.env.PORT || "not set");
console.log("- DB_HOST:", process.env.DB_HOST || "not set");
console.log("- DB_DATABASE:", process.env.DB_DATABASE || "not set");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "WhatsApp API is running",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        database: {
            host: process.env.DB_HOST || "not configured",
            database: process.env.DB_DATABASE || "not configured",
        },
    });
});
app.use("/api", api_1.default);
app.use(upload_1.handleUploadError);
app.use((err, req, res, next) => {
    console.error("Global error handler:", err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || "Internal server error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found",
    });
});
const startServer = async () => {
    try {
        console.log("🔌 Initializing database connection...");
        await (0, database_1.initializeDatabase)();
        app.listen(PORT, () => {
            console.log(`🚀 WhatsApp API Server running on port ${PORT}`);
            console.log(`📚 Health Check: http://localhost:${PORT}/health`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
            console.log(`💾 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);
        });
    }
    catch (error) {
        console.error("❌ Failed to start server:", error);
        console.error("💡 Check your .env file and database configuration");
        process.exit(1);
    }
};
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    process.exit(0);
});
process.on("SIGINT", () => {
    console.log("SIGINT received. Shutting down gracefully...");
    process.exit(0);
});
startServer();
exports.default = app;
//# sourceMappingURL=app.js.map