import { Request, Response, NextFunction } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wraps an async Express route handler to forward rejected promises to `next()`.
 * Eliminates the need for try/catch in every async route.
 *
 * @param fn - Async Express request handler.
 * @returns A synchronous Express middleware that catches async errors.
 * @example
 * router.get("/loans", asyncHandler(async (req, res) => {
 *   const loans = await listLoans();
 *   res.json(loans);
 * }));
 */
export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
