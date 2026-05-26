import cors from "cors";
import { RequestHandler, Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

// Warn at startup if FRONTEND_URL is missing in production
if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
  logger.warn(
    "CORS misconfiguration: FRONTEND_URL is not set in production. Requests from the frontend will be blocked.",
  );
}

// Authenticated routes require credentials; wildcard origin is incompatible with credentials.
function isAuthRoute(path: string): boolean {
  return path.startsWith("/api") && path !== "/api/health";
}

export const corsMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const isProduction = process.env.NODE_ENV === "production";
  const frontendUrl = process.env.FRONTEND_URL;
  const authRoute = isAuthRoute(req.path);

  const origin: cors.CorsOptions["origin"] = isProduction
    ? frontendUrl || false
    : frontendUrl || (authRoute ? true : "*");

  cors({
    origin,
    credentials: authRoute,
    maxAge: 86400,
  })(req, res, next);
};
