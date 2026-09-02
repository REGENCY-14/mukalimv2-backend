import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";

// Centralized error handler — every error path (thrown AppError, Zod
// validation, unexpected exceptions) resolves to the same JSON shape:
// { "error": { "code": "...", "message": "...", "details"?: ... } }
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Request failed validation.", details: err.flatten() },
    });
    return;
  }

  // Postgres unique-violation (duplicate slug/email etc.) surfaced without a
  // specific AppError.conflict() at the call site.
  if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23505") {
    res.status(409).json({ error: { code: "CONFLICT", message: "This value already exists." } });
    return;
  }

  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
}
