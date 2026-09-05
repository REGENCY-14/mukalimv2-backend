import type { Request, Response } from "express";
import sharp from "sharp";
import * as mediaService from "../services/mediaService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/errors";
import { uploadFile } from "../utils/storage";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await mediaService.list(req.query as Record<string, unknown>);
  res.status(200).json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) throw AppError.badRequest("No files were uploaded — send them under the 'files' field.");

  const uploaded = await Promise.all(
    files.map(async (file) => {
      // width/height are read server-side from the file, not trusted from
      // the client (see MediaUploadZone.tsx's client-only readImageDimensions).
      let width = 0;
      let height = 0;
      try {
        const meta = await sharp(file.buffer).metadata();
        width = meta.width ?? 0;
        height = meta.height ?? 0;
      } catch {
        // SVGs and a few odd formats may not report dimensions — non-fatal.
      }
      const url = await uploadFile(file.originalname, file.buffer, file.mimetype);
      return {
        filename: file.originalname,
        url,
        sizeKb: Math.round(file.size / 1024),
        width,
        height,
      };
    }),
  );

  const created = await mediaService.create(uploaded, { id: req.user.id, role: req.user.role });
  res.status(201).json({ data: created });
});

export const updateAltText = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const updated = await mediaService.updateAltText(req.params.id as string, req.body, { id: req.user.id, role: req.user.role });
  res.status(200).json(updated);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  await mediaService.remove(req.params.id as string, { id: req.user.id, role: req.user.role });
  res.status(204).end();
});
