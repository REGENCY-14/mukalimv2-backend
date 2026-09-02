import type { Request, Response } from "express";
import * as dashboardService from "../services/dashboardService";
import * as activityService from "../services/activityService";
import { asyncHandler } from "../utils/asyncHandler";

export const stats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await dashboardService.getStats();
  res.status(200).json(data);
});

export const activity = asyncHandler(async (req: Request, res: Response) => {
  const result = await activityService.listActivity(req.query as Record<string, unknown>);
  res.status(200).json(result);
});
