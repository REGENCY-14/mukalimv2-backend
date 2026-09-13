import { Resend } from "resend";

// Env vars are checked lazily (inside sendInviteEmail), not at module load —
// unlike src/utils/storage.ts, a missing key here should only break the
// invite feature, not crash the whole server on startup.
let client: Resend | null = null;
function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY must be set — copy .env.example and fill it in.");
  if (!client) client = new Resend(apiKey);
  return client;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Sends the invite email and returns the Resend message id (for delivery
 * status lookups). Throws if RESEND_API_KEY/FRONTEND_URL aren't set, or if
 * Resend itself reports an error — callers decide how to degrade (see
 * userService.invite, which falls back to returning the raw token). */
export async function sendInviteEmail(to: string, name: string, token: string): Promise<string> {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error("FRONTEND_URL must be set (e.g. https://mukalim-v2.vercel.app) — used to build the invite link.");
  }
  const from = process.env.INVITE_EMAIL_FROM || "Mukalim <onboarding@resend.dev>";
  const acceptUrl = `${frontendUrl.replace(/\/+$/, "")}/accept-invite?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name);

  const { data, error } = await getClient().emails.send({
    from,
    to,
    subject: "You're invited to the Mukalim admin dashboard",
    html: `
      <p>Hi ${safeName},</p>
      <p>You've been invited to the Mukalim admin dashboard. Click below to set your password and activate your account:</p>
      <p><a href="${acceptUrl}">Set up your account</a></p>
      <p>This link expires in 7 days. If you weren't expecting this invite, you can ignore this email.</p>
    `,
  });

  if (error) throw new Error(`Resend rejected the invite email: ${error.message}`);
  return data?.id ?? "";
}
