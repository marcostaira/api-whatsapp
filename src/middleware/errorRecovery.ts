import { Request, Response, NextFunction } from "express";

/**
 * Middleware para recuperação de erros e prevenção de crashes da API
 */

// Counter para rastrear erros
let errorCount = 0;
const maxErrors = 10;
const resetInterval = 60000; // 1 minuto

// Reset counter periodically
setInterval(() => {
  errorCount = 0;
}, resetInterval);

// Global error handler para promises não capturadas
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("🔥 Unhandled Rejection at:", promise);
  console.error("📝 Reason:", reason);

  // Se é o erro conhecido do Baileys, não matar o processo
  if (
    reason &&
    reason.message &&
    reason.message.includes("state.get is not a function")
  ) {
    console.error(
      "⚠️ Known Baileys auth error - recovering instead of crashing"
    );

    // Incrementar contador de erros
    errorCount++;

    if (errorCount > maxErrors) {
      console.error("❌ Too many Baileys errors, restarting might be needed");
      // Aqui você pode implementar restart automático se desejar
    }

    return; // Não matar o processo
  }

  // Para outros erros críticos, ainda queremos saber
  console.error("💥 Critical unhandled rejection - this needs attention");
});

// Global error handler para exceções não capturadas
process.on("uncaughtException", (error: Error) => {
  console.error("🔥 Uncaught Exception:", error.message);
  console.error("🔍 Stack:", error.stack);

  // Se é o erro conhecido do Baileys, tentar recuperar
  if (error.message && error.message.includes("state.get is not a function")) {
    console.error(
      "⚠️ Known Baileys auth error in uncaught exception - attempting recovery"
    );

    errorCount++;

    if (errorCount > maxErrors) {
      console.error("❌ Too many critical errors, process may need restart");
      // Graceful exit em vez de crash abrupto
      process.exit(1);
    }

    return; // Tentar continuar
  }

  // Para outros erros críticos, fazer graceful shutdown
  console.error("💥 Critical uncaught exception - shutting down gracefully");
  process.exit(1);
});

// Middleware para capturar erros HTTP
export const errorRecoveryMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("🔥 HTTP Error:", error.message);

  // Log detalhado para debugging
  console.error("📍 URL:", req.method, req.path);
  console.error("📝 Body:", JSON.stringify(req.body, null, 2));
  console.error("🔍 Stack:", error.stack);

  // Se é erro relacionado ao Baileys
  if (error.message && error.message.includes("state.get is not a function")) {
    console.error(
      "⚠️ Baileys auth error in HTTP request - returning error response"
    );

    return res.status(503).json({
      success: false,
      error: "WhatsApp service temporarily unavailable",
      code: "BAILEYS_AUTH_ERROR",
      message: "Authentication state error - please reconnect your WhatsApp",
      timestamp: new Date().toISOString(),
    });
  }

  // Se é erro de conexão com banco
  if (
    error.code === "PROTOCOL_CONNECTION_LOST" ||
    error.code === "ECONNREFUSED"
  ) {
    return res.status(503).json({
      success: false,
      error: "Database connection error",
      code: "DATABASE_ERROR",
      message: "Service temporarily unavailable - please try again later",
      timestamp: new Date().toISOString(),
    });
  }

  // Se é timeout
  if (error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
    return res.status(408).json({
      success: false,
      error: "Request timeout",
      code: "TIMEOUT_ERROR",
      message: "Operation took too long - please try again",
      timestamp: new Date().toISOString(),
    });
  }

  // Erro genérico
  const statusCode = error.status || error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: error.message || "Internal server error",
    code: error.code || "UNKNOWN_ERROR",
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

// Middleware para capturar erros de rota não encontrada
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    code: "NOT_FOUND",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

// Health check melhorado
export const healthCheck = async (req: Request, res: Response) => {
  try {
    // Verificar memória
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    // Verificar uptime
    const uptimeHours = Math.round((process.uptime() / 3600) * 100) / 100;

    // Status baseado no número de erros recentes
    let healthStatus = "healthy";
    if (errorCount > 5) {
      healthStatus = "degraded";
    } else if (errorCount > maxErrors) {
      healthStatus = "unhealthy";
    }

    res.json({
      success: true,
      status: healthStatus,
      timestamp: new Date().toISOString(),
      uptime: `${uptimeHours}h`,
      memory: memUsageMB,
      recentErrors: errorCount,
      maxErrors,
      pid: process.pid,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error: any) {
    console.error("❌ Health check error:", error);
    res.status(503).json({
      success: false,
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Função para logging de estatísticas periódicas
export const startPeriodicLogging = () => {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const uptimeHours = Math.round((process.uptime() / 3600) * 100) / 100;

    console.log(
      `📊 Status: Memory: ${memUsageMB}MB, Uptime: ${uptimeHours}h, Recent errors: ${errorCount}`
    );
  }, 300000); // A cada 5 minutos
};

export default {
  errorRecoveryMiddleware,
  notFoundHandler,
  healthCheck,
  startPeriodicLogging,
};
