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

const ROLE_LABELS: Record<string, string> = {
  admin: "an Admin",
  editor: "an Editor",
  viewer: "a Viewer",
};

/** Mirrors the frontend's brand tokens (src/app/globals.css) — email
 * clients strip <style> blocks from most contexts, so everything here is
 * inlined rather than shared with the frontend's Tailwind theme. */
const BRAND = {
  cream: "#fef9f1",
  brown: "#6b3a1f",
  brownDeep: "#4f4536",
  ink: "#1d1c17",
  gold: "#e1a93c",
  goldDeep: "#7d5800",
  line: "#e7ddcd",
};

function inviteEmailHtml(opts: { name: string; role: string; acceptUrl: string; frontendUrl: string }): string {
  const safeName = escapeHtml(opts.name);
  const roleLabel = ROLE_LABELS[opts.role] ?? "a team member";
  const logoUrl = `${opts.frontendUrl}/mukalim/logo.png`;

  return `
    <div style="background-color:${BRAND.cream};padding:40px 16px;font-family:'Plus Jakarta Sans',Segoe UI,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
        <tr>
          <td style="padding-bottom:28px;text-align:center;">
            <img src="${logoUrl}" alt="Mukalim" height="32" style="height:32px;display:inline-block;" />
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;border:1px solid ${BRAND.line};border-radius:16px;padding:36px 32px;">
            <span style="display:block;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${BRAND.goldDeep};margin-bottom:12px;">
              Account Setup
            </span>
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:${BRAND.ink};">
              You're invited to Mukalim
            </h1>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${BRAND.brownDeep};">
              Hi ${safeName},
            </p>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:${BRAND.brownDeep};">
              You've been invited to join the Mukalim admin dashboard as ${roleLabel}. Set a password below to activate your account.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;background-color:${BRAND.gold};">
                  <a href="${opts.acceptUrl}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#5c4000;text-decoration:none;">
                    Set up your account
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:${BRAND.brown};opacity:0.75;">
              This link expires in 7 days. If you weren't expecting this invite, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:24px;text-align:center;font-size:12px;color:${BRAND.brown};opacity:0.6;">
            MUKALIM &middot; Globally sourced, expertly tested spices
          </td>
        </tr>
      </table>
    </div>
  `;
}

/** Sends the invite email and returns the Resend message id (for delivery
 * status lookups). Throws if RESEND_API_KEY/FRONTEND_URL aren't set, or if
 * Resend itself reports an error — callers decide how to degrade (see
 * userService.invite, which falls back to returning the raw token). */
export async function sendInviteEmail(to: string, name: string, token: string, role: string): Promise<string> {
  const rawFrontendUrl = process.env.FRONTEND_URL;
  if (!rawFrontendUrl) {
    throw new Error("FRONTEND_URL must be set (e.g. https://mukalim-v2.vercel.app) — used to build the invite link.");
  }
  const frontendUrl = rawFrontendUrl.replace(/\/+$/, "");
  const from = process.env.INVITE_EMAIL_FROM || "Mukalim <onboarding@resend.dev>";
  const acceptUrl = `${frontendUrl}/accept-invite?token=${encodeURIComponent(token)}`;

  const { data, error } = await getClient().emails.send({
    from,
    to,
    subject: "You're invited to the Mukalim admin dashboard",
    html: inviteEmailHtml({ name, role, acceptUrl, frontendUrl }),
  });

  if (error) throw new Error(`Resend rejected the invite email: ${error.message}`);
  return data?.id ?? "";
}
