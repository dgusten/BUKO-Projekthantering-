import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

// Innan bukosverige.se är verifierad hos Resend (Dashboard -> Domains) måste
// avsändaren vara onboarding@resend.dev - byt RESEND_FROM i .env till en
// riktig @bukosverige.se-adress när domänen är verifierad.
export const MAIL_FROM = process.env.RESEND_FROM || "BUKO Sverige <onboarding@resend.dev>";

export async function sendMail(to: string | string[], subject: string, html: string) {
  const { error } = await resend.emails.send({ from: MAIL_FROM, to, subject, html });
  if (error) throw new Error(`Kunde inte skicka mejl: ${error.message}`);
}

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
