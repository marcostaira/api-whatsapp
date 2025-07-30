import { Request, Response, NextFunction } from "express";
import { ConfigService } from "../services/ConfigService";
import { Tenant } from "../entities/Tenant";

declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
    }
  }
}

const configService = new ConfigService();

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey =
      (req.headers["x-api-key"] as string) ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error:
          "API key is required. Provide it in X-API-Key header or Authorization header.",
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
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during authentication",
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey =
      (req.headers["x-api-key"] as string) ||
      req.headers.authorization?.replace("Bearer ", "");

    if (apiKey) {
      const tenant = await configService.validateApiKey(apiKey);
      if (tenant) {
        req.tenant = tenant;
      }
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next(); // Continue without authentication
  }
};
