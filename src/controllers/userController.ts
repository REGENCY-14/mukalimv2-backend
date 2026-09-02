import type { Request, Response } from "express";
import * as userService from "../services/userService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/errors";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await userService.list();
  res.status(200).json({ data });
});

export const invite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const { user, inviteToken } = await userService.invite(req.body, { id: req.user.id, role: req.user.role });
  res.status(201).json({ user, inviteToken });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const updated = await userService.update(req.params.id as string, req.body, { id: req.user.id, role: req.user.role });
  res.status(200).json(updated);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  await userService.remove(req.params.id as string, { id: req.user.id, role: req.user.role });
  res.status(204).end();
});
