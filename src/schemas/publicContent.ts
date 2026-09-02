import { z } from "zod";

export const listArticlesQuerySchema = z.object({
  locale: z.enum(["en", "fr"]).default("en"),
  tag: z.string().optional(),
  sort: z.enum(["newest", "oldest", "a-z", "z-a"]).default("newest"),
  letter: z
    .string()
    .length(1)
    .regex(/[a-zA-Z]/)
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const localeQuerySchema = z.object({
  locale: z.enum(["en", "fr"]).default("en"),
});
