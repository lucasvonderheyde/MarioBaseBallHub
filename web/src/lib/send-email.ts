import "server-only";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function emailDeliveryEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[email:dev] To: ${input.to}\nSubject: ${input.subject}\n${input.text}`,
      );
      return { ok: true };
    }
    return { ok: false, error: "Email delivery is not configured." };
  }

  if (!from) {
    return { ok: false, error: "EMAIL_FROM is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    return { ok: false, error: "Failed to send email." };
  }

  return { ok: true };
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const subject = "Reset your Mario Baseball Hub password";
  const text = [
    "You requested a password reset for Mario Baseball Hub.",
    "",
    `Reset your password: ${input.resetUrl}`,
    "",
    "This link expires in one hour. If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>You requested a password reset for <strong>Mario Baseball Hub</strong>.</p>
    <p><a href="${input.resetUrl}">Reset your password</a></p>
    <p>This link expires in one hour. If you did not request this, you can ignore this email.</p>
  `;

  return sendEmail({ to: input.to, subject, html, text });
}
