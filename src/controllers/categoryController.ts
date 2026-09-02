import type { Request, Response } from "express";
import * as categoryService from "../services/categoryService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/errors";

// ---- Admin ----

export const listAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const data = await categoryService.listAdmin();
  res.status(200).json({ data });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const created = await categoryService.create(req.body, { id: req.user.id, role: req.user.role });
  res.status(201).json(created);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const updated = await categoryService.update(req.params.id as string, req.body, { id: req.user.id, role: req.user.role });
  res.status(200).json(updated);
});

export const toggleActive = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const updated = await categoryService.toggleActive(req.params.id as string, { id: req.user.id, role: req.user.role });
  res.status(200).json(updated);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  await categoryService.remove(req.params.id as string, { id: req.user.id, role: req.user.role });
  res.status(204).end();
});

// ---- Public ----

export const listPublic = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.query.locale as "en" | "fr") || "en";
  const data = await categoryService.listPublic(locale);
  res.status(200).json({ data });
});

export const getPublic = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.query.locale as "en" | "fr") || "en";
  const data = await categoryService.getPublic(req.params.slug as string, locale);
  res.status(200).json(data);
});
