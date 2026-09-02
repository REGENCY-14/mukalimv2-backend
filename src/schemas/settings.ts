import { z } from "zod";

export const updateSettingsSchema = z.object({
  siteName: z.string().min(1).optional(),
  defaultLanguage: z.enum(["fr", "en", "de", "it"]).optional(),
  contactEmail: z.string().email().optional(),
  socialInstagram: z.string().optional(),
  socialFacebook: z.string().optional(),
  socialLinkedin: z.string().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
