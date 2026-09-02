import type { Request, Response } from "express";
import * as contentService from "../services/contentService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/errors";

// ---- Admin ----

export const listAdmin = asyncHandler(async (req: Request, res: Response) => {
  const result = await contentService.listAdmin(req.query as Record<string, unknown>);
  res.status(200).json(result);
});

export const getAdmin = asyncHandler(async (req: Request, res: Response) => {
  const item = await contentService.getAdmin(req.params.id as string);
  res.status(200).json(item);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const created = await contentService.create(req.body, { id: req.user.id, role: req.user.role });
  res.status(201).json(created);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const updated = await contentService.update(req.params.id as string, req.body, { id: req.user.id, role: req.user.role });
  res.status(200).json(updated);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  await contentService.remove(req.params.id as string, { id: req.user.id, role: req.user.role });
  res.status(204).end();
});

// ---- Public ----

export const listPublicArticles = asyncHandler(async (req: Request, res: Response) => {
  const result = await contentService.listPublicArticles(req.params.slug as string, req.query as Record<string, unknown>);
  res.status(200).json(result);
});

export const getPublicArticle = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.query.locale as "en" | "fr") || "en";
  const article = await contentService.getPublicArticle(req.params.slug as string, req.params.articleSlug as string, locale);
  res.status(200).json(article);
});
