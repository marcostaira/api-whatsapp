import { Request, Response, NextFunction } from "express";
import { Tenant } from "../entities/Tenant";
declare global {
    namespace Express {
        interface Request {
            tenant?: Tenant;
        }
    }
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
