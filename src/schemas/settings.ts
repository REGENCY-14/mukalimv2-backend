import { z } from "zod";
import { sanitizePlainText } from "../utils/sanitize";

export const updateSettingsSchema = z.object({
  siteName: z.string().min(1).transform(sanitizePlainText).optional(),
  defaultLanguage: z.enum(["fr", "en", "de", "it"]).optional(),
  contactEmail: z.string().email().optional(),
  socialInstagram: z.string().transform(sanitizePlainText).optional(),
  socialFacebook: z.string().transform(sanitizePlainText).optional(),
  socialLinkedin: z.string().transform(sanitizePlainText).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
