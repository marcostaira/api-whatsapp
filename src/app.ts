import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { initializeDatabase } from "./config/database";
import apiRoutes from "./routes/api";
import { handleUploadError } from "./middleware/upload";
import {
  errorRecoveryMiddleware,
  notFoundHandler,
  healthCheck,
  startPeriodicLogging,
} from "./middleware/errorRecovery";

// Load environment variables FIRST - before any other imports
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Start periodic logging
startPeriodicLogging();

// Debug: Log if .env was loaded
console.log("🔧 Environment loaded:");
console.log("- NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("- PORT:", process.env.PORT || "not set");
console.log("- DB_HOST:", process.env.DB_HOST || "not set");
console.log("- DB_DATABASE:", process.env.DB_DATABASE || "not set");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging in development
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint (melhorado)
app.get("/health", healthCheck);

// API routes
app.use("/api", apiRoutes);

// Upload error handler
app.use(handleUploadError);

// Error recovery middleware (IMPORTANTE: antes do error handler)
app.use(errorRecoveryMiddleware);

// 404 handler
app.use("*", notFoundHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    console.log("🔌 Initializing database connection...");
    await initializeDatabase();

    const server = app.listen(PORT, () => {
      console.log(`🚀 WhatsApp API Server running on port ${PORT}`);
      console.log(`📚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `💾 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`
      );
      console.log(`🛡️ Error Recovery: ENABLED`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = (signal: string) => {
      console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);

      server.close(() => {
        console.log("✅ HTTP server closed");
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.log("⏰ Forcing shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error: any) {
    console.error("❌ Failed to start server:", error.message);
    console.error("💡 Check your .env file and database configuration");

    // Não sair imediatamente, tentar novamente em 5 segundos
    console.log("🔄 Retrying in 5 seconds...");
    setTimeout(() => {
      startServer();
    }, 5000);
  }
};

startServer();

export default app;
