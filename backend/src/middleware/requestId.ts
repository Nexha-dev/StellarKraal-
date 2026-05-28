import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware to attach a unique request ID to each incoming request.
 * The request ID can be provided via X-Request-ID header or will be generated.
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use existing request ID from header or generate a new one
  req.requestId = (req.headers["x-request-id"] as string) || uuidv4();
  
  // Add request ID to response headers for tracing
  res.setHeader("X-Request-ID", req.requestId);
  
  next();
};
