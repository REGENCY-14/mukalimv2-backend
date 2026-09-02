import type { Request, Response } from "express";
import * as settingsService from "../services/settingsService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/errors";

export const get = asyncHandler(async (_req: Request, res: Response) => {
  const data = await settingsService.get();
  res.status(200).json(data);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const updated = await settingsService.update(req.body, { id: req.user.id, role: req.user.role });
  res.status(200).json(updated);
});
