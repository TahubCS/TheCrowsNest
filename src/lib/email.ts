/**
 * Email utility powered by Nodemailer + Gmail SMTP.
 * 
 * Requires two env vars in .env.local:
 *   SMTP_EMAIL=your-gmail@gmail.com
 *   SMTP_PASSWORD=your-16-char-app-password
 * 
 * If SMTP vars are missing, the code will be logged to console instead.
 */

import nodemailer from "nodemailer";

const smtpEmail = process.env.SMTP_EMAIL;
const smtpPassword = process.env.SMTP_PASSWORD;

// Create reusable transporter
const transporter = smtpEmail && smtpPassword
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    })
  : null;

/**
 * Send a 6-digit verification code to the given email.
 * Falls back to console.log if SMTP is not configured.
 */
export async function sendVerificationEmail(
  toEmail: string,
  code: string,
  userName: string
): Promise<void> {
  const subject = "🏴‍☠️ The Crow's Nest — Verify Your Email";

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #592d8c, #4b2d73); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">
          <span style="color: #592d8c; background: #FFC72C; padding: 2px 8px; border-radius: 6px;">The Crow's</span>
          <span style="color: #FFC72C;"> Nest</span>
        </h1>
      </div>
      <div style="padding: 32px 24px; color: #e0e0e0;">
        <p style="font-size: 16px; margin: 0 0 8px;">Hey ${userName}! 👋</p>
        <p style="font-size: 14px; color: #a0a0b0; margin: 0 0 24px;">
          Use the code below to verify your ECU student email and complete your registration.
        </p>
        <div style="background: #2a2a40; border: 2px solid #592d8c; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
          <p style="font-size: 12px; color: #a0a0b0; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
          <p style="font-size: 36px; font-weight: 800; color: #FFC72C; margin: 0; letter-spacing: 8px; font-family: monospace;">${code}</p>
        </div>
        <p style="font-size: 12px; color: #707080; margin: 0; text-align: center;">
          This code expires in <strong style="color: #e0e0e0;">15 minutes</strong>. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      <div style="background: #12121e; padding: 16px 24px; text-align: center;">
        <p style="font-size: 11px; color: #505060; margin: 0;">
          © ${new Date().getFullYear()} The Crow's Nest — East Carolina University
        </p>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"The Crow's Nest" <${smtpEmail}>`,
        to: toEmail,
        subject,
        html,
      });
      console.log(`[Email] ✅ Verification code sent to ${toEmail}`);
    } catch (error) {
      console.error(`[Email] ❌ Failed to send email to ${toEmail}:`, error);
      // Fall back to console
      console.log(`[Email] 📋 FALLBACK — Verification code for ${toEmail}: ${code}`);
    }
  } else {
    // No SMTP configured — log the code to console for dev testing
    console.log(`\n========================================`);
    console.log(`📧 VERIFICATION CODE for ${toEmail}`);
    console.log(`   Code: ${code}`);
    console.log(`========================================\n`);
  }
}
