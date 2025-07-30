import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { initializeDatabase } from "./config/database";
import apiRoutes from "./routes/api";
import { handleUploadError } from "./middleware/upload";

// Load environment variables FIRST - before any other imports
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Debug: Log if .env was loaded
console.log("🔧 Environment loaded:");
console.log("- NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("- PORT:", process.env.PORT || "not set");
console.log("- DB_HOST:", process.env.DB_HOST || "not set");
console.log("- DB_DATABASE:", process.env.DB_DATABASE || "not set");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint
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

// API routes
app.use("/api", apiRoutes);

// Upload error handler
app.use(handleUploadError);

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Global error handler:", err);

    res.status(err.status || 500).json({
      success: false,
      error: err.message || "Internal server error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    console.log("🔌 Initializing database connection...");
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 WhatsApp API Server running on port ${PORT}`);
      console.log(`📚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `💾 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    console.error("💡 Check your .env file and database configuration");
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

startServer();

export default app;
