import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

// Create SMTP Transporter (if SMTP configured) or fallback mock sender
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export async function sendOtpEmail(toEmail: string, otpCode: string, actionName: string = 'Đăng nhập'): Promise<boolean> {
  const mailOptions = {
    from: `"APEX KEPLER Security" <${process.env.SMTP_USER || 'no-reply@kepler.exchange'}>`,
    to: toEmail,
    subject: `[APEX KEPLER] Mã xác thực ${actionName}: ${otpCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background-color: #14181d; color: #ffffff; border-radius: 12px; border: 1px solid #2b313a;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #2b313a;">
          <h2 style="color: #f6c000; margin: 0; font-size: 24px; font-weight: bold;">⚡ APEX KEPLER CEX</h2>
          <p style="color: #9da8b6; font-size: 13px; margin-top: 4px;">Hệ Thống Bảo Mật Xác Thực Tài Khoản</p>
        </div>

        <div style="padding: 24px 0; text-align: center;">
          <p style="font-size: 15px; color: #e2e8f0; margin-bottom: 16px;">
            Bạn vừa yêu cầu mã xác thực cho thao tác <strong>${actionName}</strong> trên sàn APEX KEPLER.
          </p>
          
          <div style="background-color: #1e2329; border: 1px border-dashed #f6c000; border-radius: 8px; padding: 16px; display: inline-block; margin: 12px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f6c000; font-family: monospace;">${otpCode}</span>
          </div>

          <p style="font-size: 13px; color: #94a3b8; margin-top: 16px;">
            Mã OTP này có hiệu lực trong vòng <strong>5 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai!
          </p>
        </div>

        <div style="border-top: 1px solid #2b313a; padding-top: 16px; text-align: center; font-size: 12px; color: #64748b;">
          Nếu bạn không thực hiện yêu cầu này, vui lòng đổi mật khẩu ngay lập tức để bảo vệ tài khoản.<br/>
          &copy; 2026 APEX KEPLER Institutional Exchange. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`[MAIL] Sent OTP ${otpCode} to ${toEmail} via SMTP`);
    } else {
      console.log(`[DEMO MAIL LOG] OTP for ${toEmail} (${actionName}): ${otpCode}`);
    }
    return true;
  } catch (err: any) {
    console.error('[MAIL ERROR]', err.message);
    return false;
  }
}
