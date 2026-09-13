import { z } from "zod";

export const inviteUserSchema = z.object({
  // Optional — invites can be sent with just an email; a placeholder name is
  // derived from the address (see userService.deriveNameFromEmail) and can
  // be corrected later via PATCH /api/admin/users/:id.
  name: z.string().min(1).optional(),
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "editor", "viewer"]).optional(),
  status: z.enum(["active", "invited", "disabled"]).optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
