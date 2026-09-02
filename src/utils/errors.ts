export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Invalid request", details?: unknown) {
    return new AppError(400, "VALIDATION_ERROR", message, details);
  }

  static unauthenticated(message = "Authentication required") {
    return new AppError(401, "UNAUTHENTICATED", message);
  }

  static forbidden(message = "You do not have permission to do this") {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Not found") {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message = "Conflict") {
    return new AppError(409, "CONFLICT", message);
  }
}
