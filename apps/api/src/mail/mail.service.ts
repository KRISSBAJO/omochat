import { Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 11025),
    secure: false
  });

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM ?? "Omochat <no-reply@omochat.local>",
      to,
      subject: "Reset your Omochat password",
      text: `Use this link to reset your Omochat password: ${resetUrl}\n\nThis link expires in 30 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #171613; line-height: 1.6;">
          <h1 style="font-size: 24px;">Reset your Omochat password</h1>
          <p>Use the link below to choose a new password. It expires in 30 minutes.</p>
          <p><a href="${resetUrl}" style="color: #171613; font-weight: 700;">Reset password</a></p>
        </div>
      `
    });
  }
}
